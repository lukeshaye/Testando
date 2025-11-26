/**
 * @file /packages/api/src/features/clients/clients.handlers.ts
 * 
 * Contém os handlers Hono (lógica de controller) para a feature 'clients'.
 * Esta lógica foi movida de 'src/shared/store.ts' (legado). 
 */

import type { Context } from 'hono';
// Importa operadores Drizzle (eq, and) para RLS
import { eq, and } from 'drizzle-orm';

// Importa os tipos de contexto Hono (Injeção de Dependência)
import type { Bindings, Variables } from '@api/types';

// Importa o schema da DB (Módulo 2)
// (O Executor assume que o Módulo 2 exportou os schemas para
// um local importável, ex: @api/db-schema)
import { clients } from '@api/db-schema';

// Importa os tipos Zod (Módulo 1)
// (O Executor assume que o Módulo 1 exportou os tipos Zod para
// um local importável, ex: @api/schemas)
import type { CreateClient } from '@api/schemas';

/**
 * Define o tipo de contexto padrão para os handlers desta API,
 * garantindo o type safety para c.var (db, authAdapter, user).
 */
type AppContext = Context<{
  Bindings: Bindings;
  Variables: Variables;
}>;

// Exporta funções de handler

/**
 * Handler para GET /api/clients
 * Busca todos os clientes pertencentes ao usuário autenticado.
 */
export const getClients = async (c: AppContext) => {
  const user = c.var.user; // 

  try {
    // Usa c.var.db (Drizzle)
    const data = await c.var.db
      .select()
      .from(clients)
      // Aplica RLS/Tenancy (Pilar 13)
      .where(eq(clients.userId, user.id));

    return c.json(data); // 
  } catch (e: any) {
    console.error(`[clients.handlers:getClients]: ${e.message}`);
    return c.json({ error: 'Failed to fetch clients' }, 500);
  }
};

/**
 * Handler para POST /api/clients
 * Cria um novo cliente associado ao usuário autenticado.
 */
export const createClient = async (c: AppContext) => {
  // Obtém os dados validados pelo zValidator
  const newClient = c.req.valid('json') as CreateClient;
  const user = c.var.user; // 

  try {
    // Usa c.var.db (Drizzle)
    const data = await c.var.db
      .insert(clients)
      // Associa o ID do usuário (Tenancy)
      .values({
        ...newClient,
        userId: user.id,
      })
      .returning(); // 

    return c.json(data[0], 201); // 
  } catch (e: any) {
    console.error(`[clients.handlers:createClient]: ${e.message}`);
    return c.json({ error: 'Failed to create client' }, 500);
  }
};

/**
 * Handler para GET /api/clients/:id
 * Busca um cliente específico pelo ID, garantindo que ele pertença
 * ao usuário autenticado.
 */
export const getClientById = async (c: AppContext) => {
  const { id } = c.req.param();
  const user = c.var.user; // 

  try {
    // Usa c.var.db (Drizzle)
    const data = await c.var.db
      .select()
      .from(clients)
      // Aplica RLS/Tenancy (Pilar 13)
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
 * Atualiza um cliente específico, garantindo que ele pertença
 * ao usuário autenticado.
 */
export const updateClient = async (c: AppContext) => {
  const { id } = c.req.param();
  // Obtém os dados validados pelo zValidator
  const updatedClient = c.req.valid('json') as CreateClient;
  const user = c.var.user; // 

  try {
    // Usa c.var.db (Drizzle)
    const data = await c.var.db
      .update(clients)
      .set(updatedClient)
      // Aplica RLS/Tenancy (Pilar 13)
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
 * Deleta um cliente específico, garantindo que ele pertença
 * ao usuário autenticado.
 */
export const deleteClient = async (c: AppContext) => {
  const { id } = c.req.param();
  const user = c.var.user; // 

  try {
    // Usa c.var.db (Drizzle)
    const data = await c.var.db
      .delete(clients)
      // Aplica RLS/Tenancy (Pilar 13)
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