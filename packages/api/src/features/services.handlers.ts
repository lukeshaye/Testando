/**
 * /packages/api/src/features/services/services.handlers.ts
 *
 * (Executor: Implementando estritamente o $$PLANO_DE_FEATURE$$)
 *
 * [cite_start]De Onde (Refatoração): [cite: 136] Lógica de src/shared/store.ts e src/worker/index.ts.
 * [cite_start]O Quê (Lógica): [cite: 107] Criar e exportar funções de handler para a feature 'services'.
 * Como (Princípios):
 [cite_start]* [cite: 137] Todos os handlers devem usar sintaxe Drizzle (c.var.db).
 [cite_start]* [cite: 137] Todos os handlers devem aplicar a lógica de user_id (c.var.user) em todas as consultas.
 [cite_start]* [cite: 109] Os handlers usam o cliente Drizzle injetado (c.var.db).
 [cite_start]* [cite: 117, 120] createService usa c.req.valid('json') e injeta userId.
 [cite_start]* [cite: 111, 113] getServices filtra por userId.
 */

import { Context } from 'hono';
import { eq, and } from 'drizzle-orm';
// O schema (Módulo 2) é assumido como estando disponível via alias de path
import { services } from '@repo/db/schema';
import { Variables } from '../../types';

type HandlerContext = Context<{ Variables: Variables }>;

/**
 [cite_start]* [cite: 110-115] Handler para buscar todos os serviços (filtrado por usuário).
 */
export const getServices = async (c: HandlerContext) => {
  [cite_start]const user = c.var.user; [cite: 111]

  try {
    [cite_start]const data = await c.var.db [cite: 112]
      .select()
      .from(services)
      [cite_start].where(eq(services.userId, user.id)); [cite: 113]

    [cite_start]return c.json(data); [cite: 114]
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
          [cite_start]eq(services.userId, user.id) // [cite: 137] RLS/Tenancy
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
 [cite_start]* [cite: 116-122] Handler para criar um novo serviço (associado ao usuário).
 */
export const createService = async (c: HandlerContext) => {
  [cite_start]const newServiceData = c.req.valid('json'); [cite: 117]
  [cite_start]const user = c.var.user; [cite: 118]

  try {
    const data = await c.var.db
      .insert(services)
      .values({
        ...newServiceData,
        [cite_start]userId: user.id, // [cite: 120] Garantindo tenancy
      })
      [cite_start].returning(); [cite: 120]

    [cite_start]return c.json(data[0], 201); [cite: 121]
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
          [cite_start]eq(services.userId, user.id) // [cite: 137] RLS/Tenancy
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
          [cite_start]eq(services.userId, user.id) // [cite: 137] RLS/Tenancy
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