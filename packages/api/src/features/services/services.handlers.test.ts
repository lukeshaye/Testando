/**
 * /packages/api/src/features/services/services.handlers.test.ts
 *
 * (Executor: Implementando estritamente o $$PLANO_DE_FEATURE$$ - Padrão Ouro)
 *
 * O Quê (Lógica): Testes unitários para os handlers de 'services'.
 * Como (Princípios):
 * - PTE (2.15): Testar interações com Drizzle assumindo mapeamento automático (camelCase <-> snake_case). 
 * - DRY (2.2): Validar que não há conversão manual de chaves nos handlers. [cite: 15]
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
} from './services.handlers';
import { Context } from 'hono';
import { Variables } from '../../types';

// Mock do schema (Simulando Passo 1: Definição do Schema)
// Nota: Mesmo que no banco seja 'user_id', aqui referenciamos o objeto da coluna 'userId'.
vi.mock('@repo/db/schema', () => ({
  services: {
    id: 'services.id',
    userId: 'services.userId', // Mapeado internamente para user_id
    createdAt: 'services.createdAt', // Coluna de auditoria adicionada
    updatedAt: 'services.updatedAt', // Coluna de auditoria adicionada
  },
}));

// Mock dos operadores Drizzle (Hoisted)
const { mockEq, mockAnd } = vi.hoisted(() => {
  return {
    mockEq: vi.fn((a, b) => `(${a} eq ${b})`),
    mockAnd: vi.fn((...args) => args.join(' and ')),
  };
});

vi.mock('drizzle-orm', () => ({
  eq: mockEq,
  and: mockAnd,
}));

// Mock do Drizzle Client Chain (PTE 2.15) [cite: 105]
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  returning: vi.fn(),
};

// Mock do usuário
const mockUser = {
  id: 'user-test-123',
  email: 'test@example.com',
};

// Helper para criar o mock de Contexto
const createMockContext = (
  validJson: unknown = {},
  paramId: string | undefined = undefined
) => {
  const c = {
    var: {
      db: mockDb as any,
      user: mockUser as any,
    },
    req: {
      valid: vi.fn(() => validJson),
      param: vi.fn(() => ({ id: paramId })),
    },
    json: vi.fn((data, status) => ({ status: status || 200, data })),
  } as unknown as Context<{ Variables: Variables }>;

  return c;
};

describe('Services Handlers (Gold Standard)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Resets para garantir isolamento (PTE)
    mockDb.select.mockReturnThis();
    mockDb.from.mockReturnThis();
    mockDb.where.mockReturnThis();
    mockDb.insert.mockReturnThis();
    mockDb.values.mockReturnThis();
    mockDb.update.mockReturnThis();
    mockDb.set.mockReturnThis();
    mockDb.delete.mockReturnThis();
  });

  // Teste de Leitura (Query)
  it('getServices: deve chamar db.select com filtro de usuário', async () => {
    const mockData = [
      { 
        id: 's1', 
        name: 'Service 1', 
        userId: mockUser.id,
        createdAt: new Date(), 
        updatedAt: new Date() 
      }
    ];
    mockDb.where.mockResolvedValue(mockData);
    const c = createMockContext();

    const response = await getServices(c);

    expect(mockDb.select).toHaveBeenCalled();
    expect(mockDb.from).toHaveBeenCalledWith({
      id: 'services.id',
      userId: 'services.userId',
      createdAt: 'services.createdAt',
      updatedAt: 'services.updatedAt',
    });
    // Verifica se usou a referência correta do schema (userId)
    expect(mockEq).toHaveBeenCalledWith('services.userId', mockUser.id);
    expect(response.data).toEqual(mockData);
  });

  // Teste de Escrita (Command - Create)
  it('createService: deve inserir usando camelCase e incluir userId', async () => {
    // Input em camelCase (Simulando Passo 2: Zod Schema)
    const newServiceInput = { 
      name: 'New Service', 
      duration: 30, 
      price: 50.0 
    };
    
    // Retorno do banco simula colunas de auditoria (Passo 1)
    const returnedService = { 
      ...newServiceInput, 
      id: 's-new', 
      userId: mockUser.id,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    mockDb.returning.mockResolvedValue([returnedService]);
    const c = createMockContext(newServiceInput);

    const response = await createService(c);

    expect(c.req.valid).toHaveBeenCalledWith('json');
    expect(mockDb.insert).toHaveBeenCalled();
    
    // VERIFICAÇÃO CRÍTICA DO PADRÃO OURO:
    // O objeto passado para .values() deve ter chaves em camelCase.
    // O Drizzle cuidará de transformar userId -> user_id no SQL.
    expect(mockDb.values).toHaveBeenCalledWith({
      ...newServiceInput,
      userId: mockUser.id, 
    });
    
    expect(mockDb.returning).toHaveBeenCalled();
    expect(response.status).toBe(201);
    expect(response.data).toEqual(returnedService);
  });

  // Teste de Escrita (Command - Update)
  it('updateService: deve atualizar usando camelCase', async () => {
    const serviceId = 's1';
    // Input parcial em camelCase
    const updates = { name: 'Updated Name', price: 55.0 };
    
    const returnedService = {
      id: serviceId,
      name: 'Updated Name',
      price: 55.0,
      userId: mockUser.id,
      createdAt: new Date(),
      updatedAt: new Date(), // Atualizado
    };

    mockDb.returning.mockResolvedValue([returnedService]);
    const c = createMockContext(updates, serviceId);

    const response = await updateService(c);

    expect(mockDb.update).toHaveBeenCalled();
    
    // VERIFICAÇÃO CRÍTICA:
    // Garante que não estamos passando "updated_at" manualmente, 
    // mas sim confiando no Drizzle ou triggers (ou passando updatedAt se for explícito no handler)
    expect(mockDb.set).toHaveBeenCalledWith(updates);
    
    expect(mockAnd).toHaveBeenCalledWith(
      '(services.id eq s1)',
      '(services.userId eq user-test-123)'
    );
    expect(response.data).toEqual(returnedService);
  });

  it('deleteService: deve deletar garantindo tenancy (userId)', async () => {
    const serviceId = 's1';
    mockDb.returning.mockResolvedValue([{ id: serviceId }]);
    const c = createMockContext({}, serviceId);

    const response = await deleteService(c);

    expect(mockDb.delete).toHaveBeenCalled();
    // Garante segurança (Sempre filtrar por userId) [cite: 113]
    expect(mockAnd).toHaveBeenCalledWith(
      '(services.id eq s1)',
      '(services.userId eq user-test-123)'
    );
    expect(response.data).toEqual({ message: 'Service deleted successfully' });
  });

  it('getServiceById: deve retornar 404 se não encontrado', async () => {
    const serviceId = 's-not-found';
    mockDb.where.mockResolvedValue([]); 
    const c = createMockContext({}, serviceId);

    const response = await getServiceById(c);

    expect(response.status).toBe(404);
    expect(response.data).toEqual({
      error: 'Service not found or unauthorized',
    });
  });
});