/**
 * /packages/api/src/features/appointments/appointments.handlers.test.ts
 *
 * Tarefa: Testes de Handler com Mock de Serviço
 * Correção Aplicada: 
 * 1. Cobertura para atualização parcial (startTime sem appointmentDate) conforme plano de correção.
 * 2. Validação rigorosa de tipos Date (Input String -> Output Date).
 *
 * Princípios:
 * - [cite_start]PTE (2.15): Testamos o contrato exato e cenários de borda (updates parciais)[cite: 101].
 * - [cite_start]SoC (2.5): Handler foca na orquestração, DB mockado[cite: 36].
 * - [cite_start]DIP (2.9): Inversão de dependência total para mocks[cite: 59].
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
      const inputData = {
        clientId: 'c1',
        professionalId: 'p1',
        serviceId: 's1',
        appointmentDate: '2025-01-02', // YYYY-MM-DD
        startTime: '10:00',            // HH:MM
        endTime: '11:00'               // HH:MM
      };

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
    // -----------------------------------------------------------------------
    // CORREÇÃO DO PLANO: Teste para Atualização Parcial
    // O handler deve buscar o agendamento existente para combinar Data + Hora
    // quando apenas a hora (startTime) é enviada.
    // -----------------------------------------------------------------------
    it('should correctly update time when ONLY startTime is provided (partial update)', async () => {
      // Cenário: Usuário muda hora de 10:00 para 15:00, mantendo o dia 2025-01-02
      
      // 1. Setup: DB retorna o agendamento existente (necessário para pegar a data original)
      const existingItem = {
        id: 'a1',
        startTime: new Date('2025-01-02T10:00:00'),
        endTime: new Date('2025-01-02T11:00:00'),
        userId: mockUser.id
      };
      
      const updateDataInput = {
        startTime: '15:00',
        // appointmentDate NÃO é enviado
      };

      const expectedNewStartTime = new Date('2025-01-02T15:00:00');

      const updatedResultItem = {
        ...existingItem,
        startTime: expectedNewStartTime,
        updatedAt: new Date(),
      };

      const selectChain = createMockChain([existingItem]);
      const updateChain = createMockChain([updatedResultItem]);
      
      // Mockamos o SELECT (handler busca o item para validar/completar dados) e depois o UPDATE
      mockDb.select.mockReturnValueOnce(selectChain);
      mockDb.update.mockReturnValueOnce(updateChain);
      mockCtx.req.valid.mockReturnValue(updateDataInput);

      await updateAppointment(mockCtx);

      // Verificações
      expect(mockDb.select).toHaveBeenCalled(); // Garante que o handler buscou o dado original
      
      expect(mockDb.update).toHaveBeenCalled();
      
      // Valida se o .set() recebeu o objeto Date construído corretamente (Data Velha + Hora Nova)
      expect(updateChain.set).toHaveBeenCalledWith(expect.objectContaining({
        startTime: expect.any(Date)
      }));

      const calledArgs = updateChain.set.mock.calls[0][0];
      expect(calledArgs.startTime.toISOString()).toContain('2025-01-02T15:00'); // Hora mudou, data manteve

      expect(mockCtx.json).toHaveBeenCalledWith(updatedResultItem);
    });

    it('should update converting new time strings to Date objects (Full Update)', async () => {
      // Cenário: Usuário muda Data E Hora
      const updateData = {
        appointmentDate: '2025-12-25', // Nova data
        startTime: '14:00',            // Nova hora
        endTime: '15:00',
        status: 'confirmed',
      };

      // O handler pode ou não fazer select aqui dependendo da implementação, 
      // mas vamos mockar caso ele faça verificação de existência.
      const existingItem = { id: 'a1', userId: mockUser.id };
      const selectChain = createMockChain([existingItem]);
      mockDb.select.mockReturnValueOnce(selectChain);

      const expectedStartTime = new Date('2025-12-25T14:00:00');

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

      expect(updateChain.set).toHaveBeenCalledWith(expect.objectContaining({
        status: 'confirmed',
        startTime: expect.any(Date),
        endTime: expect.any(Date)
      }));

      const calledArgs = updateChain.set.mock.calls[0][0];
      expect(calledArgs.startTime.toISOString()).toContain('2025-12-25'); // Data nova respeitada

      expect(mockCtx.json).toHaveBeenCalledWith(resultData);
    });

    it('should return 404 if not found to update', async () => {
      // Simula que o SELECT (verificação) ou o UPDATE retornou vazio
      const selectChain = createMockChain([]); 
      mockDb.select.mockReturnValueOnce(selectChain); // Caso o handler verifique antes
      
      // Caso o handler tente direto update e falhe (dependendo da implementação):
      const updateChain = createMockChain([]);
      mockDb.update.mockReturnValueOnce(updateChain);
      
      mockCtx.req.valid.mockReturnValue({ status: 'cancelled' });

      await updateAppointment(mockCtx);

      // O teste aceita qualquer um dos flows, mas espera o erro 404
      expect(mockCtx.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('not found') }),
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