import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css'; // TAREFA 4.3.1: Importar globals.css (CORREÇÃO: Removidas importações não autorizadas do PrimeReact CSS)
import { Providers } from './providers'; // TAREFA 4.3.1: Configurar provedores (lógica migrada de App.tsx/main.tsx)

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SalonFlow - Gestão de Salão', // (Refatoração de index.html)
  description: 'Sistema completo de gestão para salões de beleza e barbearias', // (Refatoração de index.html)
  manifest: '/manifest.json', // (Conforme Tarefa 4.3.1 e 4.2.1)
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR"> {/* (Conforme Tarefa 4.3.1) */}
      <body className={inter.className}>
        {/* (Conforme Tarefa 4.3.1: Envolver children com Provedores de Sessão e Toast) */}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}