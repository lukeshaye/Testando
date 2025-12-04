/**
 * /packages/api/src/features/appointments/appointments.handlers.ts
 *
 * (Executor: LLM 2)
 *
 * Tarefa: 3.3 [Source: 95]
 * De Onde: Lógica de src/shared/store.ts e src/worker/index.ts. [Source: 136]
 * O Quê: Criar e exportar funções de handler (ex: getAppointments, createAppointment). [Source: 107]
 * Como:
 * - Handlers devem usar sintaxe Drizzle (c.var.db). [Source: 137]
 * - Handlers devem aplicar a lógica de user_id (vinda de c.var.user) em todas as consultas. [Source: 137]
 */

import { Context } from 'hono';
import { eq, and, desc } from 'drizzle-orm';
import { Variables } from '../../types';
// [Source: 62] O schema é injetado, mas os handlers precisam da referência das tabelas (assumindo Módulo 2)
import { appointments } from '@repo/db/schema';

// Define o tipo de Contexto para incluir as Variáveis injetadas [Source: 144, 162]
type AppContext = Context<{ Variables: Variables }>;

/**
 * Handler para buscar todos os agendamentos (GET /)
 * [Source: 107, 110-115]
 */
export const getAppointments = async (c: AppContext) => {
  const user = c.var.user; // [Source: 111, 137]

  try {
    const data = await c.var.db // [Source: 109]
      .select()
      .from(appointments)
      .where(eq(appointments.userId, user.id)) // [Source: 113, 137]
      .orderBy(desc(appointments.startTime)); // Ordenação comum para agendamentos

    return c.json(data); // [Source: 114]
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return c.json({ error: 'Failed to fetch appointments' }, 500);
  }
};

/**
 * Handler para buscar um agendamento específico (GET /:id)
 */
export const getAppointmentById = async (c: AppContext) => {
  const { id } = c.req.param();
  const user = c.var.user; // [Source: 137]

  try {
    const data = await c.var.db // [Source: 109]
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.id, id),
          eq(appointments.userId, user.id) // [Source: 137]
        )
      );

    if (data.length === 0) {
      return c.json({ error: 'Appointment not found' }, 404);
    }
    return c.json(data[0]);
  } catch (error) {
    console.error('Error fetching appointment:', error);
    return c.json({ error: 'Failed to fetch appointment' }, 500);
  }
};

/**
 * Handler para criar um novo agendamento (POST /)
 * [Source: 107, 116-122]
 */
export const createAppointment = async (c: AppContext) => {
  const newAppointmentData = c.req.valid('json'); // [Source: 117]
  const user = c.var.user; // [Source: 118, 137]

  try {
    const data = await c.var.db // [Source: 109]
      .insert(appointments)
      .values({
        ...newAppointmentData,
        userId: user.id, // [Source: 120, 137]
      })
      .returning(); // [Source: 120]

    return c.json(data[0], 201); // [Source: 121]
  } catch (error) {
    console.error('Error creating appointment:', error);
    return c.json({ error: 'Failed to create appointment' }, 500);
  }
};

/**
 * Handler para atualizar um agendamento (PUT /:id)
 */
export const updateAppointment = async (c: AppContext) => {
  const { id } = c.req.param();
  const updatedData = c.req.valid('json'); // [Source: 103]
  const user = c.var.user; // [Source: 137]

  // Remover campos protegidos que não devem ser atualizados diretamente
  delete updatedData.id;
  delete updatedData.userId;
  delete updatedData.createdAt;

  try {
    const data = await c.var.db // [Source: 109]
      .update(appointments)
      .set({
        ...updatedData,
        updatedAt: new Date(), // Atualiza o timestamp
      })
      .where(
        and(
          eq(appointments.id, id),
          eq(appointments.userId, user.id) // [Source: 137]
        )
      )
      .returning();

    if (data.length === 0) {
      return c.json({ error: 'Appointment not found to update' }, 404);
    }
    return c.json(data[0]);
  } catch (error) {
    console.error('Error updating appointment:', error);
    return c.json({ error: 'Failed to update appointment' }, 500);
  }
};

/**
 * Handler para deletar um agendamento (DELETE /:id)
 */
export const deleteAppointment = async (c: AppContext) => {
  const { id } = c.req.param();
  const user = c.var.user; // [Source: 137]

  try {
    const data = await c.var.db // [Source: 109]
      .delete(appointments)
      .where(
        and(
          eq(appointments.id, id),
          eq(appointments.userId, user.id) // [Source: 137]
        )
      )
      .returning({ deletedId: appointments.id });

    if (data.length === 0) {
      return c.json({ error: 'Appointment not found to delete' }, 404);
    }
    return c.json({ success: true, deletedId: data[0].deletedId });
  } catch (error) {
    console.error('Error deleting appointment:', error);
    return c.json({ error: 'Failed to delete appointment' }, 500);
  }
};