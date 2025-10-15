import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, bucket } from '@/lib/supabaseServer';
import { haversineMeters } from '@/lib/geo';

function b64ToBuffer(b64: string) {
  const raw = b64.split(',')[1] || b64; // handle dataURL
  return Buffer.from(raw, 'base64');
}

export async function POST(req: NextRequest) {
  try {
    const { token, locationId, kind, lat, lng, photoBase64 } = await req.json();
    if (!token || !locationId || !lat || !lng || !photoBase64) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const { data: tokenRow, error: tokenErr } = await supabaseAdmin
      .from('employee_tokens')
      .select('employee_id, expires_at')
      .eq('token', token)
      .maybeSingle();
    if (tokenErr || !tokenRow) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    if (tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Token expired' }, { status: 401 });
    }
    const employeeId = tokenRow.employee_id as string;

    const { data: loc, error: locErr } = await supabaseAdmin
      .from('locations')
      .select('id, latitude, longitude, radius_meters')
      .eq('id', locationId)
      .maybeSingle();
    if (locErr || !loc) return NextResponse.json({ error: 'Unknown location' }, { status: 400 });

    const distance = haversineMeters(lat, lng, loc.latitude, loc.longitude);
    const allowed = distance <= (loc.radius_meters || Number(process.env.GEO_DEFAULT_RADIUS_METERS) || 75);
    if (!allowed) {
      return NextResponse.json({ error: `You are too far (${Math.round(distance)}m)` }, { status: 403 });
    }

    const path = `${employeeId}/${new Date().toISOString().replace(/[:.]/g,'-')}.jpg`;
    const fileBuf = b64ToBuffer(photoBase64);
    const upload = await supabaseAdmin.storage.from(bucket).upload(path, fileBuf, {
      contentType: 'image/jpeg', upsert: false
    });
    if (upload.error) return NextResponse.json({ error: upload.error.message }, { status: 500 });

    const { error: insErr } = await supabaseAdmin.from('checkins').insert({
      employee_id: employeeId,
      location_id: loc.id,
      kind: (kind === 'OUT' ? 'OUT' : 'IN'),
      lat, lng,
      distance_m: distance,
      photo_path: path,
      meta: { ua: req.headers.get('user-agent') }
    });
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

    return NextResponse.json({ ok: true, message: `Checked at ${Math.round(distance)}m` });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
