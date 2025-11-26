import { supabase } from '@/packages/web/src/lib/supabaseClient';
import type {
  AuthResponse,
  Session,
  User,
} from '@supabase/supabase-js';
import type { IAuthService, LoginCredentials } from './IAuthService';

/**
 * Implementação concreta do IAuthService usando o SDK do Supabase.
 * Este é o módulo de "baixo nível" que lida diretamente com a comunicação
 * do provedor de autenticação.
 *
 * Conforme $$PLANO_DE_FEATURE$$ (Revisão 2), Tarefa 2.
 * Esta classe encapsula *toda* a lógica que chama 'supabase.auth.*'.
 */
class SupabaseAuthService implements IAuthService {
  /**
   * Obtém a sessão e o usuário atuais do Supabase.
   * Lança um erro se a chamada ao Supabase falhar, para ser tratado pelo React Query.
   */
  async getSession(): Promise<{ user: User | null; session: Session | null; }> {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.error('SupabaseAuthService: Error getting session:', error.message);
      throw error;
    }

    return {
      user: data.session?.user ?? null,
      session: data.session ?? null,
    };
  }

  /**
   * Registra um listener para mudanças no estado de autenticação (login/logout).
   * @param callback A função a ser chamada quando o estado de autenticação mudar.
   * @returns Uma função de 'unsubscribe' para limpar o listener.
   */
  onAuthStateChange(callback: (session: Session | null) => void): () => void {
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        // Chama o callback fornecido pelo hook (alto nível)
        callback(session);
      }
    );

    // Retorna a função de unsubscribe
    return () => {
      listener?.subscription.unsubscribe();
    };
  }

  /**
   * Tenta autenticar o usuário com email e senha no Supabase.
   * Retorna a AuthResponse completa para a mutação (useAuth) tratar.
   * @param credentials Email e senha do usuário.
   */
  async signInWithPassword(
    credentials: LoginCredentials
  ): Promise<AuthResponse> {
    const response = await supabase.auth.signInWithPassword(credentials);
    return response;
  }

  /**
   * Realiza o logout do usuário atual no Supabase.
   * Lança um erro se a chamada ao Supabase falhar.
   */
  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('SupabaseAuthService: Error signing out:', error.message);
      throw error;
    }
  }
}

/**
 * Exporta uma instância única (singleton) do serviço de autenticação.
 * Esta instância será injetada via Contexto React.
 */
export const authService = new SupabaseAuthService();