/**
 * /packages/api/src/features/financial/financial.handlers.ts
 *
 * (Executor: Implementação Tática - Passo 3 Refatoração - CORREÇÃO MVP)
 * * Status: OTIMIZADO
 * - Melhoria no tratamento de erros (Logs contextuais).
 * - Padronização de respostas de API.
 * - Garantia de isolamento por usuário (Tenancy).
 */

import type { Context } from 'hono';
import { Variables } from '../../types';
import { eq, desc, and } from 'drizzle-orm';
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
      .from(financialEntries)
      .where(eq(financialEntries.userId, user.id))
      .orderBy(desc(financialEntries.date));

    return c.json({ success: true, data });
  } catch (error) {
    console.error(`[getFinancialTransactions] User: ${user.id} - Error:`, error);
    return c.json({ success: false, error: 'Failed to fetch transactions' }, 500);
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
      .from(financialEntries)
      .where(
        and(
          eq(financialEntries.id, id),
          eq(financialEntries.userId, user.id), // Segurança: RLS/Tenancy
        ),
      );

    if (data.length === 0) {
      return c.json({ success: false, error: 'Transaction not found' }, 404);
    }

    return c.json({ success: true, data: data[0] });
  } catch (error) {
    console.error(`[getFinancialTransactionById] User: ${user.id} - ID: ${id} - Error:`, error);
    return c.json({ success: false, error: 'Failed to fetch transaction' }, 500);
  }
};

/**
 * Handler para criar um novo lançamento financeiro.
 * (POST /financial)
 */
export const createFinancialTransaction = async (c: FinancialContext) => {
  const db = c.var.db;
  const user = c.var.user;
  
  // O payload já está em camelCase (validado pelo Zod no Middleware anterior)
  const newTransaction = c.req.valid('json');

  try {
    const data = await db
      .insert(financialEntries)
      .values({
        ...newTransaction,
        userId: user.id, // Garante associação ao usuário logado
      })
      .returning();

    return c.json({ success: true, data: data[0] }, 201);
  } catch (error) {
    console.error(`[createFinancialTransaction] User: ${user.id} - Error:`, error);
    return c.json({ success: false, error: 'Failed to create transaction' }, 500);
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
      .update(financialEntries)
      .set(updatedValues)
      .where(
        and(
          eq(financialEntries.id, id),
          eq(financialEntries.userId, user.id), // Segurança: RLS/Tenancy
        ),
      )
      .returning();

    if (data.length === 0) {
      return c.json({ success: false, error: 'Transaction not found' }, 404);
    }

    return c.json({ success: true, data: data[0] });
  } catch (error) {
    console.error(`[updateFinancialTransaction] User: ${user.id} - ID: ${id} - Error:`, error);
    return c.json({ success: false, error: 'Failed to update transaction' }, 500);
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
      .delete(financialEntries)
      .where(
        and(
          eq(financialEntries.id, id),
          eq(financialEntries.userId, user.id), // Segurança: RLS/Tenancy
        ),
      )
      .returning();

    if (data.length === 0) {
      return c.json({ success: false, error: 'Transaction not found' }, 404);
    }

    return c.json({ success: true, data: data[0] });
  } catch (error) {
    console.error(`[deleteFinancialTransaction] User: ${user.id} - ID: ${id} - Error:`, error);
    return c.json({ success: false, error: 'Failed to delete transaction' }, 500);
  }
};