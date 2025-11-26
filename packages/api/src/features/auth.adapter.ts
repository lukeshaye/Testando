/**
 * Define a Interface de Autenticação (Contrato de Abstração).
 * Desacopla a lógica de negócios do provedor de autenticação específico (ex: Supabase).
 [cite_start]* [cite: 32, 34]
 */

/**
 * Um tipo genérico para o usuário autenticado.
 [cite_start]* [cite: 35]
 */
export type AuthUser = {
  id: string;
  email: string;
  [key: string]: any; // Permite outras propriedades
};

/**
 * Interface (Contrato) para o Adaptador de Autenticação.
 [cite_start]* [cite: 36]
 */
export interface IAuthAdapter {
  /**
   * Valida um token de acesso e retorna o usuário associado.
   [cite_start]* [cite: 37]
   */
  validateToken(token: string): Promise<AuthUser | null>;

  /**
   * Autentica um usuário com credenciais.
   [cite_start]* [cite: 38]
   */
  signIn(credentials: any): Promise<{ user: AuthUser; token: string } | null>;

  /**
   * Registra um novo usuário.
   [cite_start]* [cite: 39]
   */
  signUp(credentials: any): Promise<{ user: AuthUser; token: string } | null>;

  /**
   * Invalida o token do usuário (logout).
   [cite_start]* [cite: 40]
   */
  signOut(token: string): Promise<void>;
}