import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'GEOCLOCKING',
  description: 'Pointage géolocalisé avec photo + QR WhatsApp',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, fontFamily: 'ui-sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
