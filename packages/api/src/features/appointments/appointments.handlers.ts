import { Context } from 'hono';
import { eq, and, desc } from 'drizzle-orm';
import { appointments } from '@repo/db/schema';
import { Variables } from '../../types';

// Define o tipo de Contexto para incluir as Variáveis injetadas (User, DB)
type AppContext = Context<{ Variables: Variables }>;

/**
 * Handler para buscar todos os agendamentos (GET /)
 * Princípio 2.12 (CQRS): Operação de Leitura otimizada
 */
export const getAppointments = async (c: AppContext) => {
  const user = c.var.user;

  try {
    // O Drizzle converterá automaticamente 'start_time' (DB) para 'startTime' (JSON)
    // graças ao schema definido no Passo 1.
    const data = await c.var.db
      .select()
      .from(appointments)
      .where(eq(appointments.userId, user.id)) // Usa propriedade camelCase do schema
      .orderBy(desc(appointments.startTime));

    return c.json(data);
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
  const user = c.var.user;

  try {
    const data = await c.var.db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.id, id),
          eq(appointments.userId, user.id) // Garante segurança (Tenant isolation)
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
 * Princípio 2.16 (Design Seguro): userId é injetado pelo backend, nunca pelo payload.
 */
export const createAppointment = async (c: AppContext) => {
  // O payload já chega em camelCase (validado pelo Zod no Passo 2)
  const newAppointmentData = c.req.valid('json');
  const user = c.var.user;

  try {
    const data = await c.var.db
      .insert(appointments)
      .values({
        ...newAppointmentData,
        userId: user.id, // Injeção segura do ID do usuário
      })
      .returning(); // Retorna o objeto criado já mapeado (camelCase)

    return c.json(data[0], 201);
  } catch (error) {
    console.error('Error creating appointment:', error);
    return c.json({ error: 'Failed to create appointment' }, 500);
  }
};

/**
 * Handler para atualizar um agendamento (PUT /:id)
 * Princípio 2.14 (Imutabilidade): O update cria um novo estado no banco com updatedAt atualizado.
 */
export const updateAppointment = async (c: AppContext) => {
  const { id } = c.req.param();
  const updatedData = c.req.valid('json');
  const user = c.var.user;

  // Proteção de campos imutáveis ou gerenciados pelo sistema
  delete updatedData.id;
  delete updatedData.userId;
  delete updatedData.createdAt;

  try {
    const data = await c.var.db
      .update(appointments)
      .set({
        ...updatedData, // Spreads propriedades camelCase (ex: startTime, notes)
        updatedAt: new Date(), // Atualiza explicitamente o timestamp
      })
      .where(
        and(
          eq(appointments.id, id),
          eq(appointments.userId, user.id)
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
  const user = c.var.user;

  try {
    const data = await c.var.db
      .delete(appointments)
      .where(
        and(
          eq(appointments.id, id),
          eq(appointments.userId, user.id)
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