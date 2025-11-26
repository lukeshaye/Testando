import type { User, Session, AuthResponse } from '@supabase/supabase-js';

/**
 * Define as credenciais necessárias para o login.
 * Conforme $$PLANO_DE_FEATURE$$ (Revisão 2), Tarefa 1.
 */
export type LoginCredentials = {
  email: string;
  password: string;
};

/**
 * Abstração do Serviço de Autenticação (Princípio de Inversão de Dependência - DIP).
 * Define o contrato que os hooks (alto nível) usarão, permitindo que a
 * implementação (baixo nível, Supabase) seja trocada.
 *
 * Conforme $$PLANO_DE_FEATURE$$ (Revisão 2), Tarefa 1.
 */
export interface IAuthService {
  /**
   * Obtém a sessão e o usuário atuais.
   */
  getSession(): Promise<{ user: User | null; session: Session | null; }>;

  /**
   * Registra um listener para mudanças no estado de autenticação (login/logout).
   * @param callback A função a ser chamada quando o estado de autenticação mudar.
   * @returns Uma função de 'unsubscribe' para limpar o listener.
   */
  onAuthStateChange(callback: (session: Session | null) => void): () => void;

  /**
   * Tenta autenticar o usuário com email e senha.
   * @param credentials Email e senha do usuário.
   */
  signInWithPassword(credentials: LoginCredentials): Promise<AuthResponse>;

  /**
   * Realiza o logout do usuário atual.
   */
  signOut(): Promise<void>;
}