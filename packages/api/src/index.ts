/**
 * Arquivo: /packages/api/src/index.ts
 *
 * Objetivo: Entrypoint principal do Hono.
 *
 * Refatoração de: src/worker/index.ts
 *
 * Baseado no $$PLANO_DE_FEATURE$$
 * Tarefa 3.4: Entrypoint e Tipos da API
 * Fontes: [139, 140, 141, 142, 143, 144, 145, 146, 147]
 */

import { Hono } from 'hono';
import { Bindings, Variables } from './types'; [cite_start]// [cite: 143]
import {
  injectorMiddleware,
  [cite_start]cors, // [cite: 145]
  [cite_start]errorHandler, // [cite: 145]
} from './core/middleware';

[cite_start]// Importação das rotas de feature [cite: 146]
import { authRoutes } from './features/auth/auth.routes';
import { clientsRoutes } from './features/clients/clients.routes';
import { professionalsRoutes } from './features/professionals/professionals.routes';
import { servicesRoutes } from './features/services/services.routes';
import { productsRoutes } from './features/products/products.routes';
import { appointmentsRoutes } from './features/appointments/appointments.routes';
import { financialRoutes } from './features/financial/financial.routes';
import { settingsRoutes } from './features/settings/settings.routes';

[cite_start]// Criar app Hono com tipos [cite: 144]
const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

[cite_start]// Aplicar middlewares globais na ordem correta [cite: 145]
app.use('*', errorHandler);
app.use('*', cors);
app.use('*', injectorMiddleware);

[cite_start]// Montar todas as rotas de feature [cite: 146]
app.route('/api/auth', authRoutes);
app.route('/api/clients', clientsRoutes);
app.route('/api/professionals', professionalsRoutes);
app.route('/api/services', servicesRoutes);
app.route('/api/products', productsRoutes);
app.route('/api/appointments', appointmentsRoutes);
app.route('/api/financial', financialRoutes);
app.route('/api/settings', settingsRoutes);

[cite_start]// Exportar app [cite: 147]
export default app;