import { Context } from 'hono';
import { Variables } from '../../types';

/**
 * Lida com a tentativa de login de um usuário.
 * Espera que os dados (credenciais) tenham sido validados
 * pelo zValidator no arquivo de rotas.
 */
export const signInHandler = async (c: Context<{ Variables: Variables }>) => {
  try {
    const credentials = c.req.valid('json');
    const authAdapter = c.var.authAdapter; // [cite: 133]

    const result = await authAdapter.signIn(credentials); // [cite: 133]

    if (!result) {
      return c.json({ error: 'Invalid email or password' }, 401);
    }

    // Retorna { user, token }
    return c.json(result, 200);
  } catch (error: any) {
    return c.json({ error: 'Sign-in failed', message: error.message }, 500);
  }
};

/**
 * Lida com a tentativa de registro (sign-up) de um novo usuário.
 * Espera que os dados tenham sido validados pelo zValidator.
 */
export const signUpHandler = async (c: Context<{ Variables: Variables }>) => {
  try {
    const credentials = c.req.valid('json');
    const authAdapter = c.var.authAdapter; // [cite: 133]

    const result = await authAdapter.signUp(credentials); // [cite: 133]

    if (!result) {
// [cite: 39] O adaptador retorna null em caso de falha
      return c.json({ error: 'Could not create user' }, 400);
    }

    // Retorna { user, token } com status 201 Created
    return c.json(result, 201);
  } catch (error: any) {
    // Captura erros (ex: usuário já existe, se o adapter lançar)
    return c.json({ error: 'Sign-up failed', message: error.message }, 500);
  }
};