import { Context } from 'hono';
import { Variables } from '../../types';

/**
 * Lida com a tentativa de login de um usuário.
 * * ALINHAMENTO PADRÃO OURO (Passo 3):
 * - Entrada: Recebe JSON em camelCase validado pelo Zod (ex: { email, password }).
 * - Processamento: Delega para o authAdapter (Princípio 2.9 - DIP).
 * - Saída: Retorna o objeto em camelCase vindo do Adapter, sem conversão manual.
 */
export const signInHandler = async (c: Context<{ Variables: Variables }>) => {
  try {
    // O Zod (Passo 2) garante que 'credentials' já esteja em camelCase
    const credentials = c.req.valid('json');
    const authAdapter = c.var.authAdapter; 

    // O Adapter (Passo 1) lida com a conversa com o DB (snake_case) e retorna camelCase
    const result = await authAdapter.signIn(credentials);

    if (!result) {
      return c.json({ error: 'Invalid email or password' }, 401);
    }

    // Retorna { user: { id, firstName... }, token } em camelCase
    return c.json(result, 200);
  } catch (error: any) {
    return c.json({ error: 'Sign-in failed', message: error.message }, 500);
  }
};

/**
 * Lida com a tentativa de registro (sign-up) de um novo usuário.
 */
export const signUpHandler = async (c: Context<{ Variables: Variables }>) => {
  try {
    // O Zod (Passo 2) garante que 'credentials' já esteja em camelCase (ex: firstName, lastName)
    const credentials = c.req.valid('json');
    const authAdapter = c.var.authAdapter;

    // O Adapter fará o insert mapeando camelCase -> snake_case automaticamente (Drizzle)
    const result = await authAdapter.signUp(credentials);

    if (!result) {
      // Falha genérica ou usuário já existente tratado pelo adapter retornando null
      return c.json({ error: 'Could not create user' }, 400);
    }

    // Retorna { user, token } com status 201 Created
    return c.json(result, 201);
  } catch (error: any) {
    return c.json({ error: 'Sign-up failed', message: error.message }, 500);
  }
};