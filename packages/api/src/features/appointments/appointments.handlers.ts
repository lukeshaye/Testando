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
 * CORREÇÃO: Remove uso de 'duration' e usa 'endTime' do contrato validado.
 */
export const createAppointment = async (c: AppContext) => {
  // O payload vem validado pelo Zod. Espera-se: { appointmentDate: Date, startTime: string, endTime: string, ... }
  const payload = c.req.valid('json');
  const user = c.var.user;

  try {
    // 1. Combina a data (dia) com a string de hora (HH:MM) para criar os objetos Date reais
    const fullStartTime = combineDateAndTime(payload.appointmentDate, payload.startTime);
    
    // 2. CORREÇÃO: Usa o endTime fornecido explicitamente pelo payload validado,
    // em vez de calcular com base em uma propriedade 'duration' inexistente.
    const fullEndTime = combineDateAndTime(payload.appointmentDate, payload.endTime);

    // Remove campos auxiliares que não vão para o banco e prepara o objeto final.
    // Nota: duration foi removido da desestruturação pois não existe no schema.
    const { appointmentDate, startTime, endTime, ...rest } = payload;

    const data = await c.var.db
      .insert(appointments)
      .values({
        ...rest, // Outros campos como notes, clientName, etc.
        startTime: fullStartTime, // Agora é um Date, compatível com timestamp do DB
        endTime: fullEndTime,     // Agora é um Date, calculado corretamente
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

    // Se houver alteração de horário (Start ou End), precisamos recalcular os objetos Date.
    // Assume-se que se o usuário quer mudar o horário, ele envia a data base e as horas.
    if (payload.appointmentDate) {
       if (payload.startTime) {
         updateData.startTime = combineDateAndTime(payload.appointmentDate, payload.startTime);
         delete updateData.startTime; // remove a string auxiliar
       }
       
       if (payload.endTime) {
         // CORREÇÃO: Usa endTime explicitamente se fornecido
         updateData.endTime = combineDateAndTime(payload.appointmentDate, payload.endTime);
         delete updateData.endTime; // remove a string auxiliar
       }
       
       // Limpeza do campo auxiliar de data base
       delete updateData.appointmentDate;
    }

    // Remove duration caso tenha sobrado no payload (embora o Zod deva barrar)
    delete updateData.duration;

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