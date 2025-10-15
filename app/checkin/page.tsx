'use client';
import { useEffect, useRef, useState } from 'react';

function isInApp() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /(FBAN|FBAV|Instagram|Line|Wechat|MicroMessenger|WhatsApp|Messenger|MiuiBrowser|TikTok|Twitter)/i.test(ua);
}

export default function CheckinPage() {
  const [status, setStatus] = useState<string>('');
  const [coords, setCoords] = useState<{lat:number; lng:number} | null>(null);
  const [ready, setReady] = useState(false);
  const [secure, setSecure] = useState(true);
  const [inApp, setInApp] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const token = params.get('token');
  const locationId = params.get('location');
  const kind = (params.get('kind') || 'IN').toUpperCase();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSecure(window.isSecureContext);
      setInApp(isInApp());
    }
  }, []);

  const start = async () => {
    if (!token || !locationId) {
      setStatus('Missing token or location');
      return;
    }
    if (!window.isSecureContext) {
      setStatus('Needs HTTPS (or localhost) to access camera & GPS');
      return;
    }

    // Ask camera with a user gesture
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (e) {
      setStatus('Camera permission denied');
      return;
    }

    // Get precise location
    if (navigator.geolocation) {
      setStatus('Getting GPS…');
      const done = (lat:number, lng:number) => {
        setCoords({ lat, lng });
        setReady(true);
        setStatus('Ready ✔️');
      };

      navigator.geolocation.getCurrentPosition(
        (p1) => {
          const { latitude, longitude } = p1.coords;
          navigator.geolocation.getCurrentPosition(
            (p2) => {
              const a = (p2.coords.latitude + latitude) / 2;
              const b = (p2.coords.longitude + longitude) / 2;
              done(a, b);
            },
            () => done(latitude, longitude),
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
          );
        },
        () => setStatus('Location permission denied'),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    } else {
      setStatus('Geolocation not supported');
    }
  };

  const captureAndSend = async () => {
    if (!coords) { setStatus('Waiting GPS…'); return; }
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current;
    const c = canvasRef.current;
    c.width = v.videoWidth; c.height = v.videoHeight;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, c.width, c.height);
    const b64 = c.toDataURL('image/jpeg', 0.9);

    setStatus('Uploading…');
    const res = await fetch('/api/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, locationId, kind, lat: coords.lat, lng: coords.lng, photoBase64: b64 })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setStatus('Error: ' + (data.error || res.statusText)); return; }
    setStatus('OK ✅ ' + data.message);
  };

  return (
    <main style={{padding: 16, fontFamily: 'ui-sans-serif'}}>
      <h2>Check‑in {kind === 'OUT' ? '(Departure)' : '(Arrival)'}</h2>

      {!secure && (
        <p style={{color: 'crimson'}}>This page must be served over <b>HTTPS</b> (or localhost) for camera/GPS.</p>
      )}

      {inApp && (
        <div style={{background: '#fff7e6', padding: 12, borderRadius: 8, marginBottom: 8}}>
          <b>Heads‑up:</b> You’re using an in‑app browser (WhatsApp/Instagram…). If camera or GPS fail,
          tap ••• and choose <b>Open in Safari/Chrome</b>.
        </div>
      )}

      <video ref={videoRef} playsInline muted style={{ width: '100%', maxWidth: 420, borderRadius: 12 }} />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <div style={{display:'flex', gap: 8, marginTop: 12}}>
        <button onClick={start} style={{padding: '12px 16px', borderRadius: 8}}>Start camera + GPS</button>
        <button onClick={captureAndSend} disabled={!ready} style={{padding: '12px 16px', borderRadius: 8}}>Confirm & Send</button>
      </div>

      <p style={{marginTop: 8}}>{status}</p>
    </main>
  );
}
