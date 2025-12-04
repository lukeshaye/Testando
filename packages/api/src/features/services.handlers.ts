/**
 * /packages/api/src/features/services/services.handlers.ts
 *
 * (Executor: Implementando estritamente o $$PLANO_DE_FEATURE$$)
 *
 * De Onde (Refatoração): Lógica de src/shared/store.ts e src/worker/index.ts.
 * O Quê (Lógica): Criar e exportar funções de handler para a feature 'services'.
 * Como (Princípios):
 * - Todos os handlers devem usar sintaxe Drizzle (c.var.db).
 * - Todos os handlers devem aplicar a lógica de user_id (c.var.user) em todas as consultas.
 * - Os handlers usam o cliente Drizzle injetado (c.var.db).
 * - createService usa c.req.valid('json') e injeta userId.
 * - getServices filtra por userId.
 */

import { Context } from 'hono';
import { eq, and } from 'drizzle-orm';
// O schema (Módulo 2) é assumido como estando disponível via alias de path
import { services } from '@repo/db/schema';
import { Variables } from '../../types';

type HandlerContext = Context<{ Variables: Variables }>;

/**
 * Handler para buscar todos os serviços (filtrado por usuário).
 */
export const getServices = async (c: HandlerContext) => {
  const user = c.var.user;

  try {
    const data = await c.var.db
      .select()
      .from(services)
      .where(eq(services.userId, user.id));

    return c.json(data);
  } catch (error) {
    console.error('Error fetching services:', error);
    return c.json({ error: 'Failed to fetch services' }, 500);
  }
};

/**
 * Handler para buscar um serviço específico (filtrado por usuário).
 */
export const getServiceById = async (c: HandlerContext) => {
  const user = c.var.user;
  const { id } = c.req.param();

  try {
    const data = await c.var.db
      .select()
      .from(services)
      .where(
        and(
          eq(services.id, id),
          eq(services.userId, user.id) // RLS/Tenancy
        )
      );

    if (data.length === 0) {
      return c.json({ error: 'Service not found or unauthorized' }, 404);
    }
    return c.json(data[0]);
  } catch (error) {
    console.error('Error fetching service:', error);
    return c.json({ error: 'Failed to fetch service' }, 500);
  }
};

/**
 * Handler para criar um novo serviço (associado ao usuário).
 */
export const createService = async (c: HandlerContext) => {
  const newServiceData = c.req.valid('json');
  const user = c.var.user;

  try {
    const data = await c.var.db
      .insert(services)
      .values({
        ...newServiceData,
        userId: user.id, // Garantindo tenancy
      })
      .returning();

    return c.json(data[0], 201);
  } catch (error) {
    console.error('Error creating service:', error);
    return c.json({ error: 'Failed to create service' }, 500);
  }
};

/**
 * Handler para atualizar um serviço (filtrado por usuário).
 */
export const updateService = async (c: HandlerContext) => {
  const { id } = c.req.param();
  const updatedValues = c.req.valid('json');
  const user = c.var.user;

  // Remover campos que não devem ser atualizados diretamente (ex: id, userId)
  delete updatedValues.id;
  delete updatedValues.userId;

  try {
    const data = await c.var.db
      .update(services)
      .set(updatedValues)
      .where(
        and(
          eq(services.id, id),
          eq(services.userId, user.id) // RLS/Tenancy
        )
      )
      .returning();

    if (data.length === 0) {
      return c.json({ error: 'Service not found or unauthorized' }, 404);
    }

    return c.json(data[0]);
  } catch (error) {
    console.error('Error updating service:', error);
    return c.json({ error: 'Failed to update service' }, 500);
  }
};

/**
 * Handler para deletar um serviço (filtrado por usuário).
 */
export const deleteService = async (c: HandlerContext) => {
  const { id } = c.req.param();
  const user = c.var.user;

  try {
    const data = await c.var.db
      .delete(services)
      .where(
        and(
          eq(services.id, id),
          eq(services.userId, user.id) // RLS/Tenancy
        )
      )
      .returning();

    if (data.length === 0) {
      return c.json({ error: 'Service not found or unauthorized' }, 404);
    }

    return c.json({ message: 'Service deleted successfully' });
  } catch (error) {
    console.error('Error deleting service:', error);
    return c.json({ error: 'Failed to delete service' }, 500);
  }
};