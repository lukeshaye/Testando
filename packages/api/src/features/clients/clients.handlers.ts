/**
 * @file /packages/api/src/features/clients/clients.handlers.ts
 * * Contém os handlers Hono para a feature 'clients'.
 * Refatorado para o padrão camelCase (Aplicação) <-> snake_case (Banco).
 */

import type { Context } from 'hono';
import { eq, and } from 'drizzle-orm';

import type { Bindings, Variables } from '@api/types';

// Importa o schema da DB (já configurado com mapeamento no Passo 1)
import { clients } from '@db/schema';

// Importa os tipos Zod (já em camelCase conforme Passo 2)
import type { CreateClient } from '@api/schemas';

type AppContext = Context<{
  Bindings: Bindings;
  Variables: Variables;
}>;

/**
 * Handler para GET /api/clients
 * Retorna objetos em camelCase automaticamente via Drizzle.
 */
export const getClients = async (c: AppContext) => {
  const user = c.var.user;

  try {
    const data = await c.var.db
      .select()
      .from(clients)
      // O Drizzle converte automaticamente 'userId' (schema) para 'user_id' (SQL)
      .where(eq(clients.userId, user.id));

    return c.json(data);
  } catch (e: any) {
    console.error(`[clients.handlers:getClients]: ${e.message}`);
    return c.json({ error: 'Failed to fetch clients' }, 500);
  }
};

/**
 * Handler para POST /api/clients
 * Recebe camelCase (Zod), grava via Drizzle (mapeamento auto).
 */
export const createClient = async (c: AppContext) => {
  // 'newClient' já está em camelCase e validado pelo Zod
  const newClient = c.req.valid('json') as CreateClient;
  const user = c.var.user;

  try {
    const data = await c.var.db
      .insert(clients)
      .values({
        ...newClient,
        // Injeção de dependência do User ID (Tenancy)
        // Usa a propriedade em camelCase definida no Schema
        userId: user.id, 
      })
      .returning();

    return c.json(data[0], 201);
  } catch (e: any) {
    console.error(`[clients.handlers:createClient]: ${e.message}`);
    return c.json({ error: 'Failed to create client' }, 500);
  }
};

/**
 * Handler para GET /api/clients/:id
 */
export const getClientById = async (c: AppContext) => {
  const { id } = c.req.param();
  const user = c.var.user;

  try {
    const data = await c.var.db
      .select()
      .from(clients)
      .where(and(eq(clients.id, id), eq(clients.userId, user.id)));

    if (data.length === 0) {
      return c.json({ error: 'Client not found' }, 404);
    }

    return c.json(data[0]);
  } catch (e: any) {
    console.error(`[clients.handlers:getClientById]: ${e.message}`);
    return c.json({ error: 'Failed to fetch client' }, 500);
  }
};

/**
 * Handler para PUT /api/clients/:id
 * Recebe payload parcial ou total em camelCase e atualiza.
 */
export const updateClient = async (c: AppContext) => {
  const { id } = c.req.param();
  // 'updatedClient' deve estar em camelCase (Zod)
  const updatedClient = c.req.valid('json') as Partial<CreateClient>;
  const user = c.var.user;

  try {
    const data = await c.var.db
      .update(clients)
      // O Drizzle mapeia as chaves camelCase do objeto para as colunas snake_case
      .set(updatedClient)
      .where(and(eq(clients.id, id), eq(clients.userId, user.id)))
      .returning();

    if (data.length === 0) {
      return c.json({ error: 'Client not found or update failed' }, 404);
    }

    return c.json(data[0]);
  } catch (e: any) {
    console.error(`[clients.handlers:updateClient]: ${e.message}`);
    return c.json({ error: 'Failed to update client' }, 500);
  }
};

/**
 * Handler para DELETE /api/clients/:id
 */
export const deleteClient = async (c: AppContext) => {
  const { id } = c.req.param();
  const user = c.var.user;

  try {
    const data = await c.var.db
      .delete(clients)
      .where(and(eq(clients.id, id), eq(clients.userId, user.id)))
      .returning({ id: clients.id });

    if (data.length === 0) {
      return c.json({ error: 'Client not found or deletion failed' }, 404);
    }

    return c.json({ message: 'Client deleted successfully', id: data[0].id });
  } catch (e: any) {
    console.error(`[clients.handlers:deleteClient]: ${e.message}`);
    return c.json({ error: 'Failed to delete client' }, 500);
  }
};