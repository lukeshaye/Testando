/**
 * /packages/api/src/features/appointments/appointments.handlers.test.ts
 *
 * Tarefa: Testes de Handler com Simplificação Radical (Opção B)
 * Correção Aplicada: 
 * 1. Remoção de inputs string ('10:00'). Agora usamos objetos Date completos.
 * 2. Eliminação da lógica de "merge" de datas. Testamos o repasse direto (Input Date -> DB Date).
 *
 * Princípios:
 * [cite_start]- [cite: 101] PTE (2.15): Testamos o novo contrato simplificado (Date In -> Date Out).
 * [cite_start]- [cite: 22] KISS (2.3): Removemos a complexidade de testes de fuso horário/concatenação.
 * [cite_start]- [cite: 36] SoC (2.5): Handler foca apenas em orquestrar a persistência.
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
// 2. HELPERS DE TESTE
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
  // LEITURA (Queries) - Mantidos praticamente iguais
  // -------------------------------------------------------------------------

  describe('getAppointments', () => {
    it('should fetch appointments via db and return 200', async () => {
      const mockData = [
        {
          id: 'a1',
          startTime: new Date('2025-01-01T10:00:00Z'),
          userId: mockUser.id,
        },
      ];
      const selectChain = createMockChain(mockData);
      mockDb.select.mockReturnValueOnce(selectChain);

      await getAppointments(mockCtx);

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockCtx.json).toHaveBeenCalledWith(mockData);
    });

    it('should handle errors', async () => {
      const selectChain = createMockChain([]);
      selectChain.orderBy.mockRejectedValueOnce(new Error('DB Error'));
      mockDb.select.mockReturnValueOnce(selectChain);

      await getAppointments(mockCtx);

      expect(mockCtx.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) }),
        500
      );
    });
  });

  describe('getAppointmentById', () => {
    it('should return appointment if found', async () => {
      const mockItem = { id: 'a1' };
      const selectChain = createMockChain([mockItem]);
      mockDb.select.mockReturnValueOnce(selectChain);

      await getAppointmentById(mockCtx);

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
  // ESCRITA (Comandos) - ATUALIZADOS PARA OPÇÃO B (Simplificação)
  // -------------------------------------------------------------------------

  describe('createAppointment', () => {
    it('should persist Date objects directly (mapping appointmentDate -> startTime)', async () => {
      // 1. Setup: O input agora já vem com Dates completos (graças ao Zod e Frontend corrigido)
      const inputDate = new Date('2025-01-02T10:00:00Z');
      const inputEndDate = new Date('2025-01-02T11:00:00Z');
      
      const inputPayload = {
        clientId: 'c1',
        professionalId: 'p1',
        serviceId: 's1',
        appointmentDate: inputDate, // Date completo
        endDate: inputEndDate,      // Date completo
      };

      const createdData = {
        id: 'a2',
        ...inputPayload,
        startTime: inputDate, // O que foi salvo no banco
        endTime: inputEndDate,
        userId: mockUser.id,
      };

      const insertChain = createMockChain([createdData]);
      mockDb.insert.mockReturnValueOnce(insertChain);
      mockCtx.req.valid.mockReturnValue(inputPayload);

      await createAppointment(mockCtx);

      // 2. Verificação (PTE 2.15):
      // O handler deve pegar appointmentDate e jogar na coluna startTime SEM tentar formatar string
      expect(mockDb.insert).toHaveBeenCalled();
      
      expect(insertChain.values).toHaveBeenCalledWith(expect.objectContaining({
        clientId: 'c1',
        userId: mockUser.id,
        startTime: inputDate, // Deve ser exatamente o objeto Date recebido
        endTime: inputEndDate
      }));

      // Não deve haver menção a strings de hora '10:00'
      expect(mockCtx.json).toHaveBeenCalledWith(createdData, 201);
    });
  });

  describe('updateAppointment', () => {
    it('should update startTime directly from appointmentDate input', async () => {
      // Cenário: Frontend manda nova data completa. Backend apenas salva.
      const existingItem = { id: 'a1', userId: mockUser.id };
      
      const newDate = new Date('2025-05-20T15:30:00Z');
      const updatePayload = {
        appointmentDate: newDate, // Nova data e hora
      };

      const updatedItem = { ...existingItem, startTime: newDate };

      // Mock Select (Verificação de existência)
      const selectChain = createMockChain([existingItem]);
      mockDb.select.mockReturnValueOnce(selectChain);

      // Mock Update
      const updateChain = createMockChain([updatedItem]);
      mockDb.update.mockReturnValueOnce(updateChain);
      
      mockCtx.req.valid.mockReturnValue(updatePayload);

      await updateAppointment(mockCtx);

      expect(mockDb.update).toHaveBeenCalled();

      // KISS (2.3): O handler não tenta mais combinar data velha + hora nova.
      // Ele confia que o 'appointmentDate' recebido é a verdade absoluta.
      expect(updateChain.set).toHaveBeenCalledWith(expect.objectContaining({
        startTime: newDate, // Mapeou appointmentDate -> startTime
        updatedAt: expect.any(Date)
      }));

      // Garante que endTime não foi tocado pois não foi enviado
      const setArgs = updateChain.set.mock.calls[0][0];
      expect(setArgs).not.toHaveProperty('endTime');
      
      expect(mockCtx.json).toHaveBeenCalledWith(updatedItem);
    });

    it('should update endTime directly from endDate input', async () => {
      const existingItem = { id: 'a1', userId: mockUser.id };
      
      const newEndDate = new Date('2025-05-20T16:00:00Z');
      const updatePayload = {
        endDate: newEndDate, 
      };

      const selectChain = createMockChain([existingItem]);
      mockDb.select.mockReturnValueOnce(selectChain);

      const updateChain = createMockChain([{ ...existingItem, endTime: newEndDate }]);
      mockDb.update.mockReturnValueOnce(updateChain);
      
      mockCtx.req.valid.mockReturnValue(updatePayload);

      await updateAppointment(mockCtx);

      expect(updateChain.set).toHaveBeenCalledWith(expect.objectContaining({
        endTime: newEndDate // Mapeou endDate -> endTime
      }));
    });

    it('should return 404 if appointment not found', async () => {
      const selectChain = createMockChain([]); // Retorna vazio
      mockDb.select.mockReturnValueOnce(selectChain);
      
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
      const deleteChain = createMockChain([{ id: 'a1' }]);
      mockDb.delete.mockReturnValueOnce(deleteChain);

      await deleteAppointment(mockCtx);

      expect(mockDb.delete).toHaveBeenCalled();
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