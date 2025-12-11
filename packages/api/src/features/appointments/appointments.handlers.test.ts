/**
 * /packages/api/src/features/appointments/appointments.handlers.test.ts
 *
 * Tarefa: Testes de Handler com Mock de Serviço
 * Correção Aplicada: Remoção de dependência de 'duration', validação de conversão String -> Date.
 *
 * Princípios:
 * - PTE (2.15): Testamos o contrato exato (Input String -> Output Date).
 * - SoC (2.5): Handler foca na orquestração, DB mockado.
 * - DIP (2.9): Inversão de dependência total.
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
// 1. MOCK DO SCHEMA E DB (DIP - Princípio 2.9)
// ---------------------------------------------------------------------------
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
// 2. HELPERS DE TESTE (DRY - Princípio 2.2)
// ---------------------------------------------------------------------------

const createMockChain = (finalValue?: any) => {
  const resolvedValue = finalValue ?? [];

  const chain: any = {
    from: vi.fn(() => chain),
    where: vi.fn(() => chain),
    orderBy: vi.fn(() => chain),
    set: vi.fn(() => chain),
    values: vi.fn(() => chain),
    returning: vi.fn(() => chain),
    // Simula a resolução da Promise ao final da cadeia do Drizzle
    then: vi.fn((onFulfilled: (v: any) => any, _onRejected?: (e: any) => any) =>
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
        valid: vi.fn(), // Simula o validador Zod
        param: vi.fn((key?: string) => (key ? 'a1' : { id: 'a1' })),
      },
      json: vi.fn((data, status) => ({ data, status })),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // TESTES: Leitura (Queries - CQRS 2.12)
  // -------------------------------------------------------------------------

  describe('getAppointments', () => {
    it('should fetch appointments via db and return 200', async () => {
      // O DB retorna objetos Date reais
      const mockData = [
        {
          id: 'a1',
          clientId: 'c1',
          startTime: new Date('2025-01-01T10:00:00Z'),
          userId: mockUser.id,
        },
      ];
      const selectChain = createMockChain(mockData);
      mockDb.select.mockReturnValueOnce(selectChain);

      await getAppointments(mockCtx);

      expect(mockDb.select).toHaveBeenCalled();
      expect(selectChain.from).toHaveBeenCalled();
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
      const mockItem = {
        id: 'a1',
        clientId: 'c1',
        startTime: new Date('2025-01-01T10:00:00Z'),
        userId: mockUser.id,
      };
      const selectChain = createMockChain([mockItem]);
      mockDb.select.mockReturnValueOnce(selectChain);

      await getAppointmentById(mockCtx);

      expect(mockDb.select).toHaveBeenCalled();
      expect(selectChain.where).toHaveBeenCalled();
      expect(mockCtx.json).toHaveBeenCalledWith(mockItem);
    });

    it('should return 404 if not found', async () => {
      const selectChain = createMockChain([]);
      mockDb.select.mockReturnValueOnce(selectChain);

      await getAppointmentById(mockCtx);

      expect(mockCtx.json).toHaveBeenCalledWith(
        { error: 'Appointment not found' },
        404
      );
    });
  });

  // -------------------------------------------------------------------------
  // TESTES: Escrita (Comandos - CQRS 2.12)
  // Correção Crítica: Valida a conversão de input String para DB Date
  // -------------------------------------------------------------------------

  describe('createAppointment', () => {
    it('should accept HH:MM strings and persist Date objects (ignoring duration)', async () => {
      // Input simulado (pós-validação Zod): Strings separadas
      // Nota: 'duration' NÃO é passado aqui, conforme correção do plano.
      const inputData = {
        clientId: 'c1',
        professionalId: 'p1',
        serviceId: 's1',
        appointmentDate: '2025-01-02', // YYYY-MM-DD
        startTime: '10:00',            // HH:MM
        endTime: '11:00'               // HH:MM
      };

      // O que esperamos que seja salvo no banco (Date Objects)
      // O handler deve combinar a data com a hora
      const expectedStartTime = new Date('2025-01-02T10:00:00');
      const expectedEndTime = new Date('2025-01-02T11:00:00');

      const createdData = {
        id: 'a2',
        clientId: inputData.clientId,
        professionalId: inputData.professionalId,
        serviceId: inputData.serviceId,
        userId: mockUser.id,
        startTime: expectedStartTime,
        endTime: expectedEndTime,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const insertChain = createMockChain([createdData]);
      mockDb.insert.mockReturnValueOnce(insertChain);
      mockCtx.req.valid.mockReturnValue(inputData);

      await createAppointment(mockCtx);

      expect(mockDb.insert).toHaveBeenCalled();

      // VERIFICAÇÃO CRÍTICA (PTE 2.15):
      // Garante que o handler transformou as strings '10:00'/'11:00' em objetos Date
      expect(insertChain.values).toHaveBeenCalledWith(expect.objectContaining({
        clientId: 'c1',
        userId: mockUser.id,
        startTime: expect.any(Date), // Deve ser Date, não string
        endTime: expect.any(Date)    // Deve ser Date, não string
      }));

      // Verificação de valor (toISOString garante que a data base foi respeitada)
      const calledArgs = insertChain.values.mock.calls[0][0];
      expect(calledArgs.startTime.toISOString()).toContain('2025-01-02');
      expect(calledArgs.endTime.toISOString()).toContain('2025-01-02');

      expect(insertChain.returning).toHaveBeenCalled();
      expect(mockCtx.json).toHaveBeenCalledWith(createdData, 201);
    });
  });

  describe('updateAppointment', () => {
    it('should update converting new time strings to Date objects', async () => {
      // Input de atualização
      const updateData = {
        appointmentDate: '2025-01-02',
        startTime: '14:00',
        endTime: '15:00',
        status: 'confirmed',
      };

      const expectedStartTime = new Date('2025-01-02T14:00:00');

      const resultData = {
        id: 'a1',
        startTime: expectedStartTime,
        status: 'confirmed',
        userId: mockUser.id,
        updatedAt: new Date(),
      };

      const updateChain = createMockChain([resultData]);
      mockDb.update.mockReturnValueOnce(updateChain);
      mockCtx.req.valid.mockReturnValue(updateData);

      await updateAppointment(mockCtx);

      expect(mockDb.update).toHaveBeenCalled();

      // Valida se o .set() recebeu objetos Date construídos corretamente
      expect(updateChain.set).toHaveBeenCalledWith(expect.objectContaining({
        status: 'confirmed',
        startTime: expect.any(Date),
        endTime: expect.any(Date)
      }));

      const calledArgs = updateChain.set.mock.calls[0][0];
      expect(calledArgs.startTime).toBeInstanceOf(Date);
      expect(calledArgs.startTime.toISOString()).toContain('2025-01-02');

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