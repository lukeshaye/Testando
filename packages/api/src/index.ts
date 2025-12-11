/**
 * Arquivo: /packages/api/src/index.ts
 *
 * Objetivo: Entrypoint principal do Hono.
 * Baseado no $$PLANO_DE_FEATURE$$ - Tarefa 3.4
 */

import { Hono } from 'hono';
import { Bindings, Variables } from './types';
import {
  injectorMiddleware,
  corsMiddleware, // CORREÇÃO 1: Importando o nome correto exportado pelo middleware.ts
  errorHandler,
} from './core/middleware';

// Importação das rotas de feature
import { authRoutes } from './features/auth/auth.routes';
import { clientsRoutes } from './features/clients/clients.routes';
import { professionalsRoutes } from './features/professionals/professionals.routes';
import { servicesRoutes } from './features/services/services.routes';
import { productsRoutes } from './features/products/products.routes';
// CORREÇÃO 2: Alterado para importação default, pois o arquivo exporta 'export default appointmentsRoutes'
import appointmentsRoutes from './features/appointments/appointments.routes'; 
import { financialRoutes } from './features/financial/financial.routes';
import { settingsRoutes } from './features/settings/settings.routes';
import dashboardRoutes from './features/dashboard/dashboard.routes';

// Criar app Hono com tipos
const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Registrar handler global de erro e aplicar middlewares globais
app.onError(errorHandler);
// CORREÇÃO 3: Usando a função correta importada (corsMiddleware)
app.use('*', corsMiddleware);
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
app.route('/api/dashboard', dashboardRoutes);

// Exportar app
export default app;