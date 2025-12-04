/*
 * Arquivo: /packages/api/src/core/auth.ts
 * O Quê (Lógica): Criar um authMiddleware genérico que depende da Interface.
 * DIP (2.9): O middleware depende de c.var.authAdapter, não do Supabase.
 */

import { createMiddleware } from 'hono/factory';
import type { Variables } from '../types';

/**
 * Middleware de autenticação.
 * Verifica o token 'Authorization' e usa o IAuthAdapter injetado (c.var.authAdapter)
 * para validar o usuário.
 * Se for válido, injeta o usuário em c.set('user').
 */
export const authMiddleware = createMiddleware<{ Variables: Variables }>(
  async (c, next) => {
    // 1. Extrair o token do header
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized', message: 'No token provided' }, 401);
    }
    const token = authHeader.replace('Bearer ', '').trim();

    // 2. Validar se o token existe
    if (!token) {
      return c.json({ error: 'Unauthorized', message: 'No token provided' }, 401);
    }

    try {
      // 3. Validar o token usando o adaptador (DIP)
      const user = await c.var.authAdapter.validateToken(token);

      // 4. Validar se o usuário foi retornado
      if (!user) {
        return c.json({ error: 'Unauthorized', message: 'Invalid token' }, 401);
      }

      // 5. Injetar o usuário no contexto para uso nos handlers
      c.set('user', user);

      // 6. Continuar para o próximo middleware ou rota
      await next();
    } catch (err) {
      console.error('AuthMiddleware Error:', err);
      return c.json({ error: 'Unauthorized', message: 'Token validation failed' }, 401);
    }
  }
);
