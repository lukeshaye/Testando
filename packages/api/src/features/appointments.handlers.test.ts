/**
 * /packages/api/src/features/appointments/appointments.handlers.test.ts
 *
 * (Executor: LLM 2)
 *
 * Tarefa: Refatoração para Testes de Handler com Mock de Serviço
 * Princípios Aplicados:
 * - PTE (2.15): Testamos o contrato do handler isolando a lógica de negócios (Service).
 * - SoC (2.5): O handler lida com HTTP, o serviço (mockado) lida com a regra de negócio.
 * - DIP (2.9): O teste depende da abstração do serviço, não da implementação do banco[cite: 59].
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  deleteAppointment,
} from './appointments.handlers';

// O handler não usa um serviço separado, ele usa Drizzle diretamente
// Vamos mockar o Drizzle como nos outros testes

// Mock do schema usando vi.hoisted() para evitar problemas de hoisting
const { mockAppointmentsTable } = vi.hoisted(() => {
  return {
    mockAppointmentsTable: {
      id: { name: 'id', table: { name: 'appointments' } },
      userId: { name: 'user_id', table: { name: 'appointments' } },
      startTime: { name: 'start_time', table: { name: 'appointments' } },
    },
  };
});

vi.mock('@repo/db/schema', () => {
  return {
    appointments: mockAppointmentsTable,
  };
});

// Helper para criar cadeia de mocks do Drizzle
// A cadeia precisa ser "thenable" para que `await` funcione mesmo que o último
// método chamado seja `where`, `orderBy` ou `returning`.
const createMockChain = (finalValue?: any) => {
  const resolvedValue = finalValue ?? [];

  const chain: any = {
    from: vi.fn(() => chain),
    where: vi.fn(() => chain),
    orderBy: vi.fn(() => chain),
    set: vi.fn(() => chain),
    values: vi.fn(() => chain),
    returning: vi.fn(() => chain),
    // Torna o objeto "thenable" para que `await chain` resolva para `resolvedValue`
    then: vi.fn((onFulfilled: (v: any) => any, _onRejected?: (e: any) => any) =>
      Promise.resolve(onFulfilled(resolvedValue)),
    ),
  };

  return chain;
};

describe('Appointments Handlers', () => {
  // Mock do Contexto do Hono (Request/Response)
  let mockCtx: any;
  const mockUser = { id: 'user-123', email: 'test@example.com' };
  let mockDb: any;

  beforeEach(() => {
    // Resetamos os mocks antes de cada teste
    vi.resetAllMocks();

    // Criar novo mock do DB para cada teste
    mockDb = {
      select: vi.fn(() => createMockChain([])),
      insert: vi.fn(() => createMockChain([{ id: 'a1', userId: mockUser.id }])),
      update: vi.fn(() => createMockChain([{ id: 'a1', userId: mockUser.id }])),
      delete: vi.fn(() => createMockChain([{ deletedId: 'a1' }])),
    };

    mockCtx = {
      var: {
        user: mockUser,
        db: mockDb,
      },
      req: {
        valid: vi.fn(),
        param: vi.fn((key?: string) => key ? 'a1' : { id: 'a1' }),
      },
      // Mock do json para capturar a resposta e o status code
      json: vi.fn((data, status) => ({ data, status })),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getAppointments', () => {
    it('should fetch appointments via db and return 200', async () => {
      const mockData = [{ id: 'a1', name: 'Appt 1', userId: 'user-123' }];
      const selectChain = createMockChain(mockData);
      mockDb.select.mockReturnValueOnce(selectChain);

      await getAppointments(mockCtx);

      expect(mockDb.select).toHaveBeenCalled();
      expect(selectChain.from).toHaveBeenCalled();
      expect(selectChain.where).toHaveBeenCalled();
      expect(selectChain.orderBy).toHaveBeenCalled();
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
      const mockItem = { id: 'a1', name: 'Appt 1', userId: mockUser.id };
      const selectChain = createMockChain([mockItem]);
      mockDb.select.mockReturnValueOnce(selectChain);

      await getAppointmentById(mockCtx);

      expect(mockDb.select).toHaveBeenCalled();
      expect(selectChain.from).toHaveBeenCalled();
      expect(selectChain.where).toHaveBeenCalled();
      expect(mockCtx.json).toHaveBeenCalledWith(mockItem);
    });

    it('should return 404 if not found', async () => {
      const selectChain = createMockChain([]);
      mockDb.select.mockReturnValueOnce(selectChain);

      await getAppointmentById(mockCtx);

      expect(mockCtx.json).toHaveBeenCalledWith({ error: 'Appointment not found' }, 404);
    });
  });

  describe('createAppointment', () => {
    it('should create appointment via db and return 201', async () => {
      const inputData = { name: 'New Appt', startTime: '2025-01-02T10:00:00Z' };
      const createdData = { ...inputData, id: 'a2', userId: mockUser.id };
      const insertChain = createMockChain([createdData]);
      mockDb.insert.mockReturnValueOnce(insertChain);
      mockCtx.req.valid.mockReturnValue(inputData);

      await createAppointment(mockCtx);

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
    it('should update appointment via db', async () => {
      const updateData = { name: 'Updated Name' };
      const resultData = { id: 'a1', ...updateData, userId: mockUser.id };
      const updateChain = createMockChain([resultData]);
      mockDb.update.mockReturnValueOnce(updateChain);
      mockCtx.req.valid.mockReturnValue(updateData);

      await updateAppointment(mockCtx);

      expect(mockDb.update).toHaveBeenCalled();
      expect(updateChain.set).toHaveBeenCalled();
      expect(updateChain.where).toHaveBeenCalled();
      expect(updateChain.returning).toHaveBeenCalled();
      expect(mockCtx.json).toHaveBeenCalledWith(resultData);
    });

    it('should return 404 if not found', async () => {
      const updateChain = createMockChain([]);
      mockDb.update.mockReturnValueOnce(updateChain);
      mockCtx.req.valid.mockReturnValue({});

      await updateAppointment(mockCtx);

      expect(mockCtx.json).toHaveBeenCalledWith(
        { error: 'Appointment not found to update' }, 
        404
      );
    });
  });

  describe('deleteAppointment', () => {
    it('should delete via db and return success', async () => {
      const deleteChain = createMockChain([{ deletedId: 'a1' }]);
      mockDb.delete.mockReturnValueOnce(deleteChain);

      await deleteAppointment(mockCtx);

      expect(mockDb.delete).toHaveBeenCalled();
      expect(deleteChain.where).toHaveBeenCalled();
      expect(deleteChain.returning).toHaveBeenCalled();
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