/**
 * /packages/api/src/features/settings/settings.handlers.test.ts
 *
 * Testes unitários para os handlers de 'settings'.
 *
 * O Quê (Lógica): Testes unitários para os handlers.
 * Como (Princípios):
 * PTE (2.15): Mockar c.var.db (Drizzle mockado) e c.var.user.
 * Testar se os handlers chamam os métodos corretos do db (ex: db.insert, db.select).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Context } from 'hono';
import { eq } from 'drizzle-orm';
// Importa os handlers que serão testados
import { getSettings, updateSettings } from './settings.handlers';
// Importa os tipos Hono (Tarefa 3.4)
import { Variables, AuthUser } from '../../types';

// Mock do schema usando vi.hoisted() para evitar problemas de hoisting
const { mockSettingsTable } = vi.hoisted(() => {
  return {
    mockSettingsTable: {
      userId: { name: 'user_id', table: { name: 'settings' } },
      id: { name: 'id', table: { name: 'settings' } },
    },
  };
});

vi.mock('@repo/db/schema', () => {
  return {
    settings: mockSettingsTable,
  };
});

// Agora importamos o settings mockado
import { settings } from '@repo/db/schema';

// Mock do usuário autenticado 
const mockUser: AuthUser = {
  id: 'user-123',
  email: 'test@example.com',
};

// Mock dos dados de settings
const mockSettings = {
  id: 'setting-abc',
  userId: 'user-123',
  workStartTime: '09:00',
  workEndTime: '18:00',
  workDays: [1, 2, 3, 4, 5],
};

// Mock do cliente DB (Drizzle) 
// Criamos um mock encadeado para simular a API fluente do Drizzle
const mockDb = {
  select: vi.fn(() => mockDb),
  from: vi.fn(() => mockDb),
  where: vi.fn(() => mockDb),
  limit: vi.fn(() => Promise.resolve([mockSettings])), // Mock para getSettings
  insert: vi.fn(() => mockDb),
  values: vi.fn(() => mockDb),
  onConflictDoUpdate: vi.fn(() => mockDb),
  returning: vi.fn(() => Promise.resolve([mockSettings])), // Mock para updateSettings
};

// Mock do contexto Hono
const mockContext = {
  var: {
    user: mockUser,
    db: mockDb,
  } as Variables, // Tipagem forte
  req: {
    valid: vi.fn(),
  },
  json: vi.fn(),
} as unknown as Context<{ Variables: Variables }>;

// Reseta os mocks antes de cada teste
beforeEach(() => {
  vi.clearAllMocks();

  // Reseta os mocks encadeados do DB
  mockDb.select.mockReturnValue(mockDb);
  mockDb.from.mockReturnValue(mockDb);
  mockDb.where.mockReturnValue(mockDb);
  mockDb.limit.mockResolvedValue([mockSettings]);
  mockDb.insert.mockReturnValue(mockDb);
  mockDb.values.mockReturnValue(mockDb);
  mockDb.onConflictDoUpdate.mockReturnValue(mockDb);
  mockDb.returning.mockResolvedValue([mockSettings]);
});

describe('settings.handlers', () => {
  describe('getSettings', () => {
    it('should fetch settings for the authenticated user', async () => {
      await getSettings(mockContext);

      // (Adaptado) Testa a chamada do Drizzle
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalledWith(settings);
      expect(mockDb.where).toHaveBeenCalledWith(eq(settings.userId, mockUser.id));
      expect(mockDb.limit).toHaveBeenCalledWith(1);

      // Verifica a resposta
      expect(mockContext.json).toHaveBeenCalledWith(mockSettings);
    });

    it('should return null if no settings are found', async () => {
      // Sobrescreve o mock para retornar array vazio
      mockDb.limit.mockResolvedValueOnce([]);

      await getSettings(mockContext);

      // Verifica a resposta
      expect(mockContext.json).toHaveBeenCalledWith(null);
    });
  });

  describe('updateSettings (Upsert)', () => {
    it('should upsert settings for the authenticated user', async () => {
      const inputData = {
        workStartTime: '08:00',
        workEndTime: '17:00',
      };
      // Mocka o body validado
      (mockContext.req.valid as vi.Mock).mockReturnValue(inputData);

      await updateSettings(mockContext);

      // Testa a chamada do Drizzle (insert/upsert)
      expect(mockDb.insert).toHaveBeenCalledWith(settings);
      expect(mockDb.values).toHaveBeenCalledWith({
        ...inputData,
        userId: mockUser.id, // Verifica se o userId foi injetado
      });
      expect(mockDb.onConflictDoUpdate).toHaveBeenCalledWith({
        target: settings.userId,
        set: inputData,
      });
      expect(mockDb.returning).toHaveBeenCalled();

      // Verifica a resposta
      expect(mockContext.json).toHaveBeenCalledWith(mockSettings, 200);
    });
  });
});