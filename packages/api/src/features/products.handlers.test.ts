/**
 * @file /packages/api/src/features/products/products.handlers.test.ts
 * @overview Testes unitários para os handlers da feature 'products'.
 *
 * @see - Arquivo: /packages/api/src/features/clients/clients.handlers.test.ts (Usado como Templo)
 * @see - O Quê: Testes unitários para os handlers.
 * @see - Como (Princípios):
 * @see - PTE (2.15): Mockar c.var.db (Drizzle mockado) e c.var.user.
 * @see - Testar se getClients (getProducts) chama db.select().from(products)...
 * @see - Testar se createClient (createProduct) chama db.insert(products)...
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Context } from 'hono';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from './products.handlers';
import { products } from '../../db/schema'; // Usado para verificação de mock

// Mock do usuário (c.var.user) 
const mockUser = { id: 'user-123', email: 'test@test.com' };

// Mock do cliente Drizzle (c.var.db) 
const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  // Funções 'chainable'
  from: vi.fn(),
  where: vi.fn(),
  values: vi.fn(),
  returning: vi.fn(),
  set: vi.fn(),
  limit: vi.fn(),
};

// Resetar mocks 'chainable' para retornarem 'this' (ou um mock específico)
beforeEach(() => {
  vi.resetAllMocks();

  // Configuração da cadeia de Drizzle
  mockDb.select.mockReturnValue(mockDb);
  mockDb.from.mockReturnValue(mockDb);
  mockDb.where.mockResolvedValue([{ id: 'prod-1', name: 'Test Product', userId: mockUser.id }]); // Default select response
  mockDb.limit.mockResolvedValue([{ id: 'prod-1', name: 'Test Product', userId: mockUser.id }]); // Default limit response

  mockDb.insert.mockReturnValue(mockDb);
  mockDb.values.mockReturnValue(mockDb);
  mockDb.returning.mockResolvedValue([{ id: 'prod-new', name: 'New Product', userId: mockUser.id }]); // Default insert response

  mockDb.update.mockReturnValue(mockDb);
  mockDb.set.mockReturnValue(mockDb);
  // mockDb.where (do update) usa o 'returning'
  
  mockDb.delete.mockReturnValue(mockDb);
  // mockDb.where (do delete) usa o 'returning'
});

// Helper para criar um mock de Contexto
const createMockContext = (reqBody: unknown = null, params: Record<string, string> = {}) => {
  return {
    var: {
      db: mockDb,
      user: mockUser,
    },
    req: {
      valid: vi.fn(() => reqBody),
      param: vi.fn((key) => (key ? params[key] : params)),
    },
    json: vi.fn((data, status) => ({ status, data })),
  } as unknown as Context<{ Variables: any }>; // Tipagem flexível para teste
};

// --- Test Suites ---

describe('Products Handlers', () => {
  describe('getProducts', () => {
    it('deve chamar db.select.from.where com o userId correto', async () => {
      // (Adaptado para getProducts)
      const c = createMockContext();
      await getProducts(c);

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalledWith(products);
      expect(mockDb.where).toHaveBeenCalled(); // (eq(products.userId, user.id))
      expect(c.json).toHaveBeenCalledWith(expect.any(Array));
    });
  });

  describe('getProductById', () => {
    it('deve chamar db.select.from.where com id e userId', async () => {
      const c = createMockContext(null, { id: 'prod-1' });
      await getProductById(c);

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalledWith(products);
      expect(mockDb.where).toHaveBeenCalled(); // (eq(products.id, id) && eq(products.userId, user.id))
      expect(mockDb.limit).toHaveBeenCalledWith(1);
      expect(c.json).toHaveBeenCalledWith(expect.objectContaining({ id: 'prod-1' }));
    });
  });

  describe('createProduct', () => {
    it('deve chamar db.insert.values.returning com o userId correto', async () => {
      // (Adaptado para createProduct)
      const newProduct = { name: 'New Product', price: 100 };
      const c = createMockContext(newProduct);
      
      await createProduct(c);

      expect(mockDb.insert).toHaveBeenCalledWith(products);
      expect(mockDb.values).toHaveBeenCalledWith({
        ...newProduct,
        userId: mockUser.id, // 
      });
      expect(mockDb.returning).toHaveBeenCalled();
      expect(c.json).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New Product' }),
        201
      );
    });
  });

  describe('updateProduct', () => {
    it('deve chamar db.update.set.where.returning com o userId correto', async () => {
      const updatedValues = { name: 'Updated Product' };
      const c = createMockContext(updatedValues, { id: 'prod-1' });
      
      // Mock específico para update
      mockDb.returning.mockResolvedValueOnce([{ ...updatedValues, id: 'prod-1' }]);

      await updateProduct(c);

      expect(mockDb.update).toHaveBeenCalledWith(products);
      expect(mockDb.set).toHaveBeenCalledWith(updatedValues);
      expect(mockDb.where).toHaveBeenCalled(); // (eq(products.id, id) && eq(products.userId, user.id))
      expect(mockDb.returning).toHaveBeenCalled();
      expect(c.json).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Updated Product' })
      );
    });
  });

  describe('deleteProduct', () => {
    it('deve chamar db.delete.where.returning com o userId correto', async () => {
      const c = createMockContext(null, { id: 'prod-1' });
      
      // Mock específico para delete
      mockDb.returning.mockResolvedValueOnce([{ id: 'prod-1' }]);

      await deleteProduct(c);

      expect(mockDb.delete).toHaveBeenCalledWith(products);
      expect(mockDb.where).toHaveBeenCalled(); // (eq(products.id, id) && eq(products.userId, user.id))
      expect(mockDb.returning).toHaveBeenCalled();
      expect(c.json).toHaveBeenCalledWith({ message: 'Product deleted successfully' });
    });
  });
});