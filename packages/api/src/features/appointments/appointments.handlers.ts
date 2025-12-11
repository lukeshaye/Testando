import { Context } from 'hono';
import { eq, and, desc } from 'drizzle-orm';
import { appointments } from '@repo/db/schema';
import { Variables } from '../../types';

// Define o tipo de Contexto para incluir as Variáveis injetadas (User, DB)
type AppContext = Context<{ Variables: Variables }>;

/**
 * Função auxiliar para combinar Data e Hora em um objeto Date UTC válido.
 */
const combineDateAndTime = (dateInput: Date | string, timeStr: string): Date => {
  const date = new Date(dateInput);
  const [hours, minutes] = timeStr.split(':').map(Number);
  
  // Cria uma nova data baseada na data do input, ajustando apenas as horas
  const combinedDate = new Date(date);
  combinedDate.setHours(hours, minutes, 0, 0);
  
  return combinedDate;
};

/**
 * Handler para buscar todos os agendamentos (GET /)
 * Princípio 2.12 (CQRS): Operação de Leitura otimizada [cite: 76]
 */
export const getAppointments = async (c: AppContext) => {
  const user = c.var.user;

  try {
    const data = await c.var.db
      .select()
      .from(appointments)
      .where(eq(appointments.userId, user.id)) 
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
    // 1. Combina a data com a string de hora para criar os objetos Date reais
    const fullStartTime = combineDateAndTime(payload.appointmentDate, payload.startTime);
    
    // 2. Usa o endTime fornecido explicitamente pelo payload validado
    const fullEndTime = combineDateAndTime(payload.appointmentDate, payload.endTime);

    // Remove campos auxiliares que não vão para o banco
    const { appointmentDate, startTime, endTime, ...rest } = payload;

    const data = await c.var.db
      .insert(appointments)
      .values({
        ...rest,
        startTime: fullStartTime, 
        endTime: fullEndTime,     
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
 * CORREÇÃO APLICADA: Busca prévia para garantir consistência de dados e tipos[cite: 13, 101].
 */
export const updateAppointment = async (c: AppContext) => {
  const { id } = c.req.param();
  const payload = c.req.valid('json');
  const user = c.var.user;

  try {
    // 1. Busca o agendamento existente PRIMEIRO para garantir que existe e pertence ao usuário.
    // Isso é essencial para mesclar datas e horas corretamente.
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

    const currentAppt = existing[0];

    // 2. Preparação segura dos dados (Tipagem forte em vez de 'any')
    // Removemos chaves auxiliares do payload original para evitar poluição ou erros de tipo
    const { 
      appointmentDate, 
      startTime: startTimeStr, 
      endTime: endTimeStr, 
      duration, // removido se existir
      id: _id, 
      userId: _userId, 
      createdAt: _createdAt,
      ...otherUpdates 
    } = payload;

    const valuesToUpdate: Partial<typeof appointments.$inferInsert> = {
      ...otherUpdates,
      updatedAt: new Date(),
    };

    // 3. Lógica de Recálculo de Datas
    // Se houver alteração de data OU horário, precisamos recalcular os objetos Date.
    if (appointmentDate || startTimeStr || endTimeStr) {
       // Define a data base: usa a nova se fornecida, ou a existente do banco.
       const baseDate = appointmentDate ? new Date(appointmentDate) : currentAppt.startTime;
       
       // Atualiza StartTime
       if (startTimeStr) {
         // Se forneceu nova hora, combina com a data base
         valuesToUpdate.startTime = combineDateAndTime(baseDate, startTimeStr);
       } else if (appointmentDate) {
         // Se mudou SÓ a data, preserva a hora antiga na nova data
         const newStart = new Date(baseDate);
         newStart.setHours(currentAppt.startTime.getHours(), currentAppt.startTime.getMinutes(), 0, 0);
         valuesToUpdate.startTime = newStart;
       }

       // Atualiza EndTime
       if (endTimeStr) {
         valuesToUpdate.endTime = combineDateAndTime(baseDate, endTimeStr);
       } else if (appointmentDate) {
         // Se mudou SÓ a data, preserva a hora de fim antiga
         const newEnd = new Date(baseDate);
         newEnd.setHours(currentAppt.endTime.getHours(), currentAppt.endTime.getMinutes(), 0, 0);
         valuesToUpdate.endTime = newEnd;
       }
    }

    // 4. Executa o Update com dados limpos e tipados
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