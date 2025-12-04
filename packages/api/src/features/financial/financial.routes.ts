/**
 * /packages/api/src/features/financial/financial.routes.ts
 *
 * (Executor: Implementação Tática)
 *
 * Este arquivo define as rotas Hono para a feature 'financial'.
 *
 * Princípios Aplicados:
 * - SoC (2.5)[cite: 101]: Este arquivo é responsável apenas pelo roteamento
 * e pela aplicação de middlewares específicos da rota (autenticação e validação).
 * - DSpP (2.16)[cite: 103]: Utiliza o zValidator para garantir que os dados de
 * entrada (payloads JSON) estejam em conformidade com os schemas Zod
 * definidos no Módulo 1, antes de chegarem aos handlers.
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware } from '../../core/auth';
import {
// Importa os handlers (lógica) [cite: 104]
  getFinancialTransactions,
  getFinancialTransactionById,
  createFinancialTransaction,
  updateFinancialTransaction,
  deleteFinancialTransaction,
} from './financial.handlers';
import {
// Importa os schemas Zod do Módulo 1 [cite: 103]
  CreateFinancialTransactionSchema,
  UpdateFinancialTransactionSchema,
} from '@shared/types'; // (Assume-se que estes tipos vêm do Módulo 1)

// Cria uma nova instância do Hono para este grupo de rotas
const financialRoutes = new Hono();

// Aplica o middleware de autenticação a TODAS as rotas de 'financial' [cite: 102]
financialRoutes.use('*', authMiddleware);

// --- Definição das Rotas ---

/**
 * GET /financial
 * Busca todos os lançamentos financeiros do usuário.
 */
financialRoutes.get('/', getFinancialTransactions);

/**
 * GET /financial/:id
 * Busca um lançamento financeiro específico pelo ID.
 */
financialRoutes.get('/:id', getFinancialTransactionById);

/**
 * POST /financial
 * Cria um novo lançamento financeiro.
 * Aplica validação Zod ao corpo da requisição[cite: 103].
 */
financialRoutes.post(
  '/',
  zValidator('json', CreateFinancialTransactionSchema),
  createFinancialTransaction,
);

/**
 * PUT /financial/:id
 * Atualiza um lançamento financeiro existente.
 * Aplica validação Zod ao corpo da requisição[cite: 103].
 */
financialRoutes.put(
  '/:id',
  zValidator('json', UpdateFinancialTransactionSchema),
  updateFinancialTransaction,
);

/**
 * DELETE /financial/:id
 * Deleta um lançamento financeiro existente.
 */
financialRoutes.delete('/:id', deleteFinancialTransaction);

export default financialRoutes;