/**
 * Arquivo: /packages/api/src/types.ts
 *
 * Objetivo: Definir os tipos de contexto Hono genéricos (Bindings e Variables).
 *
 * Baseado no $$PLANO_DE_FEATURE$$
 * Tarefa 3.4: Entrypoint e Tipos da API
 * Fontes: [148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166]
 */

// Importar tipos para as abstrações (DIP 2.9)
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { IAuthAdapter, AuthUser } from './core/auth.adapter';

/**
 * Define as Bindings (Variáveis de Ambiente)
 * Pilar 24 (Configurabilidade Extrema): Nomes genéricos de provedor.
 */
export type Bindings = {
  DATABASE_URL: string;
  AUTH_PROVIDER_URL: string;
  AUTH_PROVIDER_KEY: string;
  // ...outras bindings...
};

/**
 * Define as Variables injetadas no Contexto Hono (via Middleware)
 * DIP (2.9): Tipar com as Interfaces e Abstrações.
 */
export type Variables = {
  db: PostgresJsDatabase; // Abstração do Banco (Pilar 2)
  authAdapter: IAuthAdapter; // Abstração de Auth (Pilar 18)
  user: AuthUser; // O usuário autenticado
};