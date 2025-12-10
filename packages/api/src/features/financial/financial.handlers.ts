/**
 * /packages/api/src/features/financial/financial.handlers.ts
 *
 * (Executor: Implementação Tática - Passo 3 Refatoração)
 *
 * Atualizado para suportar o padrão CamelCase <-> SnakeCase automático.
 * * Princípios Aplicados:
 * - DIP (2.9): Injeção do DB via Context.
 * - DSpP (2.16): RLS/Tenancy via user.id em todas as queries.
 * - DRY (2.2) & KISS (2.3): Sem conversão manual de dados; confia no Drizzle/Zod.
 */

import type { Context } from 'hono';
import { Variables } from '../../types';
import { eq, desc, and } from 'drizzle-orm';
// O schema agora exporta as chaves em camelCase (ex: userId) mapeadas para colunas snake_case (user_id)
import { financialTransactions } from '@db/schema';

// Define o tipo do Contexto com as Variáveis injetadas para type safety
type FinancialContext = Context<{ Variables: Variables }>;

/**
 * Handler para buscar todos os lançamentos financeiros do usuário logado.
 * (GET /financial)
 */
export const getFinancialTransactions = async (c: FinancialContext) => {
  const db = c.var.db;
  const user = c.var.user;

  try {
    const data = await db
      .select()
      .from(financialTransactions)
      // A chave agora é .userId (camelCase) vinda do schema atualizado
      .where(eq(financialTransactions.userId, user.id))
      .orderBy(desc(financialTransactions.date)); 

    return c.json(data);
  } catch (error) {
    // (PTE 2.15) Error handling básico
    console.error('Error fetching transactions:', error);
    return c.json({ error: 'Failed to fetch transactions' }, 500);
  }
};

/**
 * Handler para buscar um lançamento financeiro específico pelo ID.
 * (GET /financial/:id)
 */
export const getFinancialTransactionById = async (c: FinancialContext) => {
  const db = c.var.db;
  const user = c.var.user;
  const { id } = c.req.param();

  try {
    const data = await db
      .select()
      .from(financialTransactions)
      .where(
        and(
          eq(financialTransactions.id, id),
          eq(financialTransactions.userId, user.id), // RLS/Tenancy
        ),
      );

    if (data.length === 0) {
      return c.json({ error: 'Transaction not found' }, 404);
    }

    return c.json(data[0]);
  } catch (error) {
    console.error('Error fetching transaction by ID:', error);
    return c.json({ error: 'Failed to fetch transaction' }, 500);
  }
};

/**
 * Handler para criar um novo lançamento financeiro.
 * (POST /financial)
 */
export const createFinancialTransaction = async (c: FinancialContext) => {
  const db = c.var.db;
  const user = c.var.user;
  
  // O payload já está em camelCase (validado pelo Zod no Passo 2)
  // Ex: { amount: 100, paymentMethod: 'pix', ... }
  const newTransaction = c.req.valid('json');

  try {
    const data = await db
      .insert(financialTransactions)
      .values({
        ...newTransaction,
        userId: user.id, // Garante associação ao usuário logado
      })
      .returning();

    // O retorno do Drizzle também será em camelCase automaticamente (Passo 1)
    return c.json(data[0], 201);
  } catch (error) {
    console.error('Error creating transaction:', error);
    return c.json({ error: 'Failed to create transaction' }, 500);
  }
};

/**
 * Handler para atualizar um lançamento financeiro existente.
 * (PUT /financial/:id)
 */
export const updateFinancialTransaction = async (c: FinancialContext) => {
  const db = c.var.db;
  const user = c.var.user;
  const { id } = c.req.param();
  
  // Payload em camelCase
  const updatedValues = c.req.valid('json');

  try {
    const data = await db
      .update(financialTransactions)
      .set(updatedValues) // Drizzle mapeia automaticamente camelCase -> snake_case
      .where(
        and(
          eq(financialTransactions.id, id),
          eq(financialTransactions.userId, user.id), // RLS/Tenancy
        ),
      )
      .returning();

    if (data.length === 0) {
      return c.json({ error: 'Transaction not found' }, 404);
    }

    return c.json(data[0]);
  } catch (error) {
    console.error('Error updating transaction:', error);
    return c.json({ error: 'Failed to update transaction' }, 500);
  }
};

/**
 * Handler para deletar um lançamento financeiro existente.
 * (DELETE /financial/:id)
 */
export const deleteFinancialTransaction = async (c: FinancialContext) => {
  const db = c.var.db;
  const user = c.var.user;
  const { id } = c.req.param();

  try {
    const data = await db
      .delete(financialTransactions)
      .where(
        and(
          eq(financialTransactions.id, id),
          eq(financialTransactions.userId, user.id), // RLS/Tenancy
        ),
      )
      .returning();

    if (data.length === 0) {
      return c.json({ error: 'Transaction not found' }, 404);
    }

    return c.json(data[0]);
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return c.json({ error: 'Failed to delete transaction' }, 500);
  }
};