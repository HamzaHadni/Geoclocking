import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN!;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN!;
const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!;
const APP_BASE_URL = process.env.APP_BASE_URL!;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  try {
    const entry = body?.entry?.[0]?.changes?.[0]?.value;
    const msg = entry?.messages?.[0];
    const from = msg?.from; // E.164 without '+' e.g. 2126...
    const textRaw = (msg?.text?.body || '').trim();
    const textLow = textRaw.toLowerCase();

    if (!from) return NextResponse.json({ ok: true });

    const phoneE164 = from.startsWith('+') ? from : `+${from}`;
    const { data: emp } = await supabaseAdmin
      .from('employees')
      .select('id, full_name')
      .eq('phone_e164', phoneE164)
      .maybeSingle();

    if (!emp) {
      await sendWhatsApp(from, `We couldn't find your account. Ask your manager to register your phone.`);
      return NextResponse.json({ ok: true });
    }

    const { data: tok } = await supabaseAdmin
      .from('employee_tokens')
      .select('token')
      .eq('employee_id', emp.id)
      .maybeSingle();

    let token = tok?.token;
    if (!token) {
      token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
      await supabaseAdmin.from('employee_tokens').insert({ employee_id: emp.id, token });
    }

    // Try to extract UUID after LOC:
    let locationId: string | null = null;
    const uuidCandidate = (textLow.match(/[0-9a-f-]{36}/i) || [])[0] || '';
    if (textLow.includes('loc') && uuidCandidate.length === 36) {
      locationId = uuidCandidate;
    }

    if (!locationId) {
      const { data: bind } = await supabaseAdmin
        .from('bindings')
        .select('location_id')
        .eq('employee_id', emp.id)
        .limit(1);
      if (!bind || bind.length === 0) {
        await sendWhatsApp(from, `No location bound to your profile. Ask your manager to assign you.`);
        return NextResponse.json({ ok: true });
      }
      locationId = bind[0].location_id;
    }

    const urlIN = `${APP_BASE_URL}/checkin?token=${token}&location=${locationId}&kind=IN`;
    const urlOUT = `${APP_BASE_URL}/checkin?token=${token}&location=${locationId}&kind=OUT`;

    const reply = `Hi ${emp.full_name.split(' ')[0]}!\nChoose:\n• Arrival: ${urlIN}\n• Departure: ${urlOUT}`;
    await sendWhatsApp(from, reply);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: true });
  }
}

async function sendWhatsApp(to: string, text: string) {
  const res = await fetch(`https://graph.facebook.com/v19.0/${PHONE_ID}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text }
    })
  });
  if (!res.ok) {
    console.error('WhatsApp send failed', await res.text());
  }
}
