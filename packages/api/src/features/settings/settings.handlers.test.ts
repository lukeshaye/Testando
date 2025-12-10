/**
 * /packages/api/src/features/settings/settings.handlers.test.ts
 *
 * Testes unitários para os handlers de 'settings'.
 *
 * O Quê (Lógica): Testes unitários para os handlers.
 * Como (Princípios):
 * PTE (2.15): Mockar c.var.db (Drizzle mockado) e c.var.user.
 * Testar se os handlers chamam os métodos corretos do db mantendo o padrão camelCase (Gold Standard).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Context } from 'hono';
import { eq } from 'drizzle-orm';
// Importa os handlers que serão testados
import { getSettings, updateSettings } from './settings.handlers';
// Importa os tipos Hono (Tarefa 3.4)
import { Variables, AuthUser } from '../../types';

// ---------------------------------------------------------------------
// 1. MOCK DO SCHEMA (A Ponte - Passo 1 do Refactor)
// ---------------------------------------------------------------------
// Usamos vi.hoisted para garantir que o mock seja criado antes dos imports.
// Simulamos o comportamento do Drizzle onde a chave do objeto é camelCase
// mas a propriedade 'name' interna aponta para o snake_case do banco.
const { mockSettingsTable } = vi.hoisted(() => {
  return {
    mockSettingsTable: {
      id: { name: 'id', table: { name: 'settings' } },
      userId: { name: 'user_id', table: { name: 'settings' } }, // Mapeamento explícito
      workStartTime: { name: 'work_start_time', table: { name: 'settings' } },
      workEndTime: { name: 'work_end_time', table: { name: 'settings' } },
      workDays: { name: 'work_days', table: { name: 'settings' } },
      createdAt: { name: 'created_at', table: { name: 'settings' } }, // Auditoria
      updatedAt: { name: 'updated_at', table: { name: 'settings' } }, // Auditoria
    },
  };
});

vi.mock('@repo/db/schema', () => {
  return {
    settings: mockSettingsTable,
  };
});

// Importamos o settings mockado
import { settings } from '@repo/db/schema';

// ---------------------------------------------------------------------
// 2. MOCK DOS DADOS (O Contrato - Passo 2 do Refactor)
// ---------------------------------------------------------------------
const mockUser: AuthUser = {
  id: 'user-123',
  email: 'test@example.com',
};

// O objeto retornado pelo Drizzle já vem transformado para camelCase
// graças ao mapeamento do schema.
const mockSettings = {
  id: 'setting-abc',
  userId: 'user-123',
  workStartTime: '09:00',
  workEndTime: '18:00',
  workDays: [1, 2, 3, 4, 5],
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ---------------------------------------------------------------------
// 3. MOCK DO DB (Simulando Drizzle Query Builder)
// ---------------------------------------------------------------------
const mockDb = {
  select: vi.fn(() => mockDb),
  from: vi.fn(() => mockDb),
  where: vi.fn(() => mockDb),
  limit: vi.fn(() => Promise.resolve([mockSettings])),
  insert: vi.fn(() => mockDb),
  values: vi.fn(() => mockDb),
  onConflictDoUpdate: vi.fn(() => mockDb),
  returning: vi.fn(() => Promise.resolve([mockSettings])),
};

// Mock do contexto Hono
const mockContext = {
  var: {
    user: mockUser,
    db: mockDb,
  } as Variables,
  req: {
    valid: vi.fn(),
  },
  json: vi.fn(),
} as unknown as Context<{ Variables: Variables }>;

// Reseta os mocks antes de cada teste
beforeEach(() => {
  vi.clearAllMocks();

  // Reseta retornos padrão (Encadeamento Fluent API)
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

      // Verificação PTE: Assegura que o handler usa o objeto do schema
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalledWith(settings);
      expect(mockDb.where).toHaveBeenCalledWith(eq(settings.userId, mockUser.id));
      expect(mockDb.limit).toHaveBeenCalledWith(1);

      // Verifica se a resposta mantém o camelCase (sem tradução manual reversa necessária)
      expect(mockContext.json).toHaveBeenCalledWith(mockSettings);
    });

    it('should return null if no settings are found', async () => {
      mockDb.limit.mockResolvedValueOnce([]);

      await getSettings(mockContext);

      expect(mockContext.json).toHaveBeenCalledWith(null);
    });
  });

  describe('updateSettings (Upsert)', () => {
    it('should upsert settings using camelCase properties', async () => {
      // Input vindo do Zod (Passo 2 do plano: Schemas em camelCase)
      const inputData = {
        workStartTime: '08:00',
        workEndTime: '17:00',
        workDays: [1, 2, 3, 4, 5],
      };
      
      (mockContext.req.valid as vi.Mock).mockReturnValue(inputData);

      await updateSettings(mockContext);

      // Verificação Crítica do "Padrão Ouro":
      // O handler deve passar os dados em camelCase para o .values().
      // O Drizzle (simulado) é quem traduziria para snake_case internamente baseada no schema.
      // Se houvesse conversão manual no handler, este teste falharia ou seria redundante.
      expect(mockDb.insert).toHaveBeenCalledWith(settings);
      expect(mockDb.values).toHaveBeenCalledWith({
        ...inputData,
        userId: mockUser.id,
      });

      expect(mockDb.onConflictDoUpdate).toHaveBeenCalledWith({
        target: settings.userId,
        set: inputData, // Passa o objeto camelCase direto
      });
      
      expect(mockDb.returning).toHaveBeenCalled();
      expect(mockContext.json).toHaveBeenCalledWith(mockSettings, 200);
    });
  });
});