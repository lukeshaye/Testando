/**
 * /packages/api/src/features/settings/settings.handlers.ts
 *
 * Este arquivo implementa os handlers (controladores) para a feature 'settings'.
 * Ele segue o plano genérico para features (Tarefa 3.3).
 *
 * De Onde (Refatoração): Lógica de src/shared/store.ts e src/worker/index.ts.
 * Como (Princípios):
 * Todos os handlers usam c.var.db (Drizzle).
 * Todos os handlers aplicam a lógica de user_id (c.var.user) para tenancy (DSpP 2.16 / Pilar 13).
 * DIP (2.9) / Pilar 2: Os handlers usam o cliente Drizzle injetado.
 */

import { Context } from 'hono';
import { eq } from 'drizzle-orm';
// Importa o schema (Módulo 2) assumindo o path do monorepo
import { settings } from '@repo/db/schema';
// Importa os tipos Hono (Tarefa 3.4)
import { Variables } from '../../types';

// Define o tipo de Context com as Variables injetadas (db, authAdapter, user)
type HandlerContext = Context<{ Variables: Variables }>;

/**
 * getSettings
 *
 * Busca o registro de configuração único associado ao usuário autenticado.
 * (Baseado no padrão 'get' e regras de feature )
 */
export const getSettings = async (c: HandlerContext) => {
  // Obtém o usuário autenticado (injetado via DIP por c.var)
  const user = c.var.user;

  // Usa c.var.db (Drizzle) para a consulta 
  const data = await c.var.db
    .select()
    .from(settings)
    .where(eq(settings.userId, user.id)) // Aplica filtro de tenancy (user_id)
    .limit(1); // Configurações são um registro único por usuário

  // Retorna o primeiro registro encontrado ou null
  return c.json(data[0] || null);
};

/**
 * updateSettings (Upsert)
 *
 * Cria ou atualiza o registro de configuração do usuário autenticado.
 * (Baseado no padrão 'create' e regras de feature )
 */
export const updateSettings = async (c: HandlerContext) => {
  // Obtém o body validado (pelo zValidator nas rotas)
  const settingsData = c.req.valid('json');
  // Obtém o usuário autenticado (injetado via DIP por c.var)
  const user = c.var.user;

  // Usa c.var.db (Drizzle) 
  // Implementa a lógica "Upsert" (Update or Insert)
  const data = await c.var.db
    .insert(settings)
    .values({
      ...settingsData,
      userId: user.id, // Garante a posse do registro
    })
    .onConflictDoUpdate({
      // Se o 'userId' já existir (conflito), atualiza os dados
      target: settings.userId,
      set: settingsData,
    })
    .returning(); // Retorna o registro modificado

  // Retorna o registro (200 OK, pois é um update/upsert)
  return c.json(data[0], 200);
};