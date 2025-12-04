/**
 * /packages/api/src/features/financial/financial.handlers.test.ts
 *
 * (Executor: Implementação Tática)
 *
 * Testes unitários para os handlers de 'financial'.
 *
 * Princípios Aplicados:
 * - PTE (2.15): Testes unitários focados na lógica do handler.
 * - DIP (2.9) /[cite: 126]: Mockamos as dependências injetadas (c.var.db e c.var.user),
 * não implementações concretas.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getFinancialTransactions,
  getFinancialTransactionById,
  createFinancialTransaction,
  updateFinancialTransaction,
  deleteFinancialTransaction,
} from './financial.handlers';
import { financialTransactions } from '@db/schema'; // Importamos para referência no mock

// Mock do schema
vi.mock('@db/schema', () => ({
  financialTransactions: {
    // Objeto mockado para referência
  },
}));

// Mock do Drizzle (c.var.db) [cite: 126]
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([{ id: 'tx-new' }]),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
};

// Mock do usuário (c.var.user) [cite: 126]
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
};

// Mock do Contexto Hono
let mockContext: any;

beforeEach(() => {
  // Resetar todos os mocks antes de cada teste
  vi.clearAllMocks();

  // Resetar o encadeamento do mockDb
  mockDb.select.mockReturnThis();
  mockDb.from.mockReturnThis();
  mockDb.where.mockReturnThis();
  mockDb.orderBy.mockReturnThis();
  mockDb.insert.mockReturnThis();
  mockDb.values.mockReturnThis();
  mockDb.update.mockReturnThis();
  mockDb.set.mockReturnThis();
  mockDb.delete.mockReturnThis();

  // Configuração padrão do contexto
  mockContext = {
    var: {
      db: mockDb,
      user: mockUser,
    },
    req: {
      valid: vi.fn(),
      param: vi.fn(),
    },
    json: vi.fn((data, status) => ({ data, status })), // Mock c.json
  };
});

describe('Financial Handlers', () => {
describe('getFinancialTransactions [cite: 127]', () => {
    it('should fetch all transactions for the user', async () => {
      const mockData = [{ id: 'tx-1' }, { id: 'tx-2' }];
      mockDb.orderBy.mockResolvedValue(mockData);

      await getFinancialTransactions(mockContext as any);

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalledWith(financialTransactions);
      expect(mockDb.where).toHaveBeenCalled(); // (A implementação exata do eq é testada pelo Drizzle)
      expect(mockDb.orderBy).toHaveBeenCalled();
      expect(mockContext.json).toHaveBeenCalledWith(mockData);
    });
  });

  describe('getFinancialTransactionById', () => {
    it('should fetch a single transaction by ID and user ID', async () => {
      const mockData = { id: 'tx-1' };
      mockContext.req.param.mockReturnValue({ id: 'tx-1' });
      mockDb.where.mockResolvedValue([mockData]);

      await getFinancialTransactionById(mockContext as any);

      expect(mockContext.req.param).toHaveBeenCalled();
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalledWith(financialTransactions);
      expect(mockDb.where).toHaveBeenCalled();
      expect(mockContext.json).toHaveBeenCalledWith(mockData);
    });

    it('should return 404 if transaction not found', async () => {
      mockContext.req.param.mockReturnValue({ id: 'tx-999' });
      mockDb.where.mockResolvedValue([]); // Vazio

      await getFinancialTransactionById(mockContext as any);

      expect(mockContext.json).toHaveBeenCalledWith(
        { error: 'Transaction not found' },
        404,
      );
    });
  });

describe('createFinancialTransaction [cite: 128]', () => {
    it('should create a new transaction', async () => {
      const newTransaction = { description: 'New', amount: 100 };
      const createdTransaction = {
        ...newTransaction,
        id: 'tx-new',
        userId: 'user-123',
      };
      mockContext.req.valid.mockReturnValue(newTransaction);
      mockDb.returning.mockResolvedValue([createdTransaction]);

      await createFinancialTransaction(mockContext as any);

      expect(mockContext.req.valid).toHaveBeenCalledWith('json');
      expect(mockDb.insert).toHaveBeenCalledWith(financialTransactions);
      expect(mockDb.values).toHaveBeenCalledWith({
        ...newTransaction,
        userId: mockUser.id,
      });
      expect(mockDb.returning).toHaveBeenCalled();
      expect(mockContext.json).toHaveBeenCalledWith(createdTransaction, 201);
    });
  });

  describe('updateFinancialTransaction', () => {
    it('should update an existing transaction', async () => {
      const updatedData = { description: 'Updated' };
      const updatedTransaction = { ...updatedData, id: 'tx-1' };
      mockContext.req.param.mockReturnValue({ id: 'tx-1' });
      mockContext.req.valid.mockReturnValue(updatedData);
      mockDb.returning.mockResolvedValue([updatedTransaction]);

      await updateFinancialTransaction(mockContext as any);

      expect(mockContext.req.param).toHaveBeenCalled();
      expect(mockContext.req.valid).toHaveBeenCalledWith('json');
      expect(mockDb.update).toHaveBeenCalledWith(financialTransactions);
      expect(mockDb.set).toHaveBeenCalledWith(updatedData);
      expect(mockDb.where).toHaveBeenCalled();
      expect(mockDb.returning).toHaveBeenCalled();
      expect(mockContext.json).toHaveBeenCalledWith(updatedTransaction);
    });

    it('should return 404 if updating a non-existent transaction', async () => {
      mockContext.req.param.mockReturnValue({ id: 'tx-999' });
      mockContext.req.valid.mockReturnValue({ description: 'Updated' });
      mockDb.returning.mockResolvedValue([]); // Vazio

      await updateFinancialTransaction(mockContext as any);

      expect(mockContext.json).toHaveBeenCalledWith(
        { error: 'Transaction not found' },
        404,
      );
    });
  });

  describe('deleteFinancialTransaction', () => {
    it('should delete an existing transaction', async () => {
      const deletedTransaction = { id: 'tx-1' };
      mockContext.req.param.mockReturnValue({ id: 'tx-1' });
      mockDb.returning.mockResolvedValue([deletedTransaction]);

      await deleteFinancialTransaction(mockContext as any);

      expect(mockContext.req.param).toHaveBeenCalled();
      expect(mockDb.delete).toHaveBeenCalledWith(financialTransactions);
      expect(mockDb.where).toHaveBeenCalled();
      expect(mockDb.returning).toHaveBeenCalled();
      expect(mockContext.json).toHaveBeenCalledWith(deletedTransaction);
    });

    it('should return 404 if deleting a non-existent transaction', async () => {
      mockContext.req.param.mockReturnValue({ id: 'tx-999' });
      mockDb.returning.mockResolvedValue([]); // Vazio

      await deleteFinancialTransaction(mockContext as any);

      expect(mockContext.json).toHaveBeenCalledWith(
        { error: 'Transaction not found' },
        404,
      );
    });
  });
});