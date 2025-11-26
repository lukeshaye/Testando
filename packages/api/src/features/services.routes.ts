/**
 * /packages/api/src/features/services/services.routes.ts
 *
 * (Executor: Implementando estritamente o $$PLANO_DE_FEATURE$$)
 *
 * [cite_start]De Onde (Refatoração): Rotas de src/worker/index.ts. [cite: 98]
 * [cite_start]O Quê (Lógica): Definir rotas Hono para a feature 'services'. [cite: 99]
 * Como (Princípios):
 * - [cite_start]SoC (2.5): Responsável apenas pelo roteamento. [cite: 101]
 * - [cite_start]Importar e aplicar o authMiddleware de core/auth.ts. [cite: 102]
 * - [cite_start]DSpP (2.16): Importar zValidator e os Schemas Zod (do Módulo 1) e aplicá-los. [cite: 103]
 * - [cite_start]Importar handlers de services.handlers.ts. [cite: 104]
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware } from '../../core/auth';
import {
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
} from './services.handlers';

// Assumindo que os schemas Zod (do Módulo 1) estão disponíveis
// (ex: @repo/db/schema/zod ou similar)
[cite_start]// [cite: 8, 103]
import {
  insertServiceSchema, // Usado para criação
  updateServiceSchema, // Usado para atualização
} from '@repo/db/schema/zod'; // Caminho hipotético baseado no Módulo 1

const servicesRoutes = new Hono();

[cite_start]// Aplicar middleware de autenticação a todas as rotas de 'services' [cite: 102]
servicesRoutes.use('*', authMiddleware);

// Definir rotas
servicesRoutes.get('/', getServices);

servicesRoutes.post(
  '/',
  [cite_start]zValidator('json', insertServiceSchema), // [cite: 103]
  createService
);

servicesRoutes.get('/:id', getServiceById);

servicesRoutes.put(
  '/:id',
  [cite_start]zValidator('json', updateServiceSchema), // [cite: 103]
  updateService
);

servicesRoutes.delete('/:id', deleteService);

export default servicesRoutes;