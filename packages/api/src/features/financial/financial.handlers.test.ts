/**
 * /packages/api/src/features/financial/financial.handlers.test.ts
 *
 * (Executor: Implementação Tática - Passo 3: A Lógica)
 *
 * Testes unitários para os handlers de 'financial'.
 *
 * Alterações "Padrão Ouro":
 * - [cite_start]Inputs e Outputs agora são estritamente camelCase[cite: 1, 2].
 * - Mock do retorno do DB inclui campos de auditoria (createdAt, updatedAt).
 * - Remoção de qualquer lógica de conversão manual; confia-se no Drizzle.
 *
 * Princípios Aplicados:
 * - [cite_start]PTE (2.15): Testes unitários focados na lógica pura do handler[cite: 100].
 * - [cite_start]DIP (2.9): Inversão de dependência mockando c.var.db[cite: 58].
 * - [cite_start]DRY (2.2): Reutilização de mocks no beforeEach[cite: 14].
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getFinancialTransactions,
  getFinancialTransactionById,
  createFinancialTransaction,
  updateFinancialTransaction,
  deleteFinancialTransaction,
} from './financial.handlers';
import { financialTransactions } from '@db/schema';

// Mock do schema
vi.mock('@db/schema', () => ({
  financialTransactions: {
    // Apenas referência para o mock
  },
}));

[cite_start]// Mock do Drizzle (c.var.db) [cite: 58, 62]
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn().mockReturnThis(), // Retorno genérico configurado nos testes
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

describe('Financial Handlers', () => {
  // Cenário de Leitura (Query)
  describe('getFinancialTransactions', () => {
    it('should fetch all transactions for the user returning camelCase data', async () => {
      // Mock Data em camelCase (simulando retorno do Drizzle já mapeado)
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
      expect(mockDb.from).toHaveBeenCalledWith(financialTransactions);
      expect(mockDb.where).toHaveBeenCalled(); // Verifica filtro por userId
      expect(mockDb.orderBy).toHaveBeenCalled();
      expect(mockContext.json).toHaveBeenCalledWith(mockData);
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
      mockDb.where.mockResolvedValue([]); // Retorno vazio

      await getFinancialTransactionById(mockContext as any);

      expect(mockContext.json).toHaveBeenCalledWith(
        { error: 'Transaction not found' },
        404,
      );
    });
  });

  // Cenário de Escrita (Command) - Reflete Passo 3 do plano
  describe('createFinancialTransaction', () => {
    it('should create a new transaction using camelCase payload', async () => {
      // Input: camelCase (Zod valida e entrega camelCase)
      const newTransactionInput = {
        description: 'New Project',
        amount: 1000,
        categoryId: 'cat-1', // Exemplo de propriedade camelCase
        date: new Date(),
      };

      // Output: camelCase com campos de auditoria
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
      expect(mockDb.insert).toHaveBeenCalledWith(financialTransactions);
      
      // Verificação Crítica: O handler deve passar camelCase para o Drizzle.
      // O schema do Drizzle fará a conversão para snake_case no SQL internamente.
      expect(mockDb.values).toHaveBeenCalledWith({
        ...newTransactionInput,
        userId: mockUser.id,
      });

      expect(mockDb.returning).toHaveBeenCalled();
      expect(mockContext.json).toHaveBeenCalledWith(createdTransaction, 201);
    });
  });

  describe('updateFinancialTransaction', () => {
    it('should update an existing transaction with camelCase data', async () => {
      const updatedDataInput = { description: 'Updated Description' };
      
      const updatedTransaction = {
        id: 'tx-1',
        description: 'Updated Description',
        amount: 100,
        userId: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(), // updated_at atualizado
      };

      mockContext.req.param.mockReturnValue({ id: 'tx-1' });
      mockContext.req.valid.mockReturnValue(updatedDataInput);
      mockDb.returning.mockResolvedValue([updatedTransaction]);

      await updateFinancialTransaction(mockContext as any);

      expect(mockContext.req.param).toHaveBeenCalled();
      expect(mockContext.req.valid).toHaveBeenCalledWith('json');
      expect(mockDb.update).toHaveBeenCalledWith(financialTransactions);
      
      // Verifica se o payload de atualização foi passado corretamente (camelCase)
      expect(mockDb.set).toHaveBeenCalledWith(updatedDataInput);
      
      expect(mockDb.where).toHaveBeenCalled();
      expect(mockDb.returning).toHaveBeenCalled();
      expect(mockContext.json).toHaveBeenCalledWith(updatedTransaction);
    });

    it('should return 404 if updating a non-existent transaction', async () => {
      mockContext.req.param.mockReturnValue({ id: 'tx-999' });
      mockContext.req.valid.mockReturnValue({ description: 'Updated' });
      mockDb.returning.mockResolvedValue([]);

      await updateFinancialTransaction(mockContext as any);

      expect(mockContext.json).toHaveBeenCalledWith(
        { error: 'Transaction not found' },
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
      expect(mockDb.delete).toHaveBeenCalledWith(financialTransactions);
      expect(mockDb.where).toHaveBeenCalled();
      expect(mockDb.returning).toHaveBeenCalled();
      expect(mockContext.json).toHaveBeenCalledWith(deletedTransaction);
    });

    it('should return 404 if deleting a non-existent transaction', async () => {
      mockContext.req.param.mockReturnValue({ id: 'tx-999' });
      mockDb.returning.mockResolvedValue([]);

      await deleteFinancialTransaction(mockContext as any);

      expect(mockContext.json).toHaveBeenCalledWith(
        { error: 'Transaction not found' },
        404,
      );
    });
  });
});