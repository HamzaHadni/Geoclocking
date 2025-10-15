'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import QRCode from 'qrcode';

export default function PrintQRPage() {
  const params = useParams();
  const id = String(params?.id || '');
  const [qrDataUrl, setQrDataUrl] = useState('');

  const waNumber = process.env.NEXT_PUBLIC_WHATSAPP_BUSINESS_NUMBER; // e.g. 2126XXXXXXX
  const waLink = `https://wa.me/${waNumber}?text=${encodeURIComponent(`START LOC:${id}`)}`;

  useEffect(() => {
    (async () => {
      const url = await QRCode.toDataURL(waLink, { width: 800, margin: 1 });
      setQrDataUrl(url);
    })();
  }, [waLink]);

  return (
    <main style={{ fontFamily: 'ui-sans-serif', padding: 24 }}>
      <style>{`@media print { .noprint { display: none; } .sheet { box-shadow: none; margin: 0; } }`}</style>
      <div className="sheet" style={{ maxWidth: 900, margin: '0 auto', background: 'white', padding: 24, borderRadius: 12 }}>
        <h1 style={{ margin: 0 }}>GEOCLOCKING — Site {id.slice(0,8)}</h1>
        <p style={{ marginTop: 4, color: '#555' }}>Scannez avec votre téléphone pour pointer sur ce site.</p>
        {qrDataUrl && <img src={qrDataUrl} alt="QR" style={{ width: '100%', maxWidth: 480, display: 'block', margin: '24px auto' }} />}
        <div style={{ textAlign: 'center', lineHeight: 1.5 }}>
          <p>1) Scannez le QR</p>
          <p>2) WhatsApp s’ouvre → envoyez le message prérempli</p>
          <p>3) Recevez les liens <b>Arrivée</b> / <b>Départ</b> et suivez-les</p>
        </div>
        <hr style={{ margin: '24px 0' }} />
        <div>
          <b>Admin</b> (aperçu du lien) :<br />
          <code style={{ wordBreak: 'break-all' }}>{waLink}</code>
        </div>
        <div className="noprint" style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          <a href={waLink} target="_blank" rel="noreferrer" style={{ padding: '10px 14px', border: '1px solid #ddd', borderRadius: 8 }}>Tester le lien</a>
          <button onClick={() => window.print()} style={{ padding: '10px 14px', borderRadius: 8 }}>Imprimer</button>
        </div>
      </div>
    </main>
  );
}
