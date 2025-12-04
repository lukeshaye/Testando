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
import { Bindings, Variables } from './types';
import {
  injectorMiddleware,
  cors,
  errorHandler,
} from './core/middleware';

// Importação das rotas de feature
import { authRoutes } from './features/auth/auth.routes';
import { clientsRoutes } from './features/clients/clients.routes';
import { professionalsRoutes } from './features/professionals/professionals.routes';
import { servicesRoutes } from './features/services/services.routes';
import { productsRoutes } from './features/products/products.routes';
import { appointmentsRoutes } from './features/appointments/appointments.routes';
import { financialRoutes } from './features/financial/financial.routes';
import { settingsRoutes } from './features/settings/settings.routes';

// Criar app Hono com tipos
const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Registrar handler global de erro e aplicar middlewares globais
app.onError(errorHandler);
app.use('*', cors);
app.use('*', injectorMiddleware);

// Montar todas as rotas de feature
app.route('/api/auth', authRoutes);
app.route('/api/clients', clientsRoutes);
app.route('/api/professionals', professionalsRoutes);
app.route('/api/services', servicesRoutes);
app.route('/api/products', productsRoutes);
app.route('/api/appointments', appointmentsRoutes);
app.route('/api/financial', financialRoutes);
app.route('/api/settings', settingsRoutes);

// Exportar app
export default app;