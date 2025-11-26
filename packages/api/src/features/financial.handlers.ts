/**
 * /packages/api/src/features/financial/financial.handlers.ts
 *
 * (Executor: Implementação Tática)
 *
 * Este arquivo contém os handlers (controladores) para a feature 'financial'.
 * A lógica de negócios (queries) é implementada aqui, seguindo as diretrizes do plano.
 *
 * Princípios Aplicados:
 * - DIP (2.9) / Pilar 2: Os handlers dependem da abstração c.var.db (Drizzle injetado),
 * [cite_start]não de um cliente Supabase específico. [cite: 109, 137]
 * - DSpP (2.16) / Pilar 13: A lógica de RLS/Tenancy (isolamento por usuário) é
 * [cite_start]aplicada em todas as queries usando o c.var.user.id. [cite: 137]
 * - SoC (2.5): Este arquivo foca exclusivamente na lógica de manipulação dos
 * [cite_start]dados (handlers), separado do roteamento e validação (routes.ts). [cite: 108]
 */

import type { Context } from 'hono';
import { Variables } from '../../types';
import { eq, desc, and } from 'drizzle-orm';
// Importa o schema Drizzle (Módulo 2)
import { financialTransactions } from '@db/schema';
[cite_start]// A validação Zod (Módulo 1) é aplicada em .routes.ts [cite: 103]
[cite_start]// Os handlers recebem o dado validado via c.req.valid('json') [cite: 117]

// Define o tipo do Contexto com as Variáveis injetadas para type safety
type FinancialContext = Context<{ Variables: Variables }>;

/**
 * Handler para buscar todos os lançamentos financeiros do usuário logado.
 * (GET /financial)
 */
export const getFinancialTransactions = async (c: FinancialContext) => {
  [cite_start]const db = c.var.db; [cite: 109, 137]
  [cite_start]const user = c.var.user; [cite: 111, 137]

  try {
    const data = await db
      .select()
      .from(financialTransactions)
      [cite_start].where(eq(financialTransactions.userId, user.id)) // [cite: 113, 137]
      .orderBy(desc(financialTransactions.date)); // Ordenação padrão

    [cite_start]return c.json(data); [cite: 114]
  } catch (error) {
    // (PTE 2.15) Error handling básico
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
          [cite_start]eq(financialTransactions.userId, user.id), // [cite: 137]
        ),
      );

    if (data.length === 0) {
      return c.json({ error: 'Transaction not found' }, 404);
    }

    return c.json(data[0]);
  } catch (error) {
    return c.json({ error: 'Failed to fetch transaction' }, 500);
  }
};

/**
 * Handler para criar um novo lançamento financeiro.
 * (POST /financial)
 */
export const createFinancialTransaction = async (c: FinancialContext) => {
  const db = c.var.db;
  [cite_start]const user = c.var.user; [cite: 118]
  const newTransaction = c.req.valid('json'); [cite_start]// [cite: 117]

  try {
    const data = await db
      .insert(financialTransactions)
      .values({
        ...newTransaction,
        [cite_start]userId: user.id, // [cite: 120, 137]
      })
      .returning(); [cite_start]// [cite: 120]

    [cite_start]return c.json(data[0], 201); [cite: 121]
  } catch (error) {
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
      .update(financialTransactions)
      .set(updatedValues)
      .where(
        and(
          eq(financialTransactions.id, id),
          [cite_start]eq(financialTransactions.userId, user.id), // [cite: 137]
        ),
      )
      .returning();

    if (data.length === 0) {
      return c.json({ error: 'Transaction not found' }, 404);
    }

    return c.json(data[0]);
  } catch (error) {
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
          [cite_start]eq(financialTransactions.userId, user.id), // [cite: 137]
        ),
      )
      .returning();

    if (data.length === 0) {
      return c.json({ error: 'Transaction not found' }, 404);
    }

    return c.json(data[0]);
  } catch (error) {
    return c.json({ error: 'Failed to delete transaction' }, 500);
  }
};