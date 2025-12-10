import { Context } from 'hono';
import { eq, and, desc } from 'drizzle-orm';
import { appointments } from '@repo/db/schema';
import { Variables } from '../../types';

// Define o tipo de Contexto para incluir as Variáveis injetadas (User, DB)
type AppContext = Context<{ Variables: Variables }>;

/**
 * Função auxiliar para combinar Data e Hora em um objeto Date UTC válido.
 * Resolve o problema de "Falha de Tipo na Persistência" identificado no plano.
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
 * Princípio 2.12 (CQRS): Operação de Leitura otimizada
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
 * Princípio 2.16 (Design Seguro): userId é injetado pelo backend.
 * CORREÇÃO: Conversão de tipos (String 'HH:MM' -> Date Object) antes da persistência.
 */
export const createAppointment = async (c: AppContext) => {
  // O payload vem validado pelo Zod. Espera-se: { appointmentDate: Date, startTime: string, duration: number, ... }
  const payload = c.req.valid('json');
  const user = c.var.user;

  try {
    // 1. Combina a data (dia) com a string de hora (HH:MM) para criar o objeto Date real
    const fullStartTime = combineDateAndTime(payload.appointmentDate, payload.startTime);
    
    // 2. Calcula o endTime baseado na duração (se a duração vier em minutos)
    // Se o seu schema Zod já mandar 'endTime', use a mesma lógica do startTime.
    // Assumindo aqui que o payload tem 'duration' em minutos:
    const fullEndTime = new Date(fullStartTime.getTime() + (payload.duration || 60) * 60000);

    // Remove campos auxiliares que não vão para o banco (como appointmentDate e startTime isolados)
    // e prepara o objeto final para o Drizzle.
    const { appointmentDate, startTime, duration, ...rest } = payload;

    const data = await c.var.db
      .insert(appointments)
      .values({
        ...rest, // Outros campos como notes, clientName, etc.
        startTime: fullStartTime, // Agora é um Date, compatível com timestamp do DB
        endTime: fullEndTime,     // Agora é um Date
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
 * Princípio 2.14 (Imutabilidade): Update cria novo estado via updatedAt.
 */
export const updateAppointment = async (c: AppContext) => {
  const { id } = c.req.param();
  const payload = c.req.valid('json');
  const user = c.var.user;

  // Proteção de campos imutáveis
  delete payload.id;
  delete payload.userId;
  delete payload.createdAt;

  try {
    // Preparação dos dados para atualização
    const updateData: any = { ...payload };

    // Se houver alteração de horário, precisamos recalcular os objetos Date
    if (payload.appointmentDate && payload.startTime) {
       const fullStartTime = combineDateAndTime(payload.appointmentDate, payload.startTime);
       updateData.startTime = fullStartTime;
       
       if (payload.duration) {
         updateData.endTime = new Date(fullStartTime.getTime() + payload.duration * 60000);
       }
       
       // Limpeza dos campos auxiliares que não existem na tabela
       delete updateData.appointmentDate;
       delete updateData.startTime; // remove a string, fica o Date criado acima
       delete updateData.duration;
    }

    const data = await c.var.db
      .update(appointments)
      .set({
        ...updateData,
        updatedAt: new Date(),
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