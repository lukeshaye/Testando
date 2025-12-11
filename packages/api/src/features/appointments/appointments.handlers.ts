import { Context } from 'hono';
import { eq, and, desc } from 'drizzle-orm';
import { appointments, clients, services } from '@repo/db/schema'; // Importação das tabelas para Join
import { Variables } from '../../types';

// Define o tipo de Contexto para incluir as Variáveis injetadas (User, DB)
type AppContext = Context<{ Variables: Variables }>;

/**
 * Handler para buscar todos os agendamentos (GET /)
 * Princípio 2.12 (CQRS): Operação de Leitura otimizada com Joins 
 * Correção: Retorna appointmentDate/endDate e nomes de cliente/serviço.
 */
export const getAppointments = async (c: AppContext) => {
  const user = c.var.user;

  try {
    const data = await c.var.db
      .select({
        // Selecionamos todos os campos do agendamento
        id: appointments.id,
        appointmentDate: appointments.appointmentDate, // ✅ Corrigido: Schema correto
        endDate: appointments.endDate,                 // ✅ Corrigido: Schema correto
        status: appointments.status,
        notes: appointments.notes,
        clientId: appointments.clientId,
        serviceId: appointments.serviceId,
        createdAt: appointments.createdAt,
        updatedAt: appointments.updatedAt,
        userId: appointments.userId,
        // ✅ Correção Plan 2: Joins para trazer dados legíveis para a UI
        clientName: clients.name,
        serviceName: services.name,
      })
      .from(appointments)
      // Left Joins garantem que o agendamento retorne mesmo se cliente/serviço tiverem sido deletados (opcional, mas seguro)
      .leftJoin(clients, eq(appointments.clientId, clients.id))
      .leftJoin(services, eq(appointments.serviceId, services.id))
      .where(eq(appointments.userId, user.id))
      .orderBy(desc(appointments.appointmentDate)); // ✅ Corrigido: Ordenação pelo campo correto

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
      .select({
        id: appointments.id,
        appointmentDate: appointments.appointmentDate,
        endDate: appointments.endDate,
        status: appointments.status,
        notes: appointments.notes,
        clientId: appointments.clientId,
        serviceId: appointments.serviceId,
        clientName: clients.name,   // Incluso para consistência
        serviceName: services.name, // Incluso para consistência
      })
      .from(appointments)
      .leftJoin(clients, eq(appointments.clientId, clients.id))
      .leftJoin(services, eq(appointments.serviceId, services.id))
      .where(
        and(
          eq(appointments.id, id),
          eq(appointments.userId, user.id)
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
 * Princípio 2.16 (Design Seguro): userId é injetado pelo backend[cite: 108].
 */
export const createAppointment = async (c: AppContext) => {
  const payload = c.req.valid('json');
  const user = c.var.user;

  try {
    // ✅ CORREÇÃO PLANO: Usamos diretamente appointmentDate e endDate.
    // O Schema (Zod) já garante que são objetos Date válidos.
    const { appointmentDate, endDate, ...rest } = payload;

    const data = await c.var.db
      .insert(appointments)
      .values({
        ...rest,
        appointmentDate: appointmentDate, // ✅ Mapeamento correto para o Schema do DB
        endDate: endDate,                 // ✅ Mapeamento correto para o Schema do DB
        userId: user.id,
      })
      .returning();

    return c.json(data[0], 201);
  } catch (error) {
    console.error('Error creating appointment:', error);
    return c.json({ error: 'Failed to create appointment' }, 500);
  }
};

/**
 * Handler para atualizar um agendamento (PUT /:id)
 * Aplicação do Princípio 2.14 (Imutabilidade)[cite: 93].
 */
export const updateAppointment = async (c: AppContext) => {
  const { id } = c.req.param();
  const payload = c.req.valid('json');
  const user = c.var.user;

  try {
    // 1. Busca prévia (Segurança e Consistência)
    const existing = await c.var.db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.id, id),
          eq(appointments.userId, user.id)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return c.json({ error: 'Appointment not found to update' }, 404);
    }

    // 2. Preparação segura dos dados
    const { 
      appointmentDate, 
      endDate,
      id: _id, 
      userId: _userId, 
      createdAt: _createdAt,
      ...otherUpdates 
    } = payload;

    const valuesToUpdate: Partial<typeof appointments.$inferInsert> = {
      ...otherUpdates,
      updatedAt: new Date(),
    };

    // ✅ CORREÇÃO PLANO: Atualização direta dos campos corretos
    if (appointmentDate) {
        valuesToUpdate.appointmentDate = appointmentDate; // Nome correto da coluna
    }
    
    if (endDate) {
        valuesToUpdate.endDate = endDate; // Nome correto da coluna
    }

    // 3. Executa o Update
    const data = await c.var.db
      .update(appointments)
      .set(valuesToUpdate)
      .where(eq(appointments.id, id))
      .returning();

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