/**
 * /packages/api/src/features/appointments/appointments.handlers.test.ts
 *
 * (Executor: LLM 2)
 *
 * Tarefa: Refatoração para Testes de Handler com Mock de Serviço (Padrão Ouro)
 * Princípios Aplicados:
 * - PTE (2.15): Testamos o contrato do handler garantindo que ele fala camelCase com o código e o DB.
 * - SoC (2.5): O handler foca na orquestração HTTP, delegando a persistência ao Drizzle.
 * - DIP (2.9): Inversão de dependência via Mocks do Drizzle.
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
// MOCK DO SCHEMA (Simulando Passo 1 e 2 da Refatoração)
// ---------------------------------------------------------------------------
// Define as colunas como objetos Drizzle, onde a chave é camelCase (código)
// e o 'name' interno é snake_case (banco).
const { mockAppointmentsTable } = vi.hoisted(() => {
  return {
    mockAppointmentsTable: {
      id: { name: 'id' },
      userId: { name: 'user_id' },
      clientId: { name: 'client_id' },
      professionalId: { name: 'professional_id' },
      serviceId: { name: 'service_id' },
      startTime: { name: 'start_time' },
      endTime: { name: 'end_time' },
      status: { name: 'status' },
      createdAt: { name: 'created_at' },
      updatedAt: { name: 'updated_at' },
    },
  };
});

vi.mock('@repo/db/schema', () => {
  return {
    appointments: mockAppointmentsTable,
  };
});

// ---------------------------------------------------------------------------
// HELPERS DE TESTE
// ---------------------------------------------------------------------------

// Helper para criar cadeia de mocks do Drizzle (Query Builder Mock)
const createMockChain = (finalValue?: any) => {
  const resolvedValue = finalValue ?? [];

  const chain: any = {
    from: vi.fn(() => chain),
    where: vi.fn(() => chain),
    orderBy: vi.fn(() => chain),
    set: vi.fn(() => chain),
    values: vi.fn(() => chain),
    returning: vi.fn(() => chain),
    // Torna o objeto "thenable" para await
    then: vi.fn((onFulfilled: (v: any) => any, _onRejected?: (e: any) => any) =>
      Promise.resolve(onFulfilled(resolvedValue)),
    ),
  };

  return chain;
};

describe('Appointments Handlers', () => {
  // Mock do Contexto do Hono
  let mockCtx: any;
  const mockUser = { id: 'user-123', email: 'test@example.com' };
  let mockDb: any;

  beforeEach(() => {
    vi.resetAllMocks();

    // Mock do DB injetado no contexto
    mockDb = {
      select: vi.fn(() => createMockChain([])),
      insert: vi.fn(() => createMockChain([])),
      update: vi.fn(() => createMockChain([])),
      delete: vi.fn(() => createMockChain([{ deletedId: 'a1' }])),
    };

    mockCtx = {
      var: {
        user: mockUser,
        db: mockDb,
      },
      req: {
        valid: vi.fn(),
        param: vi.fn((key?: string) => (key ? 'a1' : { id: 'a1' })),
      },
      json: vi.fn((data, status) => ({ data, status })),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // TESTES: Leitura (getAppointments, getAppointmentById)
  // -------------------------------------------------------------------------

  describe('getAppointments', () => {
    it('should fetch appointments via db using camelCase mapping and return 200', async () => {
      // O DB retorna dados já mapeados (simulando o driver do Drizzle)
      const mockData = [
        { id: 'a1', clientId: 'c1', startTime: '2025-01-01T10:00:00Z', userId: mockUser.id },
      ];
      const selectChain = createMockChain(mockData);
      mockDb.select.mockReturnValueOnce(selectChain);

      await getAppointments(mockCtx);

      expect(mockDb.select).toHaveBeenCalled();
      expect(selectChain.from).toHaveBeenCalled();
      // Verifica se o retorno para o cliente mantém o camelCase
      expect(mockCtx.json).toHaveBeenCalledWith(mockData);
    });

    it('should handle errors thrown by the db', async () => {
      const selectChain = createMockChain([]);
      selectChain.orderBy.mockRejectedValueOnce(new Error('Database Error'));
      mockDb.select.mockReturnValueOnce(selectChain);

      await getAppointments(mockCtx);

      expect(mockCtx.json).toHaveBeenCalledWith(
        { error: 'Failed to fetch appointments' },
        500
      );
    });
  });

  describe('getAppointmentById', () => {
    it('should return appointment if found', async () => {
      const mockItem = { id: 'a1', clientId: 'c1', startTime: '2025-01-01T10:00:00Z', userId: mockUser.id };
      const selectChain = createMockChain([mockItem]);
      mockDb.select.mockReturnValueOnce(selectChain);

      await getAppointmentById(mockCtx);

      expect(mockDb.select).toHaveBeenCalled();
      expect(selectChain.where).toHaveBeenCalled();
      expect(mockCtx.json).toHaveBeenCalledWith(mockItem);
    });

    it('should return 404 if not found', async () => {
      const selectChain = createMockChain([]); // Retorno vazio
      mockDb.select.mockReturnValueOnce(selectChain);

      await getAppointmentById(mockCtx);

      expect(mockCtx.json).toHaveBeenCalledWith({ error: 'Appointment not found' }, 404);
    });
  });

  // -------------------------------------------------------------------------
  // TESTES: Escrita (createAppointment, updateAppointment, deleteAppointment)
  // -------------------------------------------------------------------------

  describe('createAppointment', () => {
    it('should create appointment transmitting camelCase payload to db', async () => {
      // Input do Frontend (camelCase)
      const inputData = { 
        clientId: 'c1', 
        professionalId: 'p1', 
        serviceId: 's1', 
        startTime: '2025-01-02T10:00:00Z' 
      };
      
      // Dado retornado pelo DB após insert (com ID e timestamps)
      const createdData = { 
        ...inputData, 
        id: 'a2', 
        userId: mockUser.id, 
        createdAt: new Date(), 
        updatedAt: new Date() 
      };

      const insertChain = createMockChain([createdData]);
      mockDb.insert.mockReturnValueOnce(insertChain);
      mockCtx.req.valid.mockReturnValue(inputData);

      await createAppointment(mockCtx);

      // Verificação Crítica: O handler deve passar camelCase para o .values()
      // O Drizzle cuidará de transformar 'clientId' em 'client_id' internamente
      expect(mockDb.insert).toHaveBeenCalled();
      expect(insertChain.values).toHaveBeenCalledWith({
        ...inputData,
        userId: mockUser.id,
      });
      expect(insertChain.returning).toHaveBeenCalled();
      expect(mockCtx.json).toHaveBeenCalledWith(createdData, 201);
    });
  });

  describe('updateAppointment', () => {
    it('should update appointment using camelCase fields', async () => {
      // Input de atualização
      const updateData = { startTime: '2025-01-02T14:00:00Z', status: 'confirmed' };
      
      // Resultado esperado
      const resultData = { 
        id: 'a1', 
        ...updateData, 
        userId: mockUser.id,
        updatedAt: new Date()
      };

      const updateChain = createMockChain([resultData]);
      mockDb.update.mockReturnValueOnce(updateChain);
      mockCtx.req.valid.mockReturnValue(updateData);

      await updateAppointment(mockCtx);

      // Verificação Crítica: O handler deve passar camelCase para o .set()
      expect(mockDb.update).toHaveBeenCalled();
      expect(updateChain.set).toHaveBeenCalledWith(expect.objectContaining({
        startTime: '2025-01-02T14:00:00Z',
        status: 'confirmed'
      }));
      expect(updateChain.where).toHaveBeenCalled();
      expect(mockCtx.json).toHaveBeenCalledWith(resultData);
    });

    it('should return 404 if not found', async () => {
      const updateChain = createMockChain([]);
      mockDb.update.mockReturnValueOnce(updateChain);
      mockCtx.req.valid.mockReturnValue({ status: 'cancelled' });

      await updateAppointment(mockCtx);

      expect(mockCtx.json).toHaveBeenCalledWith(
        { error: 'Appointment not found to update' }, 
        404
      );
    });
  });

  describe('deleteAppointment', () => {
    it('should delete via db and return success', async () => {
      const deleteChain = createMockChain([{ id: 'a1' }]);
      mockDb.delete.mockReturnValueOnce(deleteChain);

      await deleteAppointment(mockCtx);

      expect(mockDb.delete).toHaveBeenCalled();
      expect(deleteChain.where).toHaveBeenCalled();
      expect(mockCtx.json).toHaveBeenCalledWith({ success: true, deletedId: 'a1' });
    });

    it('should return 404 if not found', async () => {
      const deleteChain = createMockChain([]);
      mockDb.delete.mockReturnValueOnce(deleteChain);

      await deleteAppointment(mockCtx);

      expect(mockCtx.json).toHaveBeenCalledWith(
        { error: 'Appointment not found to delete' }, 
        404
      );
    });
  });
});