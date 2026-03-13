import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HelloGrowth - CRM e Gestão de Vendas',
  description: 'Plataforma completa de CRM e gestão de vendas com IA integrada',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'HelloGrowth',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
