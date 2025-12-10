/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { getClients, createClient } from './clients.handlers';
import { clients } from '@db/schema'; 
import { AuthUser } from '../../core/auth.adapter';
import { Context } from 'hono';

// --- Tipagem para Testabilidade Explícita [Ref: 2.15] ---
// Define o formato esperado do contexto para facilitar a injeção de dependência [Ref: 2.9]
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

// --- Mocks (Dados em camelCase - Padrão Ouro) ---

const mockUser: AuthUser = {
  id: 'user-uuid-123',
  email: 'test@example.com',
};

// [Ref: 2.14] Imutabilidade nos dados de teste
const mockClientList = [
  { 
    id: 'client-1', 
    name: 'Cliente Teste 1', 
    userId: mockUser.id, // camelCase ( mapeado de user_id )
    phone: '51999999999',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  { 
    id: 'client-2', 
    name: 'Cliente Teste 2', 
    userId: mockUser.id, 
    phone: '51888888888',
    createdAt: new Date(),
    updatedAt: new Date()
  },
];

const newClientData = {
  name: 'Novo Cliente',
  phone: '99999-9999',
  // O input vem do frontend em camelCase (Passo 4 da refatoração)
};

const createdClientData = {
  ...newClientData,
  id: 'client-3',
  userId: mockUser.id,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Mock encadeado do Drizzle (Query Builder)
const mockDb = {
  select: vi.fn(() => mockDb),
  from: vi.fn(() => mockDb),
  where: vi.fn(() => Promise.resolve(mockClientList)),
  insert: vi.fn(() => mockDb),
  values: vi.fn(() => mockDb),
  returning: vi.fn(() => Promise.resolve([createdClientData])),
};

// Mock do Contexto Hono
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

// Resetar estado antes de cada teste [Ref: 2.15]
beforeEach(() => {
  vi.clearAllMocks();

  // Resetar implementações padrão
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
    it('deve buscar clientes filtrando pelo userId (Multi-tenancy) e retornar camelCase', async () => {
      // Act
      await getClients(mockContext as any); 

      // Assert [Ref: 2.15 - PTE]
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalledWith(clients);

      // Verifica se a cláusula WHERE usa a propriedade do schema (que mapeia para user_id)
      // e o valor do usuário autenticado.
      expect(mockDb.where).toHaveBeenCalledWith(eq(clients.userId, mockUser.id));

      // Verifica se o retorno para o frontend é a lista pura (já em camelCase)
      expect(mockContext.json).toHaveBeenCalledWith(mockClientList);
    });
  });

  describe('createClient', () => {
    it('deve persistir dados recebendo e enviando camelCase para o ORM', async () => {
      // Act
      await createClient(mockContext as any);

      // Assert
      // 1. Validação do input (Zod já retornou camelCase)
      expect(mockContext.req.valid).toHaveBeenCalledWith('json');

      // 2. Insert na tabela correta
      expect(mockDb.insert).toHaveBeenCalledWith(clients);

      // 3. Values: Ponto Crítico do "Padrão Ouro"
      // O handler deve passar um objeto com chaves camelCase (userId, name, phone).
      // O Drizzle converterá para snake_case (user_id) internamente na query SQL.
      expect(mockDb.values).toHaveBeenCalledWith({
        ...newClientData,
        userId: mockUser.id, // Injeção de dependência do usuário autenticado
      });

      // 4. Returning deve ser chamado para retornar o objeto criado
      expect(mockDb.returning).toHaveBeenCalled();

      // 5. Resposta final ao cliente (201 Created)
      expect(mockContext.json).toHaveBeenCalledWith(createdClientData, 201);
    });
  });
});