/**
 * /packages/api/src/features/services/services.handlers.ts
 *
 * (Executor: Passo 3 - A Lógica)
 *
 * Objetivo: Handlers alinhados ao "Padrão Ouro".
 * - Recebe CamelCase do Frontend/Zod.
 * - Passa CamelCase para o Drizzle.
 * - Drizzle converte automaticamente para Snake_case no banco.
 */

import { Context } from 'hono';
import { eq, and } from 'drizzle-orm';
import { services } from '@repo/db/schema';
import { Variables } from '../../types';

type HandlerContext = Context<{ Variables: Variables }>;

/**
 * GET /services
 * Busca todos os serviços do usuário logado.
 */
export const getServices = async (c: HandlerContext) => {
  const user = c.var.user;

  try {
    // Graças ao Passo 1 (Schema), services.userId mapeia para user_id no banco
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
 * GET /services/:id
 * Busca um serviço específico garantindo tenancy.
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
          eq(services.userId, user.id) // RLS/Tenancy Application
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
 * POST /services
 * Cria um serviço recebendo payload em camelCase.
 */
export const createService = async (c: HandlerContext) => {
  // newServiceData já vem em camelCase e validado pelo Zod (Passo 2)
  const newServiceData = c.req.valid('json');
  const user = c.var.user;

  try {
    const data = await c.var.db
      .insert(services)
      .values({
        ...newServiceData,
        userId: user.id, // Injeção segura do Tenant
      })
      .returning();

    return c.json(data[0], 201);
  } catch (error) {
    console.error('Error creating service:', error);
    return c.json({ error: 'Failed to create service' }, 500);
  }
};

/**
 * PATCH /services/:id
 * Atualiza um serviço recebendo payload em camelCase.
 */
export const updateService = async (c: HandlerContext) => {
  const { id } = c.req.param();
  // updatedValues em camelCase (ex: durationMinutes)
  const updatedValues = c.req.valid('json');
  const user = c.var.user;

  // Sanitização de segurança: impede alteração do ID ou Dono
  // (Embora o Zod deva prevenir isso, é uma camada extra de segurança do Handler)
  delete (updatedValues as any).id;
  delete (updatedValues as any).userId;

  try {
    const data = await c.var.db
      .update(services)
      .set(updatedValues) // Drizzle mapeia automaticamente para snake_case no banco
      .where(
        and(
          eq(services.id, id),
          eq(services.userId, user.id) // RLS/Tenancy Check
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
 * DELETE /services/:id
 * Deleta um serviço garantindo tenancy.
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
          eq(services.userId, user.id) // RLS/Tenancy Check
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