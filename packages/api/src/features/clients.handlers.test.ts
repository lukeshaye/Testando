/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { getClients, createClient } from './clients.handlers';
import { clients } from '../../db/schema'; // Assumindo importação do schema (Módulo 2)
import { AuthUser } from '../../core/auth.adapter';
import { Context } from 'hono';

// Tipo parcial para mocar o contexto Hono com as variáveis injetadas
type MockContext = Partial<Context> & {
  var: {
    db: any; // Mock do Drizzle Client
    user: AuthUser;
  };
  req: {
    valid: (target: 'json') => any;
  };
  json: (data: any, status?: number) => Response;
};

// --- Mocks ---

const mockUser: AuthUser = {
  id: 'user-uuid-123',
  email: 'test@example.com',
};

const mockClientList = [
  { id: 'client-1', name: 'Cliente Teste 1', userId: mockUser.id },
  { id: 'client-2', name: 'Cliente Teste 2', userId: mockUser.id },
];

const newClientData = {
  name: 'Novo Cliente',
  phone: '99999-9999',
};

const createdClientData = {
  ...newClientData,
  id: 'client-3',
  userId: mockUser.id,
};

// Mock encadeado do Drizzle [Ref: 2.15]
const mockDb = {
  select: vi.fn(() => mockDb),
  from: vi.fn(() => mockDb),
  where: vi.fn(() => Promise.resolve(mockClientList)),
  insert: vi.fn(() => mockDb),
  values: vi.fn(() => mockDb),
  returning: vi.fn(() => Promise.resolve([createdClientData])),
};

// Mock do Contexto Hono [Ref: 126]
const mockContext = {
  var: {
    db: mockDb,
    user: mockUser,
  },
  req: {
    valid: vi.fn(() => newClientData),
  },
  json: vi.fn((data) => new Response(JSON.stringify(data))),
} as unknown as MockContext;

// Resetar mocks antes de cada teste
beforeEach(() => {
  vi.clearAllMocks();

  // Resetar implementações de mock Drizzle
  mockDb.select.mockReturnValue(mockDb);
  mockDb.from.mockReturnValue(mockDb);
  mockDb.where.mockResolvedValue(mockClientList);
  mockDb.insert.mockReturnValue(mockDb);
  mockDb.values.mockReturnValue(mockDb);
  mockDb.returning.mockResolvedValue([createdClientData]);
  
  mockContext.req.valid.mockReturnValue(newClientData);
});

// --- Testes ---

describe('Client Handlers', () => {
  describe('getClients', () => {
    it('deve chamar db.select com o userId correto e retornar a lista de clientes', async () => {
      await getClients(mockContext as any); // [Ref: 110]

      // [Ref: 127] Verifica se 'db.select().from(clients)' foi chamado
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalledWith(clients);

      // [Ref: 113] Verifica se a lógica de tenancy (userId) foi aplicada
      expect(mockDb.where).toHaveBeenCalledWith(eq(clients.userId, mockUser.id));

      // [Ref: 114] Verifica se a resposta JSON foi enviada
      expect(mockContext.json).toHaveBeenCalledWith(mockClientList);
    });
  });

  describe('createClient', () => {
    it('deve chamar db.insert com os dados validados e o userId e retornar o novo cliente', async () => {
      await createClient(mockContext as any); // [Ref: 116]

      // [Ref: 117] Verifica se os dados validados do body (json) foram lidos
      expect(mockContext.req.valid).toHaveBeenCalledWith('json');

      // [Ref: 128] Verifica se 'db.insert(clients)' foi chamado
      expect(mockDb.insert).toHaveBeenCalledWith(clients);

      // [Ref: 120] Verifica se o userId foi injetado nos valores
      expect(mockDb.values).toHaveBeenCalledWith({
        ...newClientData,
        userId: mockUser.id,
      });
      expect(mockDb.returning).toHaveBeenCalled();

      // [Ref: 121] Verifica se a resposta JSON foi enviada com status 201
      expect(mockContext.json).toHaveBeenCalledWith(createdClientData, 201);
    });
  });
});