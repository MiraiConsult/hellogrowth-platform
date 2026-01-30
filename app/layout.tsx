import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HelloGrowth - CRM e Gestão de Vendas',
  description: 'Plataforma completa de CRM e gestão de vendas com IA integrada',
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
