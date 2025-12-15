/**
 * Arquivo: /packages/api/src/index.ts
 * * Objetivo: Entrypoint principal do Hono.
 * Implementa a exportação de tipos para garantir contrato com o cliente (RPC).
 */

import { Hono } from 'hono';
import { Bindings, Variables } from './types';
import {
  injectorMiddleware,
  corsMiddleware,
  errorHandler,
} from './core/middleware';

// Importação das rotas de feature
import { authRoutes } from './features/auth/auth.routes';
import { clientsRoutes } from './features/clients/clients.routes';
import { professionalsRoutes } from './features/professionals/professionals.routes';
import { servicesRoutes } from './features/services/services.routes';
import { productsRoutes } from './features/products/products.routes';
import appointmentsRoutes from './features/appointments/appointments.routes'; 
import { financialRoutes } from './features/financial/financial.routes';
import { settingsRoutes } from './features/settings/settings.routes';
import dashboardRoutes from './features/dashboard/dashboard.routes';

// Criar app Hono com tipos
const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Registrar handler global de erro e aplicar middlewares globais
app.onError(errorHandler);
app.use('*', corsMiddleware);
app.use('*', injectorMiddleware);

// Montar todas as rotas de feature
// A organização segue o Princípio 2.11 (Feature-Based Folders)
app.route('/api/auth', authRoutes);
app.route('/api/clients', clientsRoutes);
app.route('/api/professionals', professionalsRoutes);
app.route('/api/services', servicesRoutes);
app.route('/api/products', productsRoutes);
app.route('/api/appointments', appointmentsRoutes);
app.route('/api/financial', financialRoutes);
app.route('/api/settings', settingsRoutes);
app.route('/api/dashboard', dashboardRoutes);

/**
 * CORREÇÃO CRÍTICA (Item 6 do Plano / Princípio 2.9 - DIP):
 * Exportar o tipo da aplicação (AppType) permite que o frontend
 * crie um cliente RPC tipado sem importar o código runtime do backend.
 */
export type AppType = typeof app;

// Exportar app
export default app;