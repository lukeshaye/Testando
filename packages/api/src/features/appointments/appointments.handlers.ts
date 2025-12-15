import { Context } from 'hono';
import { eq, and, desc, gte, lte } from 'drizzle-orm';
import { appointments } from '@repo/db/schema';
import { Variables } from '../../types';

// Define o tipo de Contexto para incluir as Variáveis injetadas (User, DB)
type AppContext = Context<{ Variables: Variables }>;

/**
 * Handler para buscar todos os agendamentos (GET /)
 * * Princípios Aplicados:
 * - 2.12 (CQRS): Utilização de `db.query` para leitura otimizada e estruturada.
 * - 2.3 (KISS): Simplificação da query removendo joins manuais complexos.
 * - 2.15 (PTE): Adição de filtros obrigatórios para viabilizar testes de cenário.
 */
export const getAppointments = async (c: AppContext) => {
  const user = c.var.user;
  
  // Extração de filtros da Query String (Princípio 2.1 - Planejamento/Dependências)
  const { startDate, endDate, professionalId } = c.req.query();

  try {
    // Utilizando a Query API do Drizzle para retornar dados aninhados (Nested Relational Query)
    // Isso satisfaz o contrato esperado pelo Frontend: { client: { name: ... } }
    const data = await c.var.db.query.appointments.findMany({
      where: (table, { eq, and, gte, lte }) => {
        // Montagem dinâmica dos filtros
        const filters = [eq(table.userId, user.id)]; // Segurança: Sempre filtrar pelo usuário logado

        if (startDate) {
          filters.push(gte(table.appointmentDate, new Date(startDate)));
        }

        if (endDate) {
          filters.push(lte(table.appointmentDate, new Date(endDate)));
        }

        if (professionalId) {
          filters.push(eq(table.professionalId, professionalId));
        }

        return and(...filters);
      },
      with: {
        // Trazendo relacionamentos aninhados conforme solicitado no plano
        client: {
          columns: {
            name: true,
          },
        },
        service: {
          columns: {
            name: true,
            duration: true, // Útil para o frontend calcular visualização se necessário
          },
        },
        professional: {
            columns: {
                name: true, // Necessário se houver filtro ou visualização por profissional
            }
        }
      },
      orderBy: (table, { desc }) => [desc(table.appointmentDate)],
    });

    return c.json(data);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return c.json({ error: 'Failed to fetch appointments' }, 500);
  }
};

/**
 * Handler para buscar um agendamento específico (GET /:id)
 * Mantém a consistência de retorno aninhado do endpoint de listagem.
 */
export const getAppointmentById = async (c: AppContext) => {
  const { id } = c.req.param();
  const user = c.var.user;

  try {
    const item = await c.var.db.query.appointments.findFirst({
      where: (table, { eq, and }) => and(
        eq(table.id, id),
        eq(table.userId, user.id)
      ),
      with: {
        client: {
          columns: { name: true },
        },
        service: {
          columns: { name: true, price: true, description: true },
        },
        professional: {
            columns: { name: true }
        }
      },
    });

    if (!item) {
      return c.json({ error: 'Appointment not found' }, 404);
    }
    return c.json(item);
  } catch (error) {
    console.error('Error fetching appointment:', error);
    return c.json({ error: 'Failed to fetch appointment' }, 500);
  }
};

/**
 * Handler para criar um novo agendamento (POST /)
 * [cite_start]Princípio 2.16 (Design Seguro): userId é injetado pelo backend[cite: 108].
 */
export const createAppointment = async (c: AppContext) => {
  const payload = c.req.valid('json');
  const user = c.var.user;

  try {
    const { appointmentDate, endDate, ...rest } = payload;

    const data = await c.var.db
      .insert(appointments)
      .values({
        ...rest,
        // O Schema Zod já deve ter validado se são strings de data ou Dates
        appointmentDate: appointmentDate, 
        endDate: endDate,                 
        userId: user.id,
      })
      .returning();

    // Nota: Em um cenário ideal CQRS/REST, poderíamos retornar o objeto completo com relacionamentos
    // fazendo um fetch imediato após o insert, mas manteremos o retorno simples do insert por performance.
    return c.json(data[0], 201);
  } catch (error) {
    console.error('Error creating appointment:', error);
    return c.json({ error: 'Failed to create appointment' }, 500);
  }
};

/**
 * Handler para atualizar um agendamento (PUT /:id)
 * [cite_start]Aplicação do Princípio 2.14 (Imutabilidade)[cite: 93].
 */
export const updateAppointment = async (c: AppContext) => {
  const { id } = c.req.param();
  const payload = c.req.valid('json');
  const user = c.var.user;

  try {
    // 1. Busca prévia (Segurança e Consistência)
    const existing = await c.var.db.query.appointments.findFirst({
        where: (table, { eq, and }) => and(eq(table.id, id), eq(table.userId, user.id)),
        columns: { id: true } // Busca leve apenas para verificar existência
    });

    if (!existing) {
      return c.json({ error: 'Appointment not found to update' }, 404);
    }

    // 2. Preparação segura dos dados
    // Removemos campos que não devem ser alterados manualmente
    const { 
      id: _id, 
      userId: _userId, 
      createdAt: _createdAt,
      appointmentDate,
      endDate,
      ...otherUpdates 
    } = payload;

    const valuesToUpdate: Partial<typeof appointments.$inferInsert> = {
      ...otherUpdates,
      updatedAt: new Date(),
    };

    // Mapeamento direto (CamelCase -> Schema)
    if (appointmentDate) valuesToUpdate.appointmentDate = appointmentDate;
    if (endDate) valuesToUpdate.endDate = endDate;

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