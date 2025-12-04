/**
 * /packages/api/src/features/dashboard/dashboard.routes.ts
 *
 * (Executor: Implementação da Feature Dashboard)
 *
 * Responsabilidade: Definição de rotas e middlewares.
 * Princípios:
 * - SoC (2.5): Separa roteamento de lógica.
 */

import { Hono } from 'hono';
import { authMiddleware } from '../../core/auth';
import { getDashboardStats, getWeeklyChart } from './dashboard.handlers';
import { Variables } from '../../types';

const dashboardRoutes = new Hono<{ Variables: Variables }>();

// Aplica autenticação em todas as rotas do dashboard
dashboardRoutes.use('*', authMiddleware);

// GET /api/dashboard/stats
// Retorna KPIs do dia
dashboardRoutes.get('/stats', getDashboardStats);

// GET /api/dashboard/chart
// Retorna dados para o gráfico semanal
dashboardRoutes.get('/chart', getWeeklyChart);

export default dashboardRoutes;