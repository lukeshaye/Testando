/*
 * Arquivo: /packages/api/src/core/db.ts
 * O Quê (Lógica): Abstrair a criação dos clientes de DB (Drizzle) e Auth (Supabase).
 * DIP (2.9): Este arquivo é a "fábrica" que lê Env Vars genéricas e instancia clientes específicos.
 */

import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Bindings } from '../types';

// Correção aplicada: Importação ajustada para '@repo/db' conforme o plano de correção.
// Isso centraliza o conhecimento do schema (DRY 2.2).
import * as schema from '@repo/db';

/**
 * Cria e retorna um cliente Drizzle conectado ao banco de dados.
 * Utiliza a URL genérica do banco de dados das bindings.
 * * Princípio KISS (2.3): Mantém a inicialização simples e direta.
 */
export function createDbClient(
  env: Bindings
): PostgresJsDatabase<typeof schema> { 
  const queryClient = postgres(env.DATABASE_URL);
  return drizzle(queryClient, { schema });
}

/**
 * Cria e retorna um cliente de autenticação (Supabase).
 * Utiliza a URL e a Chave genéricas do provedor de auth das bindings.
 */
export function createAuthClient(env: Bindings): SupabaseClient {
  return createClient(env.AUTH_PROVIDER_URL, env.AUTH_PROVIDER_KEY);
}