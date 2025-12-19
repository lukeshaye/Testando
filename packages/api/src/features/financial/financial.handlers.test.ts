/**
 * /packages/api/src/features/financial/financial.handlers.test.ts
 *
 * (Executor: Implementação Tática - Passo 3: A Lógica - CORREÇÃO MVP)
 *
 * Testes unitários para os handlers de 'financial'.
 *
 * Alterações "Padrão Ouro":
 * - Inputs e Outputs agora são estritamente camelCase.
 * - Mock do retorno do DB inclui campos de auditoria (createdAt, updatedAt).
 * - Adaptação para o envelope de resposta { success: true, data: ... }.
 * - CORREÇÃO CRÍTICA: financialTransactions -> financialEntries
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getFinancialTransactions,
  getFinancialTransactionById,
  createFinancialTransaction,
  updateFinancialTransaction,
  deleteFinancialTransaction,
} from './financial.handlers';
import { financialEntries } from '@db/schema';

// Mock do schema
vi.mock('@db/schema', () => ({
  financialEntries: {
    // Apenas referência para o mock
  },
}));

// Mock do Drizzle (c.var.db)
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
};

// Mock do usuário (c.var.user)
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
};

// Mock do Contexto Hono
let mockContext: any;

beforeEach(() => {
  vi.clearAllMocks();

  // Silencia console.error para testes de falha não poluírem o terminal
  vi.spyOn(console, 'error').mockImplementation(() => {});

  // Reset do encadeamento fluente do Drizzle
  mockDb.select.mockReturnThis();
  mockDb.from.mockReturnThis();
  mockDb.where.mockReturnThis();
  mockDb.orderBy.mockReturnThis();
  mockDb.insert.mockReturnThis();
  mockDb.values.mockReturnThis();
  mockDb.update.mockReturnThis();
  mockDb.set.mockReturnThis();
  mockDb.delete.mockReturnThis();
  mockDb.returning.mockReturnThis();

  mockContext = {
    var: {
      db: mockDb,
      user: mockUser,
    },
    req: {
      valid: vi.fn(),
      param: vi.fn(),
    },
    json: vi.fn((data, status) => ({ data, status })),
  };
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Financial Handlers', () => {
  // Cenário de Leitura (Query)
  describe('getFinancialTransactions', () => {
    it('should fetch all transactions for the user returning standardized response', async () => {
      // Mock Data em camelCase
      const mockData = [
        {
          id: 'tx-1',
          description: 'Salary',
          amount: 5000,
          userId: 'user-123',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'tx-2',
          description: 'Rent',
          amount: -1500,
          userId: 'user-123',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockDb.orderBy.mockResolvedValue(mockData);

      await getFinancialTransactions(mockContext as any);

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalledWith(financialEntries);
      expect(mockDb.where).toHaveBeenCalled();
      expect(mockDb.orderBy).toHaveBeenCalled();
      
      // ATUALIZADO: Espera o envelope { success: true, data: ... }
      expect(mockContext.json).toHaveBeenCalledWith({
        success: true,
        data: mockData
      });
    });
  });

  describe('getFinancialTransactionById', () => {
    it('should fetch a single transaction by ID and user ID', async () => {
      const mockData = {
        id: 'tx-1',
        description: 'Groceries',
        amount: 200,
        userId: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockContext.req.param.mockReturnValue({ id: 'tx-1' });
      // O DB retorna um array, mas o handler extrai o primeiro item
      mockDb.where.mockResolvedValue([mockData]);

      await getFinancialTransactionById(mockContext as any);

      expect(mockContext.req.param).toHaveBeenCalled();
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalledWith(financialEntries);
      
      // ATUALIZADO: Espera o envelope { success: true, data: objeto }
      expect(mockContext.json).toHaveBeenCalledWith({
        success: true,
        data: mockData
      });
    });

    it('should return 404 if transaction not found', async () => {
      mockContext.req.param.mockReturnValue({ id: 'tx-999' });
      mockDb.where.mockResolvedValue([]); // Retorno vazio

      await getFinancialTransactionById(mockContext as any);

      // ATUALIZADO: Espera formato de erro padronizado
      expect(mockContext.json).toHaveBeenCalledWith(
        { success: false, error: 'Transaction not found' },
        404,
      );
    });
  });

  // Cenário de Escrita (Command)
  describe('createFinancialTransaction', () => {
    it('should create a new transaction using standardized response', async () => {
      const newTransactionInput = {
        description: 'New Project',
        amount: 1000,
        categoryId: 'cat-1',
        date: new Date(),
      };

      const createdTransaction = {
        ...newTransactionInput,
        id: 'tx-new',
        userId: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockContext.req.valid.mockReturnValue(newTransactionInput);
      mockDb.returning.mockResolvedValue([createdTransaction]);

      await createFinancialTransaction(mockContext as any);

      expect(mockContext.req.valid).toHaveBeenCalledWith('json');
      expect(mockDb.insert).toHaveBeenCalledWith(financialEntries);
      
      expect(mockDb.values).toHaveBeenCalledWith({
        ...newTransactionInput,
        userId: mockUser.id,
      });

      // ATUALIZADO: Espera envelope de sucesso
      expect(mockContext.json).toHaveBeenCalledWith(
        { success: true, data: createdTransaction },
        201
      );
    });
  });

  describe('updateFinancialTransaction', () => {
    it('should update an existing transaction', async () => {
      const updatedDataInput = { description: 'Updated Description' };
      
      const updatedTransaction = {
        id: 'tx-1',
        description: 'Updated Description',
        amount: 100,
        userId: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockContext.req.param.mockReturnValue({ id: 'tx-1' });
      mockContext.req.valid.mockReturnValue(updatedDataInput);
      mockDb.returning.mockResolvedValue([updatedTransaction]);

      await updateFinancialTransaction(mockContext as any);

      expect(mockContext.req.param).toHaveBeenCalled();
      expect(mockDb.update).toHaveBeenCalledWith(financialEntries);
      
      // ATUALIZADO: Espera envelope de sucesso
      expect(mockContext.json).toHaveBeenCalledWith({
        success: true,
        data: updatedTransaction
      });
    });

    it('should return 404 if updating a non-existent transaction', async () => {
      mockContext.req.param.mockReturnValue({ id: 'tx-999' });
      mockContext.req.valid.mockReturnValue({ description: 'Updated' });
      mockDb.returning.mockResolvedValue([]);

      await updateFinancialTransaction(mockContext as any);

      expect(mockContext.json).toHaveBeenCalledWith(
        { success: false, error: 'Transaction not found' },
        404,
      );
    });
  });

  describe('deleteFinancialTransaction', () => {
    it('should delete an existing transaction', async () => {
      const deletedTransaction = {
        id: 'tx-1',
        userId: 'user-123',
      };
      
      mockContext.req.param.mockReturnValue({ id: 'tx-1' });
      mockDb.returning.mockResolvedValue([deletedTransaction]);

      await deleteFinancialTransaction(mockContext as any);

      expect(mockContext.req.param).toHaveBeenCalled();
      expect(mockDb.delete).toHaveBeenCalledWith(financialEntries);

      // ATUALIZADO: Espera envelope de sucesso
      expect(mockContext.json).toHaveBeenCalledWith({
        success: true,
        data: deletedTransaction
      });
    });

    it('should return 404 if deleting a non-existent transaction', async () => {
      mockContext.req.param.mockReturnValue({ id: 'tx-999' });
      mockDb.returning.mockResolvedValue([]);

      await deleteFinancialTransaction(mockContext as any);

      expect(mockContext.json).toHaveBeenCalledWith(
        { success: false, error: 'Transaction not found' },
        404,
      );
    });
  });
});