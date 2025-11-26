import React from "react";
import { redirect } from "next/navigation";
// Importa a função 'auth' para obter a sessão (via NextAuth).
// Esta importação assume que a configuração centralizada do NextAuth
// (conforme Veredito do Auditor) existirá em um módulo `@/auth.ts`,
// separando a configuração da rota de API.
import { auth } from "@/auth";

/**
 * Layout da Aplicação Autenticada
 * * Este layout atua como o "portão" de segurança para todas as rotas
 * dentro do grupo (app).
 * * Implementa a Rota Protegida obtendo a sessão (via NextAuth).
 * * Se a sessão não existir, redireciona para /login.
 * * Replica a intenção do <ProtectedRoute> e SupabaseAuthProvider.tsx legados.
 * * ADIAMENTO: Nenhuma UI (Sidebar/Header) é implementada aqui.
 * * Esta é uma implementação do Princípio 2.16 (Design Seguro por Padrão).
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Obtém a sessão do NextAuth a partir do módulo centralizado
  const session = await auth();

  // Se a sessão não existir, redireciona para a página de login.
  if (!session) {
    redirect("/login");
  }

  // Se a sessão existir, renderiza as páginas filhas.
  // Conforme o ADIAMENTO, nenhuma UI de layout é adicionada.
  return <>{children}</>;
}