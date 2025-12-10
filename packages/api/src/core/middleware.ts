/**
 * @file /packages/api/src/core/middleware.ts
 * * Define middlewares globais, especialmente o Injetor de Dependência. 
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
 * Cache Singleton para os clientes.
 * Isso resolve o problema de performance identificado no plano,
 * permitindo o reaproveitamento de conexões (Connection Pooling)
 * entre requisições no mesmo ambiente de execução.
 */
let cachedDbClient: ReturnType<typeof createDbClient> | null = null;
let cachedAuthAdapter: SupabaseAuthAdapter | null = null;

/**
 * Middleware de Injeção de Dependência (DIP).
 *
 * [cite_start]Esta função implementa o Pilar 2.9 (DIP)[cite: 58].
 * Ela garante que os clientes sejam instanciados apenas uma vez (Singleton)
 * e injeta as abstrações no contexto para uso nos handlers.
 */
export const injectorMiddleware = createMiddleware(async (c: AppContext, next: Next) => {
  // 1. Instanciar Clientes (Singleton / Lazy Initialization)
  // Verifica se já existe uma instância criada para evitar recriação desnecessária.
  
  if (!cachedDbClient) {
    cachedDbClient = createDbClient(c.env);
  }

  if (!cachedAuthAdapter) {
    const authClient = createAuthClient(c.env);
    cachedAuthAdapter = new SupabaseAuthAdapter(authClient);
  }

  // 3. Injetar Abstrações
  // Usa as instâncias cacheadas.
  c.set('db', cachedDbClient); 
  c.set('authAdapter', cachedAuthAdapter); 

  await next(); 
});

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