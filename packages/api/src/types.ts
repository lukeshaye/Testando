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
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js'; [cite_start]// [cite: 160] (Tipo Drizzle apropriado)
import { IAuthAdapter, AuthUser } from './core/auth.adapter'; [cite_start]// [cite: 161]

/**
 * Define as Bindings (Variáveis de Ambiente)
 * [cite_start]Pilar 24 (Configurabilidade Extrema): Nomes genéricos de provedor. [cite: 152]
 */
export type Bindings = {
  [cite_start]// [cite: 153]
  DATABASE_URL: string; [cite_start]// [cite: 154]
  AUTH_PROVIDER_URL: string; [cite_start]// [cite: 155]
  AUTH_PROVIDER_KEY: string; [cite_start]// [cite: 156]
  [cite_start]// ...outras bindings... [cite: 157]
};

/**
 * Define as Variables injetadas no Contexto Hono (via Middleware)
 * [cite_start]DIP (2.9): Tipar com as Interfaces e Abstrações. [cite: 159]
 */
export type Variables = {
  [cite_start]// [cite: 162]
  db: PostgresJsDatabase; [cite_start]// Abstração do Banco (Pilar 2) [cite: 163]
  authAdapter: IAuthAdapter; [cite_start]// Abstração de Auth (Pilar 18) [cite: 164]
  user: AuthUser; [cite_start]// O usuário autenticado [cite: 165]
};