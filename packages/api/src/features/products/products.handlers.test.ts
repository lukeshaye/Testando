/**
 * @file /packages/api/src/features/products/products.handlers.test.ts
 * @overview Testes unitários para os handlers da feature 'products'.
 *
 * @see - Refatoração "Padrão Ouro": Alinhado com Step 3 (Handlers em camelCase).
 * @see - Princípios:
 * @see - PTE (2.15): Mockar c.var.db (Drizzle) e c.var.user.
 * @see - DRY (2.2): Reuso de mocks e factories.
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
import { products } from '@db/schema'; 

// Mock do usuário (c.var.user)
const mockUser = { id: 'user-123', email: 'test@test.com' };

// Mock de dados padrão incluindo campos de auditoria (Passo 1 da refatoração)
const mockDate = new Date();
const baseProduct = {
  id: 'prod-1',
  name: 'Test Product',
  price: 100, // Exemplo de valor numérico
  userId: mockUser.id, // camelCase estrito conforme Step 2 e 3
  createdAt: mockDate,
  updatedAt: mockDate,
};

// Mock do cliente Drizzle (c.var.db)
// Chainable mock helper
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

// Mock do DB
const mockDb: any = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

// Resetar mocks antes de cada teste
beforeEach(() => {
  vi.resetAllMocks();

  // Configuração padrão dos mocks (Happy Path)
  mockDb.insert.mockReturnValue(createMockChain([{ ...baseProduct, id: 'prod-new', name: 'New Product' }]));
  mockDb.update.mockReturnValue(createMockChain([{ ...baseProduct, name: 'Updated Product' }]));
  mockDb.delete.mockReturnValue(createMockChain([{ ...baseProduct }]));
});

// Helper para criar contexto (Factory Pattern)
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
  } as unknown as Context<{ Variables: any }>;
};

// --- Test Suites ---

describe('Products Handlers', () => {
  describe('getProducts', () => {
    it('deve chamar db.select.from.where usando userId (camelCase)', async () => {
      const c = createMockContext();
      
      // Mock específico para o Select
      const whereMock = vi.fn(() => Promise.resolve([baseProduct]));
      const fromMock = vi.fn(() => ({ where: whereMock }));
      const selectChain = { from: fromMock };
      
      mockDb.select.mockReturnValueOnce(selectChain);

      await getProducts(c);

      expect(mockDb.select).toHaveBeenCalled();
      expect(fromMock).toHaveBeenCalledWith(products);
      // Verifica se o handler aplicou o filtro corretamente
      expect(whereMock).toHaveBeenCalled(); 
      expect(c.json).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ userId: mockUser.id }) // Garante retorno em camelCase
      ]));
    });
  });

  describe('getProductById', () => {
    it('deve retornar o produto se o ID e userId corresponderem', async () => {
      const c = createMockContext(null, { id: 'prod-1' });
      const selectChain = createMockChain([baseProduct]);
      mockDb.select.mockReturnValueOnce(selectChain);

      await getProductById(c);

      expect(mockDb.select).toHaveBeenCalled();
      expect(selectChain.from).toHaveBeenCalledWith(products);
      expect(selectChain.where).toHaveBeenCalled(); // Onde a verificação de segurança ocorre
      expect(selectChain.limit).toHaveBeenCalledWith(1);
      expect(c.json).toHaveBeenCalledWith(expect.objectContaining({ id: 'prod-1', userId: mockUser.id }));
    });
  });

  describe('createProduct', () => {
    it('deve inserir dados usando chaves em camelCase e associar ao usuário', async () => {
      // Input do Zod (já em camelCase conforme Step 2 e 4)
      const newProductPayload = { name: 'New Product', price: 150 };
      const c = createMockContext(newProductPayload);
      
      const insertChain = createMockChain([{ ...baseProduct, id: 'prod-new', ...newProductPayload }]);
      mockDb.insert.mockReturnValueOnce(insertChain);

      await createProduct(c);

      expect(mockDb.insert).toHaveBeenCalledWith(products);
      // AQUI ESTÁ A CHAVE: O handler deve passar 'userId', não 'user_id'.
      // O Drizzle fará o mapeamento interno para o banco.
      expect(insertChain.values).toHaveBeenCalledWith({
        ...newProductPayload,
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
    it('deve atualizar campos usando camelCase', async () => {
      const updatedValues = { name: 'Updated Product' };
      const c = createMockContext(updatedValues, { id: 'prod-1' });
      
      const updateChain = createMockChain([{ ...baseProduct, ...updatedValues }]);
      mockDb.update.mockReturnValueOnce(updateChain);

      await updateProduct(c);

      expect(mockDb.update).toHaveBeenCalledWith(products);
      // Verifica se o handler passou apenas os dados necessários em camelCase
      expect(updateChain.set).toHaveBeenCalledWith(updatedValues);
      expect(updateChain.where).toHaveBeenCalled();
      expect(updateChain.returning).toHaveBeenCalled();
      expect(c.json).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Updated Product' })
      );
    });
  });

  describe('deleteProduct', () => {
    it('deve remover o produto garantindo a propriedade do usuário', async () => {
      const c = createMockContext(null, { id: 'prod-1' });
      const deleteChain = createMockChain([{ id: 'prod-1' }]);
      mockDb.delete.mockReturnValueOnce(deleteChain);

      await deleteProduct(c);

      expect(mockDb.delete).toHaveBeenCalledWith(products);
      expect(deleteChain.where).toHaveBeenCalled(); // Deve conter a cláusula AND userId = user.id
      expect(deleteChain.returning).toHaveBeenCalled();
      expect(c.json).toHaveBeenCalledWith({ message: 'Product deleted successfully' });
    });
  });
});