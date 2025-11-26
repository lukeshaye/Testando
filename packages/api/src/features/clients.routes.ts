/**
 * @file /packages/api/src/features/clients/clients.routes.ts
 * 
 * Define as rotas Hono para a feature "clients".
 * Responsável apenas pelo roteamento (SoC). 
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware } from '@api/core/auth'; // 

// Importar handlers
import {
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
} from './clients.handlers';

// Importar o CreateClientSchema do Módulo 1.
// O plano especifica "do Módulo 1", que é o pacote de schemas.
// Assumindo que o schema está acessível via 'packages/schemas' ou 'shared'.
// Por falta de um caminho explícito no plano, usamos um placeholder de
// importação que o Módulo 1 (schemas) deve prover.
// (O Executor assume que o Módulo 1 exportou os schemas para
// um local importável, ex: @api/schemas)
// TODO: Ajustar o path de importação se o Módulo 1 estiver em local diferente.
import { CreateClientSchema } from '@api/schemas';

const clientsRoutes = new Hono();

// Aplica o middleware de autenticação a todas as rotas de clients.
clientsRoutes.use('*', authMiddleware);

// Define as rotas Hono para o CRUD de Clients
clientsRoutes.get('/', getClients);

clientsRoutes.post(
  '/',
  // Aplica validação Zod (DSpP 2.16)
  zValidator('json', CreateClientSchema),
  createClient,
);

clientsRoutes.get('/:id', getClientById);

clientsRoutes.put(
  '/:id',
  // Aplica validação Zod (DSpP 2.16)
  zValidator('json', CreateClientSchema),
  updateClient,
);

clientsRoutes.delete('/:id', deleteClient);

export default clientsRoutes;