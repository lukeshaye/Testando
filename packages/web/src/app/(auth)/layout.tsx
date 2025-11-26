import React from "react";

/**
 * TAREFA 4.3.2: Layout para rotas de autenticação (auth)
 * [cite_start]De Onde (Refatoração): lukeshaye/ssd-3/ssd-3-d277f26fe80c2c1942b93b351b3db3cb518e8368/ssd/src/react-app/pages/Home.tsx (como referência visual/estrutural) [cite: 143]
 * [cite_start]Para Onde (Estrutura): /packages/web/src/app/(auth)/layout.tsx [cite: 144]
 *
 * O Quê (Lógica):
 * [cite_start]1. Criar um layout simples que renderiza {children}. [cite: 146]
 * 2. Este layout replica a estrutura externa da Home.tsx legada, aplicando
 * [cite_start]um fundo (bg-background) e centralizando o conteúdo (flex items-center justify-center min-h-screen). [cite: 147]
 *
 * Como (Princípios):
 * - [cite_start]2.11 (Feature-Based Folders): Usa o "Route Group" (auth) para agrupar todas as páginas não autenticadas. [cite: 149]
 * - [cite_start]2.5 (SoC): Separa a estrutura de layout (centralização, fundo) da lógica da página (o formulário de login). [cite: 150]
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center">
      {children}
    </main>
  );
}