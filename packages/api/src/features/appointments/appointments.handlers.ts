import { Context } from 'hono';
import { eq, and, desc } from 'drizzle-orm';
import { appointments } from '@repo/db/schema';
import { Variables } from '../../types';

// Define o tipo de Contexto para incluir as Variáveis injetadas (User, DB)
type AppContext = Context<{ Variables: Variables }>;

// ❌ REMOVIDO: combineDateAndTime. 
// Princípio 2.3 (KISS): Removemos complexidade desnecessária de parsing manual.
// A responsabilidade de garantir datas válidas agora é do Schema (Zod) e do Frontend.

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
    // ✅ CORREÇÃO (Opção B): Usamos as datas já validadas pelo Zod.
    // O Zod garante que appointmentDate e endDate são objetos Date válidos.
    // Removemos 'startTime' e 'endTime' string do destructuring pois não existem mais no payload.
    const { appointmentDate, endDate, ...rest } = payload;

    const data = await c.var.db
      .insert(appointments)
      .values({
        ...rest,
        // Mapeamento direto: O objeto Date completo entra no banco.
        // Isso preserva o Timezone UTC corretamente.
        startTime: appointmentDate, 
        endTime: endDate,           
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
 * Aplicação do Princípio 2.14 (Imutabilidade): Criamos novo estado em vez de mutar strings[cite: 93].
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
    // Removemos campos de metadados e extraímos as datas para tratamento especial
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

    // ✅ CORREÇÃO (Opção B): Lógica Simplificada.
    // Se o payload trouxe novas datas (objetos Date), atualizamos diretamente.
    // Não há mais recálculo ou split de strings 'HH:mm'.
    if (appointmentDate) {
        valuesToUpdate.startTime = appointmentDate;
    }
    
    if (endDate) {
        valuesToUpdate.endTime = endDate;
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