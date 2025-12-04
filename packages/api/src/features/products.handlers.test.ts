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
import { products } from '@db/schema'; // Usado para verificação de mock

// Mock do usuário (c.var.user) 
const mockUser = { id: 'user-123', email: 'test@test.com' };

// Mock do cliente Drizzle (c.var.db) 
// Criamos um objeto encadeável que retorna a si mesmo para suportar chaining infinito
const createMockChain = (finalValue?: any) => {
  const chain: any = {
    from: vi.fn(() => chain),
    where: vi.fn(() => chain),
    limit: vi.fn(() => Promise.resolve(finalValue || [])),
    values: vi.fn(() => chain),
    set: vi.fn(() => chain),
    returning: vi.fn(() => Promise.resolve(finalValue || [])),
  };
  return chain;
};

// Mock do DB que retorna cadeias encadeáveis
const mockDb: any = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

// Resetar mocks antes de cada teste
beforeEach(() => {
  vi.resetAllMocks();
  
  // Configurar mocks padrão (cada teste pode sobrescrever se necessário)
  mockDb.insert.mockReturnValue(createMockChain([{ id: 'prod-new', name: 'New Product', userId: mockUser.id }]));
  mockDb.update.mockReturnValue(createMockChain([{ id: 'prod-1', name: 'Updated Product', userId: mockUser.id }]));
  mockDb.delete.mockReturnValue(createMockChain([{ id: 'prod-1' }]));
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
      const whereMock = vi.fn(() => Promise.resolve([{ id: 'prod-1', name: 'Test Product', userId: mockUser.id }]));
      const fromMock = vi.fn(() => ({
        where: whereMock,
      }));
      const selectChain = {
        from: fromMock,
      };
      mockDb.select.mockReturnValueOnce(selectChain);
      
      await getProducts(c);

      expect(mockDb.select).toHaveBeenCalled();
      expect(fromMock).toHaveBeenCalledWith(products);
      expect(whereMock).toHaveBeenCalled(); // (eq(products.userId, user.id))
      expect(c.json).toHaveBeenCalledWith(expect.any(Array));
    });
  });

  describe('getProductById', () => {
    it('deve chamar db.select.from.where com id e userId', async () => {
      const c = createMockContext(null, { id: 'prod-1' });
      // Configurar mock específico para este teste
      const selectChain = createMockChain([{ id: 'prod-1', name: 'Test Product', userId: mockUser.id }]);
      mockDb.select.mockReturnValueOnce(selectChain);
      
      await getProductById(c);

      expect(mockDb.select).toHaveBeenCalled();
      expect(selectChain.from).toHaveBeenCalledWith(products);
      expect(selectChain.where).toHaveBeenCalled();
      expect(selectChain.limit).toHaveBeenCalledWith(1);
      expect(c.json).toHaveBeenCalledWith(expect.objectContaining({ id: 'prod-1' }));
    });
  });

  describe('createProduct', () => {
    it('deve chamar db.insert.values.returning com o userId correto', async () => {
      const newProduct = { name: 'New Product', price: 100 };
      const c = createMockContext(newProduct);
      // Configurar mock específico para este teste
      const insertChain = createMockChain([{ id: 'prod-new', name: 'New Product', userId: mockUser.id }]);
      mockDb.insert.mockReturnValueOnce(insertChain);
      
      await createProduct(c);

      expect(mockDb.insert).toHaveBeenCalledWith(products);
      expect(insertChain.values).toHaveBeenCalledWith({
        ...newProduct,
        userId: mockUser.id,
      });
      expect(insertChain.returning).toHaveBeenCalled();
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
      // Configurar mock específico para este teste
      const updateChain = createMockChain([{ id: 'prod-1', name: 'Updated Product', userId: mockUser.id }]);
      mockDb.update.mockReturnValueOnce(updateChain);

      await updateProduct(c);

      expect(mockDb.update).toHaveBeenCalledWith(products);
      expect(updateChain.set).toHaveBeenCalledWith(updatedValues);
      expect(updateChain.where).toHaveBeenCalled();
      expect(updateChain.returning).toHaveBeenCalled();
      expect(c.json).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Updated Product' })
      );
    });
  });

  describe('deleteProduct', () => {
    it('deve chamar db.delete.where.returning com o userId correto', async () => {
      const c = createMockContext(null, { id: 'prod-1' });
      // Configurar mock específico para este teste
      const deleteChain = createMockChain([{ id: 'prod-1' }]);
      mockDb.delete.mockReturnValueOnce(deleteChain);

      await deleteProduct(c);

      expect(mockDb.delete).toHaveBeenCalledWith(products);
      expect(deleteChain.where).toHaveBeenCalled();
      expect(deleteChain.returning).toHaveBeenCalled();
      expect(c.json).toHaveBeenCalledWith({ message: 'Product deleted successfully' });
    });
  });
});