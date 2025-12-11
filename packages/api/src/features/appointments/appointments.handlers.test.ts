/**
 * /packages/api/src/features/appointments/appointments.handlers.test.ts
 *
 * Tarefa: Testes de Handler com Simplificação Radical (Opção B)
 * Correção Aplicada: 
 * 1. Ajuste de Schema: startTime/endTime -> appointmentDate/endDate.
 * 2. Suporte a Joins no Mock DB.
 * 3. Validação de persistência direta de objetos Date.
 *
 * Princípios:
 * - PTE (2.15): O teste reflete o contrato real do Schema (appointmentDate).
 * - KISS (2.3): Mapeamento direto de propriedades, sem lógica de conversão.
 * - SoC (2.5)[cite: 36]: Handler foca apenas em orquestrar a persistência.
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
      // CORREÇÃO: Alinhado com o Schema real (appointmentDate/endDate)
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
    // Adicione mocks de clients/services se necessário para os Joins
    clients: { id: { name: 'id' }, name: { name: 'name' } },
    services: { id: { name: 'id' }, name: { name: 'name' } },
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
    // CORREÇÃO: Suporte a Joins exigidos pelo plano de correção
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
  // LEITURA (Queries)
  // -------------------------------------------------------------------------

  describe('getAppointments', () => {
    it('should fetch appointments via db and return 200', async () => {
      const mockData = [
        {
          id: 'a1',
          // CORREÇÃO: Usando a propriedade correta do schema
          appointmentDate: new Date('2025-01-01T10:00:00Z'),
          userId: mockUser.id,
          // Simulando o retorno com Join (opcional, mas bom para consistência)
          clientName: 'João', 
        },
      ];
      const selectChain = createMockChain(mockData);
      mockDb.select.mockReturnValueOnce(selectChain);

      await getAppointments(mockCtx);

      expect(mockDb.select).toHaveBeenCalled();
      // Se o handler usar joins, podemos verificar:
      // expect(selectChain.leftJoin).toHaveBeenCalled(); 
      expect(mockCtx.json).toHaveBeenCalledWith(mockData);
    });

    it('should handle errors', async () => {
      const selectChain = createMockChain([]);
      // Mockando erro no orderBy ou em qualquer parte da cadeia
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
      const mockItem = { id: 'a1', appointmentDate: new Date() };
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
  // ESCRITA (Comandos) - ATUALIZADOS PARA SCHEMA CORRETO
  // -------------------------------------------------------------------------

  describe('createAppointment', () => {
    it('should persist Date objects directly (mapping input -> appointmentDate/endDate)', async () => {
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
        // CORREÇÃO: O retorno do DB usa as colunas corretas
        appointmentDate: inputDate, 
        endDate: inputEndDate,
        userId: mockUser.id,
      };

      const insertChain = createMockChain([createdData]);
      mockDb.insert.mockReturnValueOnce(insertChain);
      mockCtx.req.valid.mockReturnValue(inputPayload);

      await createAppointment(mockCtx);

      // Verificação PTE (2.15): O handler deve usar as chaves corretas do schema
      expect(mockDb.insert).toHaveBeenCalled();
      
      expect(insertChain.values).toHaveBeenCalledWith(expect.objectContaining({
        clientId: 'c1',
        userId: mockUser.id,
        // CORREÇÃO: Verificando chaves corretas do Schema
        appointmentDate: inputDate, 
        endDate: inputEndDate
      }));

      expect(mockCtx.json).toHaveBeenCalledWith(createdData, 201);
    });
  });

  describe('updateAppointment', () => {
    it('should update appointmentDate directly from input', async () => {
      const existingItem = { id: 'a1', userId: mockUser.id };
      
      const newDate = new Date('2025-05-20T15:30:00Z');
      const updatePayload = {
        appointmentDate: newDate, 
      };

      // CORREÇÃO: Mockando retorno com chave correta
      const updatedItem = { ...existingItem, appointmentDate: newDate };

      const selectChain = createMockChain([existingItem]);
      mockDb.select.mockReturnValueOnce(selectChain);

      const updateChain = createMockChain([updatedItem]);
      mockDb.update.mockReturnValueOnce(updateChain);
      
      mockCtx.req.valid.mockReturnValue(updatePayload);

      await updateAppointment(mockCtx);

      expect(mockDb.update).toHaveBeenCalled();

      // KISS (2.3): Mapeamento direto input -> db field
      expect(updateChain.set).toHaveBeenCalledWith(expect.objectContaining({
        appointmentDate: newDate, // CORREÇÃO: Usando appointmentDate
        updatedAt: expect.any(Date)
      }));

      // Garante que endDate não foi tocado
      const setArgs = updateChain.set.mock.calls[0][0];
      expect(setArgs).not.toHaveProperty('endDate');
      
      expect(mockCtx.json).toHaveBeenCalledWith(updatedItem);
    });

    it('should update endDate directly from input', async () => {
      const existingItem = { id: 'a1', userId: mockUser.id };
      
      const newEndDate = new Date('2025-05-20T16:00:00Z');
      const updatePayload = {
        endDate: newEndDate, 
      };

      const selectChain = createMockChain([existingItem]);
      mockDb.select.mockReturnValueOnce(selectChain);

      // CORREÇÃO: Usando endDate
      const updateChain = createMockChain([{ ...existingItem, endDate: newEndDate }]);
      mockDb.update.mockReturnValueOnce(updateChain);
      
      mockCtx.req.valid.mockReturnValue(updatePayload);

      await updateAppointment(mockCtx);

      expect(updateChain.set).toHaveBeenCalledWith(expect.objectContaining({
        endDate: newEndDate // CORREÇÃO: Usando endDate
      }));
    });

    it('should return 404 if appointment not found', async () => {
      const selectChain = createMockChain([]); 
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