import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
// CORREÇÃO (Item 3 do Plano): Ajustado caminho de importação.
// O arquivo está em src/lib, não em src/app.
import { Providers } from '@/lib/providers'; 

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SalonFlow - Gestão de Salão',
  description: 'Sistema completo de gestão para salões de beleza e barbearias',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}