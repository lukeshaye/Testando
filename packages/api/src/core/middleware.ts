/**
 * @file /packages/api/src/core/middleware.ts
 * 
 * Define middlewares globais, especialmente o Injetor de Dependência. 
 */

import { createMiddleware } from 'hono/factory';
import { cors } from 'hono/cors';
import type { Context, Next } from 'hono';

// Importar createDbClient, createAuthClient
import { createDbClient, createAuthClient } from './db';
// Importar SupabaseAuthAdapter
import { SupabaseAuthAdapter } from '../adapters/supabase-auth.adapter';

// Importa os tipos Hono para Bindings e Variables
import type { Bindings, Variables } from '../types';

/**
 * Define o tipo de contexto padrão para os middlewares desta API
 * para garantir o type safety com c.env e c.set.
 */
type AppContext = Context<{
  Bindings: Bindings;
  Variables: Variables;
}>;

/**
 * Middleware de Injeção de Dependência (DIP).
 *
 * Esta é a função central que implementa o Pilar 2.9 (DIP).
 * Ela instancia os clientes concretos (ex: Supabase) e os adaptadores
 * e, em seguida, injeta as *abstrações* (IAuthAdapter) e os clientes
 * (Drizzle) no contexto Hono (c.var) para serem consumidos pelos handlers.
 */
// 
export const injectorMiddleware = createMiddleware(async (c: AppContext, next: Next) => {
  // 1. Instanciar Clientes
  const dbClient = createDbClient(c.env); // 
  const authClient = createAuthClient(c.env); // 

  // 2. Instanciar Adaptadores
  const authAdapter = new SupabaseAuthAdapter(authClient); // 

  // 3. Injetar Abstrações
  c.set('db', dbClient); // O cliente Drizzle
  c.set('authAdapter', authAdapter); // O adaptador de Auth

  await next(); // 
}); // 

/**
 * Exporta um manipulador de CORS global.
 * O plano solicita que ele seja aplicado globalmente.
 */
export const corsMiddleware = cors();

/**
 * Exporta um manipulador de erros (ErrorHandler) global.
 * O plano solicita que ele seja aplicado globalmente
 * para capturar quaisquer erros não tratados na cadeia de middleware.
 */
export const errorHandler = async (c: AppContext, next: Next) => {
  try {
    await next();
  } catch (err: any) {
    console.error(
      `[GlobalErrorHandler]: ${err?.message}`,
      err?.stack,
      err?.cause,
    );
    return c.json(
      {
        error: 'Internal Server Error',
        message: err?.message || 'An unexpected error occurred',
      },
      500,
    );
  }
};