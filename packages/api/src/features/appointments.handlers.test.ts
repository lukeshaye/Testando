/**
 * /packages/api/src/features/appointments/appointments.handlers.test.ts
 *
 * (Executor: LLM 2)
 *
 * Tarefa: 3.3 [Source: 95, 134]
 * O Quê: Testes unitários para os handlers de appointments. [Source: 124]
 * Como (Princípios):
 * - PTE (2.15): Mockar c.var.db (Drizzle) e c.var.user. [Source: 126]
 * - Testar se getAppointments chama db.select().from(appointments). [Source: 127]
 * - Testar se createAppointment chama db.insert(appointments). [Source: 128]
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  deleteAppointment,
} from './appointments.handlers';
// Importamos o schema apenas para referência (como um token) [Source: 62, 112]
import { appointments } from '@repo/db/schema';

// Mock do schema para evitar dependência real
vi.mock('@repo/db/schema', () => ({
  appointments: {
    id: 'appointments.id',
    userId: 'appointments.userId',
    startTime: 'appointments.startTime',
  },
}));

// Mock do drizzle-orm para isolar os testes
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((a, b) => `eq(${a}, ${b})`),
  and: vi.fn((...args) => `and(${args.join(', ')})`),
  desc: vi.fn((col) => `desc(${col})`),
}));

// --- Mocks ---

const mockUser = { id: 'user-123', email: 'test@example.com' }; // [Source: 126]
let mockCtx: any;
let mockDb: any;
let mockReturning: any;
let mockWhere: any;
let mockOrderBy: any;
let mockFrom: any;
let mockValues: any;
let mockSet: any;

beforeEach(() => {
  // Configura timers falsos para `updatedAt: new Date()`
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2025-01-01T10:00:00.000Z'));

  // [Source: 126] Mockar c.var.db (Drizzle mockado)
  // Mockamos a cadeia de funções do Drizzle
  mockReturning = vi.fn();
  mockOrderBy = vi.fn(() => mockReturning);
  mockWhere = vi.fn(() => ({
    returning: mockReturning,
    orderBy: mockOrderBy,
  }));
  mockFrom = vi.fn(() => ({ where: mockWhere }));
  mockValues = vi.fn(() => ({ returning: mockReturning }));
  mockSet = vi.fn(() => ({ where: mockWhere }));

  mockDb = {
    select: vi.fn(() => ({ from: mockFrom })),
    insert: vi.fn(() => ({ values: mockValues })),
    update: vi.fn(() => ({ set: mockSet })),
    delete: vi.fn(() => ({ where: mockWhere })),
  };

  // Mock do Contexto Hono
  mockCtx = {
    var: {
      db: mockDb, // [Source: 126]
      user: mockUser, // [Source: 126]
    },
    req: {
      valid: vi.fn(),
      param: vi.fn(),
    },
    json: vi.fn((data, status) => ({ data, status })),
  };
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

// --- Testes ---

describe('Appointments Handlers', () => {
  describe('getAppointments', () => {
    it('should fetch appointments for the authenticated user', async () => {
      // [Source: 127] Testar se getAppointments chama db.select...
      const fakeData = [{ id: 'a1', name: 'Appt 1' }];
      mockReturning.mockResolvedValue(fakeData);

      await getAppointments(mockCtx);

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockFrom).toHaveBeenCalledWith(appointments);
      expect(mockWhere).toHaveBeenCalledWith(`eq(appointments.userId, user-123)`); // [Source: 113, 137]
      expect(mockOrderBy).toHaveBeenCalledWith(`desc(appointments.startTime)`);
      expect(mockCtx.json).toHaveBeenCalledWith(fakeData);
    });

    it('should handle errors during fetch', async () => {
      mockReturning.mockRejectedValue(new Error('DB Error'));
      await getAppointments(mockCtx);
      expect(mockCtx.json).toHaveBeenCalledWith(
        { error: 'Failed to fetch appointments' },
        500
      );
    });
  });

  describe('getAppointmentById', () => {
    it('should fetch a single appointment by ID for the user', async () => {
      const fakeData = { id: 'a1', name: 'Appt 1' };
      mockReturning.mockResolvedValue([fakeData]);
      mockCtx.req.param.mockReturnValue({ id: 'a1' });

      await getAppointmentById(mockCtx);

      expect(mockFrom).toHaveBeenCalledWith(appointments);
      expect(mockWhere).toHaveBeenCalledWith(
        `and(eq(appointments.id, a1), eq(appointments.userId, user-123))` // [Source: 137]
      );
      expect(mockCtx.json).toHaveBeenCalledWith(fakeData);
    });

    it('should return 404 if appointment not found', async () => {
      mockReturning.mockResolvedValue([]);
      mockCtx.req.param.mockReturnValue({ id: 'a1' });

      await getAppointmentById(mockCtx);

      expect(mockCtx.json).toHaveBeenCalledWith(
        { error: 'Appointment not found' },
        404
      );
    });
  });

  describe('createAppointment', () => {
    it('should create a new appointment for the user', async () => {
      // [Source: 128] Testar se createAppointment chama db.insert...
      const inputData = { name: 'New Appt', startTime: '2025-01-02T10:00:00Z' };
      const createdData = { ...inputData, id: 'a2', userId: 'user-123' };
      mockCtx.req.valid.mockReturnValue(inputData);
      mockReturning.mockResolvedValue([createdData]);

      await createAppointment(mockCtx);

      expect(mockDb.insert).toHaveBeenCalledWith(appointments);
      expect(mockValues).toHaveBeenCalledWith({
        ...inputData,
        userId: 'user-123', // [Source: 120, 137]
      });
      expect(mockCtx.json).toHaveBeenCalledWith(createdData, 201); // [Source: 121]
    });
  });

  describe('updateAppointment', () => {
    it('should update an existing appointment for the user', async () => {
      const updateData = { name: 'Updated Name' };
      const updatedAppointment = { id: 'a1', name: 'Updated Name' };
      mockCtx.req.param.mockReturnValue({ id: 'a1' });
      mockCtx.req.valid.mockReturnValue(updateData);
      mockReturning.mockResolvedValue([updatedAppointment]);

      await updateAppointment(mockCtx);

      expect(mockDb.update).toHaveBeenCalledWith(appointments);
      expect(mockSet).toHaveBeenCalledWith({
        ...updateData,
        updatedAt: new Date('2025-01-01T10:00:00.000Z'), // Testa o timestamp
      });
      expect(mockWhere).toHaveBeenCalledWith(
        `and(eq(appointments.id, a1), eq(appointments.userId, user-123))` // [Source: 137]
      );
      expect(mockCtx.json).toHaveBeenCalledWith(updatedAppointment);
    });

    it('should return 404 if appointment to update is not found', async () => {
      mockReturning.mockResolvedValue([]); // Nada foi atualizado
      mockCtx.req.param.mockReturnValue({ id: 'a1' });
      mockCtx.req.valid.mockReturnValue({ name: 'Updated' });

      await updateAppointment(mockCtx);

      expect(mockCtx.json).toHaveBeenCalledWith(
        { error: 'Appointment not found to update' },
        404
      );
    });
  });

  describe('deleteAppointment', () => {
    it('should delete an appointment for the user', async () => {
      mockCtx.req.param.mockReturnValue({ id: 'a1' });
      mockReturning.mockResolvedValue([{ deletedId: 'a1' }]);

      await deleteAppointment(mockCtx);

      expect(mockDb.delete).toHaveBeenCalledWith(appointments);
      expect(mockWhere).toHaveBeenCalledWith(
        `and(eq(appointments.id, a1), eq(appointments.userId, user-123))` // [Source: 137]
      );
      expect(mockCtx.json).toHaveBeenCalledWith({
        success: true,
        deletedId: 'a1',
      });
    });

    it('should return 404 if appointment to delete is not found', async () => {
      mockReturning.mockResolvedValue([]); // Nada foi deletado
      mockCtx.req.param.mockReturnValue({ id: 'a1' });

      await deleteAppointment(mockCtx);

      expect(mockCtx.json).toHaveBeenCalledWith(
        { error: 'Appointment not found to delete' },
        404
      );
    });
  });
});