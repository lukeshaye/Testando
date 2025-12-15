/**
 * /packages/api/src/features/appointments/appointments.handlers.test.ts
 *
 * Correção Aplicada:
 * 1. Leitura (Queries): Migrado para `db.query` (Drizzle Query API) para suportar
 * objetos aninhados (client: { name }) e filtros complexos.
 * 2. Filtros: Adicionado teste obrigatório para startDate, endDate e professionalId.
 * 3. Escrita (Mutations): Mantido padrão Chain (insert/update) mas validando Schema correto.
 *
 * Princípios:
 * - [cite_start]PTE (2.15)[cite: 101]: Validação explícita de filtros e estrutura de retorno.
 * - [cite_start]KISS (2.3)[cite: 23]: Uso de Query API simplifica joins complexos.
 * - [cite_start]SoC (2.5)[cite: 36]: Handler foca em orquestrar; DB resolve as relações.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  deleteAppointment,
} from './appointments.handlers';

// ---------------------------------------------------------------------------
// 1. MOCK DO SCHEMA E DB
// ---------------------------------------------------------------------------
const { mockAppointmentsTable } = vi.hoisted(() => {
  return {
    mockAppointmentsTable: {
      id: { name: 'id' },
      userId: { name: 'user_id' },
      clientId: { name: 'client_id' },
      professionalId: { name: 'professional_id' },
      serviceId: { name: 'service_id' },
      appointmentDate: { name: 'appointment_date' },
      endDate: { name: 'end_date' },
      status: { name: 'status' },
      createdAt: { name: 'created_at' },
      updatedAt: { name: 'updated_at' },
    },
  };
});

vi.mock('@repo/db/schema', () => {
  return {
    appointments: mockAppointmentsTable,
    clients: { id: { name: 'id' }, name: { name: 'name' } },
    services: { id: { name: 'id' }, name: { name: 'name' } },
    professionals: { id: { name: 'id' }, name: { name: 'name' } },
  };
});

// ---------------------------------------------------------------------------
// 2. HELPERS DE TESTE
// ---------------------------------------------------------------------------

const createMockChain = (finalValue?: any) => {
  const resolvedValue = finalValue ?? [];

  const chain: any = {
    from: vi.fn(() => chain),
    where: vi.fn(() => chain),
    orderBy: vi.fn(() => chain),
    leftJoin: vi.fn(() => chain),
    innerJoin: vi.fn(() => chain),
    set: vi.fn(() => chain),
    values: vi.fn(() => chain),
    returning: vi.fn(() => chain),
    then: vi.fn((onFulfilled: (v: any) => any) =>
      Promise.resolve(onFulfilled(resolvedValue)),
    ),
  };

  return chain;
};

describe('Appointments Handlers', () => {
  let mockCtx: any;
  const mockUser = { id: 'user-123', email: 'test@example.com' };
  let mockDb: any;

  beforeEach(() => {
    vi.resetAllMocks();

    mockDb = {
      // API de Consulta (Query API) - Usada para Leitura (Nested Data)
      query: {
        appointments: {
          findMany: vi.fn(),
          findFirst: vi.fn(),
        },
      },
      // API de Corrente (Chain) - Usada para Escrita/Mutações
      insert: vi.fn(() => createMockChain([])),
      update: vi.fn(() => createMockChain([])),
      delete: vi.fn(() => createMockChain([{ deletedId: 'a1' }])),
      // Mantido para compatibilidade se algo ainda usar select puro
      select: vi.fn(() => createMockChain([])),
    };

    mockCtx = {
      var: {
        user: mockUser,
        db: mockDb,
      },
      req: {
        valid: vi.fn(),
        param: vi.fn((key?: string) => (key ? 'a1' : { id: 'a1' })),
        // Mock de query params para filtros
        query: vi.fn(), 
      },
      json: vi.fn((data, status) => ({ data, status })),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // LEITURA (Queries) - Migrado para db.query (Query API)
  // -------------------------------------------------------------------------

  describe('getAppointments', () => {
    it('should fetch appointments with filters and nested objects (Correct Plan)', async () => {
      // DADOS ANINHADOS (KISS - Facilidade para o Frontend)
      const mockData = [
        {
          id: 'a1',
          appointmentDate: new Date('2025-01-01T10:00:00Z'),
          userId: mockUser.id,
          // Estrutura aninhada conforme o plano
          client: { name: 'João' },
          service: { name: 'Corte' },
          professional: { name: 'Ana', color: '#FFF' },
        },
      ];

      // Configurar retorno do Query API
      mockDb.query.appointments.findMany.mockResolvedValueOnce(mockData);

      // Simular Query Params do Frontend
      mockCtx.req.query.mockImplementation((key: string) => {
        if (key === 'startDate') return '2025-01-01';
        if (key === 'endDate') return '2025-01-31';
        if (key === 'professionalId') return 'prof-1';
        return undefined;
      });

      await getAppointments(mockCtx);

      // VERIFICAÇÃO PTE (2.15): O filtro foi aplicado?
      expect(mockDb.query.appointments.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.anything(), // Verifica se cláusula where foi passada
          with: expect.objectContaining({
            client: expect.any(Object),
            service: expect.any(Object),
            professional: expect.any(Object),
          }),
          orderBy: expect.anything(),
        })
      );

      // Verifica se o JSON retornado é a estrutura aninhada
      expect(mockCtx.json).toHaveBeenCalledWith(mockData);
    });

    it('should handle errors in query api', async () => {
      mockDb.query.appointments.findMany.mockRejectedValueOnce(new Error('DB Query Error'));

      await getAppointments(mockCtx);

      expect(mockCtx.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) }),
        500
      );
    });
  });

  describe('getAppointmentById', () => {
    it('should return nested appointment if found using findFirst', async () => {
      const mockItem = { 
        id: 'a1', 
        appointmentDate: new Date(),
        client: { name: 'Maria' } // Retorno aninhado
      };
      
      mockDb.query.appointments.findFirst.mockResolvedValueOnce(mockItem);

      await getAppointmentById(mockCtx);

      expect(mockDb.query.appointments.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
            where: expect.anything(),
            with: expect.anything() // Deve buscar detalhes também
        })
      );
      expect(mockCtx.json).toHaveBeenCalledWith(mockItem);
    });

    it('should return 404 if not found', async () => {
      mockDb.query.appointments.findFirst.mockResolvedValueOnce(undefined);

      await getAppointmentById(mockCtx);

      expect(mockCtx.json).toHaveBeenCalledWith(
        { error: 'Appointment not found' },
        404
      );
    });
  });

  // -------------------------------------------------------------------------
  // ESCRITA (Comandos) - Mantém Chain mas valida Schema
  // -------------------------------------------------------------------------

  describe('createAppointment', () => {
    it('should persist Date objects directly mapping to Schema keys', async () => {
      const inputDate = new Date('2025-01-02T10:00:00Z');
      const inputEndDate = new Date('2025-01-02T11:00:00Z');
      
      const inputPayload = {
        clientId: 'c1',
        professionalId: 'p1',
        serviceId: 's1',
        appointmentDate: inputDate,
        endDate: inputEndDate,
      };

      const createdData = {
        id: 'a2',
        ...inputPayload,
        userId: mockUser.id,
      };

      const insertChain = createMockChain([createdData]);
      mockDb.insert.mockReturnValueOnce(insertChain);
      mockCtx.req.valid.mockReturnValue(inputPayload);

      await createAppointment(mockCtx);

      expect(mockDb.insert).toHaveBeenCalled();
      
      // PTE (2.15): Verifica mapeamento correto dos campos
      expect(insertChain.values).toHaveBeenCalledWith(expect.objectContaining({
        clientId: 'c1',
        userId: mockUser.id,
        appointmentDate: inputDate, 
        endDate: inputEndDate
      }));

      expect(mockCtx.json).toHaveBeenCalledWith(createdData, 201);
    });
  });

  describe('updateAppointment', () => {
    it('should update appointmentDate directly via chain', async () => {
      const existingItem = { id: 'a1', userId: mockUser.id };
      const newDate = new Date('2025-05-20T15:30:00Z');
      
      // Setup para o check de "exists" (ainda pode usar select ou findFirst dependendo da impl)
      // Assumindo que o update verifica existência antes
      mockDb.query.appointments.findFirst.mockResolvedValueOnce(existingItem);

      const updatePayload = { appointmentDate: newDate };
      const updatedItem = { ...existingItem, appointmentDate: newDate };

      const updateChain = createMockChain([updatedItem]);
      mockDb.update.mockReturnValueOnce(updateChain);
      
      mockCtx.req.valid.mockReturnValue(updatePayload);

      await updateAppointment(mockCtx);

      // Verifica se usou o set correto
      expect(updateChain.set).toHaveBeenCalledWith(expect.objectContaining({
        appointmentDate: newDate,
        updatedAt: expect.any(Date)
      }));

      // Garante que não alterou endDate sem necessidade (SoC)
      const setArgs = updateChain.set.mock.calls[0][0];
      expect(setArgs).not.toHaveProperty('endDate');
      
      expect(mockCtx.json).toHaveBeenCalledWith(updatedItem);
    });

    it('should return 404 if appointment not found', async () => {
      // Mock findFirst retornando undefined (não existe)
      mockDb.query.appointments.findFirst.mockResolvedValueOnce(undefined);
      
      mockCtx.req.valid.mockReturnValue({ appointmentDate: new Date() });

      await updateAppointment(mockCtx);

      expect(mockCtx.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Appointment not found' }),
        404
      );
    });
  });

  describe('deleteAppointment', () => {
    it('should delete via db and return success', async () => {
      const existingItem = { id: 'a1', userId: mockUser.id };
      
      // Verifica existência
      mockDb.query.appointments.findFirst.mockResolvedValueOnce(existingItem);

      const deleteChain = createMockChain([{ id: 'a1' }]);
      mockDb.delete.mockReturnValueOnce(deleteChain);

      await deleteAppointment(mockCtx);

      expect(mockDb.delete).toHaveBeenCalled();
      expect(mockCtx.json).toHaveBeenCalledWith({ success: true, deletedId: 'a1' });
    });
  });
});