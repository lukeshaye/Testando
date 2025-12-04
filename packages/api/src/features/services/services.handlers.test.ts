/**
 * /packages/api/src/features/services/services.handlers.test.ts
 *
 * (Executor: Implementando estritamente o $$PLANO_DE_FEATURE$$)
 *
 * O Quê (Lógica): Testes unitários para os handlers de 'services'. [cite: 124]
 * Como (Princípios):
 * - PTE (2.15): Mockar c.var.db (Drizzle mockado) e c.var.user. [cite: 126]
 * - Testar se getServices chama db.select().from(services)... [cite: 127, 137]
 * - Testar se createService chama db.insert(services)... [cite: 128, 137]
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

// Mock do schema (Módulo 2)
vi.mock('@repo/db/schema', () => ({
  services: {
    id: 'services.id',
    userId: 'services.userId',
    // ...outros campos mockados se necessário
  },
}));

// Mock dos operadores Drizzle usando hoisted para evitar problemas de hoisting
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

// Mock do Drizzle Client Chain [cite: 126]
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

// Mock do usuário [cite: 126]
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

describe('Services Handlers', () => {
  beforeEach(() => {
    // Limpar mocks antes de cada teste
    vi.clearAllMocks();
    mockDb.select.mockReturnThis();
    mockDb.from.mockReturnThis();
    mockDb.where.mockReturnThis();
    mockDb.insert.mockReturnThis();
    mockDb.values.mockReturnThis();
    mockDb.update.mockReturnThis();
    mockDb.set.mockReturnThis();
    mockDb.delete.mockReturnThis();
  });

// Teste [cite: 127]
  it('getServices: deve chamar db.select com filtro de usuário', async () => {
    const mockData = [{ id: 's1', name: 'Service 1' }];
    mockDb.where.mockResolvedValue(mockData);
    const c = createMockContext();

    const response = await getServices(c);

    expect(mockDb.select).toHaveBeenCalled();
    expect(mockDb.from).toHaveBeenCalledWith({
      id: 'services.id',
      userId: 'services.userId',
    });
    expect(mockEq).toHaveBeenCalledWith('services.userId', mockUser.id);
    expect(mockDb.where).toHaveBeenCalledWith(
      '(services.userId eq user-test-123)'
    );
    expect(response.data).toEqual(mockData);
  });

  it('getServiceById: deve chamar db.select com filtro de usuário e ID', async () => {
    const serviceId = 's1';
    const mockData = { id: 's1', name: 'Service 1', userId: mockUser.id };
    mockDb.where.mockResolvedValue([mockData]);
    const c = createMockContext({}, serviceId);

    const response = await getServiceById(c);

    expect(mockDb.select).toHaveBeenCalled();
    expect(mockDb.from).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith('services.id', serviceId);
    expect(mockEq).toHaveBeenCalledWith('services.userId', mockUser.id);
    expect(mockAnd).toHaveBeenCalledWith(
      '(services.id eq s1)',
      '(services.userId eq user-test-123)'
    );
    expect(mockDb.where).toHaveBeenCalledWith(
      '(services.id eq s1) and (services.userId eq user-test-123)'
    );
    expect(response.data).toEqual(mockData);
  });

// Teste [cite: 128]
  it('createService: deve chamar db.insert com dados validados e userId', async () => {
    const newService = { name: 'New Service', duration: 30, price: 50.0 };
    const returnedService = { ...newService, id: 's-new', userId: mockUser.id };
    mockDb.returning.mockResolvedValue([returnedService]);
    const c = createMockContext(newService);

    const response = await createService(c);

    expect(c.req.valid).toHaveBeenCalledWith('json');
    expect(mockDb.insert).toHaveBeenCalledWith({
      id: 'services.id',
      userId: 'services.userId',
    });
    expect(mockDb.values).toHaveBeenCalledWith({
      ...newService,
userId: mockUser.id, // [cite: 137]
    });
    expect(mockDb.returning).toHaveBeenCalled();
    expect(response.status).toBe(201);
    expect(response.data).toEqual(returnedService);
  });

  it('updateService: deve chamar db.update com filtro de usuário e ID', async () => {
    const serviceId = 's1';
    const updates = { name: 'Updated Name', price: 55.0 };
    const returnedService = {
      id: serviceId,
      name: 'Updated Name',
      price: 55.0,
      userId: mockUser.id,
    };
    mockDb.returning.mockResolvedValue([returnedService]);
    const c = createMockContext(updates, serviceId);

    const response = await updateService(c);

    expect(c.req.valid).toHaveBeenCalledWith('json');
    expect(mockDb.update).toHaveBeenCalled();
    expect(mockDb.set).toHaveBeenCalledWith(updates);
    expect(mockAnd).toHaveBeenCalledWith(
      '(services.id eq s1)',
      '(services.userId eq user-test-123)'
    );
    expect(mockDb.where).toHaveBeenCalledWith(
      '(services.id eq s1) and (services.userId eq user-test-123)'
    );
    expect(mockDb.returning).toHaveBeenCalled();
    expect(response.data).toEqual(returnedService);
  });

  it('deleteService: deve chamar db.delete com filtro de usuário e ID', async () => {
    const serviceId = 's1';
    mockDb.returning.mockResolvedValue([{ id: serviceId }]);
    const c = createMockContext({}, serviceId);

    const response = await deleteService(c);

    expect(mockDb.delete).toHaveBeenCalled();
    expect(mockAnd).toHaveBeenCalledWith(
      '(services.id eq s1)',
      '(services.userId eq user-test-123)'
    );
    expect(mockDb.where).toHaveBeenCalledWith(
      '(services.id eq s1) and (services.userId eq user-test-123)'
    );
    expect(response.data).toEqual({ message: 'Service deleted successfully' });
  });

  it('getServiceById: deve retornar 404 se não encontrado', async () => {
    const serviceId = 's-not-found';
    mockDb.where.mockResolvedValue([]); // Vazio
    const c = createMockContext({}, serviceId);

    const response = await getServiceById(c);

    expect(mockDb.where).toHaveBeenCalled();
    expect(response.status).toBe(404);
    expect(response.data).toEqual({
      error: 'Service not found or unauthorized',
    });
  });
});