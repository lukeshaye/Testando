/**
 * /packages/api/src/features/financial/financial.handlers.ts
 *
 * (Executor: Implementação Tática - Passo 3 Refatoração - CORREÇÃO MVP)
 *
 * Atualizado para suportar o padrão CamelCase <-> SnakeCase automático.
 * Correção aplicada: financialTransactions -> financialEntries
 *
 * * Princípios Aplicados:
 * - DIP (2.9): Injeção do DB via Context.
 * - DSpP (2.16): RLS/Tenancy via user.id em todas as queries.
 * - DRY (2.2) & KISS (2.3): Sem conversão manual de dados; confia no Drizzle/Zod.
 */

import type { Context } from 'hono';
import { Variables } from '../../types';
import { eq, desc, and } from 'drizzle-orm';
// CORREÇÃO CRÍTICA: Importando a tabela correta 'financialEntries'
import { financialEntries } from '@db/schema';

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
      .from(financialEntries) // Corrigido
      .where(eq(financialEntries.userId, user.id)) // Corrigido
      .orderBy(desc(financialEntries.date)); // Corrigido

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
      .from(financialEntries) // Corrigido
      .where(
        and(
          eq(financialEntries.id, id), // Corrigido
          eq(financialEntries.userId, user.id), // RLS/Tenancy
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
  const newTransaction = c.req.valid('json');

  try {
    const data = await db
      .insert(financialEntries) // Corrigido
      .values({
        ...newTransaction,
        userId: user.id, // Garante associação ao usuário logado
      })
      .returning();

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
  
  const updatedValues = c.req.valid('json');

  try {
    const data = await db
      .update(financialEntries) // Corrigido
      .set(updatedValues)
      .where(
        and(
          eq(financialEntries.id, id), // Corrigido
          eq(financialEntries.userId, user.id), // RLS/Tenancy
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
      .delete(financialEntries) // Corrigido
      .where(
        and(
          eq(financialEntries.id, id), // Corrigido
          eq(financialEntries.userId, user.id), // RLS/Tenancy
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