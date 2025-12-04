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
 *
 * Importante: esta função segue a _assinatura de onError do Hono_,
 * para ser registrada via `app.onError(errorHandler)`.
 */
export const errorHandler = (err: any, c: Context) => {
  // Normaliza a mensagem de erro para lidar com casos em que algo que não é
  // uma instância de Error é lançado (ex: string crua).
  // O Hono, nesse caso, costuma embrulhar em um Error com mensagem
  // "Unknown Error: <valor_original>".
  let message: string;

  if (err instanceof Error) {
    const rawMessage = err.message || '';
    if (rawMessage.startsWith('Unknown Error:')) {
      // Erro de origem desconhecida (por exemplo, foi lançada uma string crua)
      message = 'Internal Server Error';
    } else {
      message = rawMessage || 'Internal Server Error';
    }
  } else {
    // Valor não-Error lançado diretamente
    message = 'Internal Server Error';
  }

  console.error(`[GlobalErrorHandler]: ${message}`, err?.stack, err?.cause);

  return c.json(
    {
      success: false,
      error: message,
    },
    500,
  );
};