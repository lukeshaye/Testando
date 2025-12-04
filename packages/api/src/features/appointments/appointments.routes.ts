/**
 * /packages/api/src/features/appointments/appointments.routes.ts
 *
 * (Executor: LLM 2)
 *
 * Tarefa: 3.3 [cite: 95, 135]
 * De Onde: Rotas de src/worker/index.ts. [cite: 98, 136]
 * O Quê: Definir rotas Hono para a feature 'appointments'. [cite: 99, 135]
 * Como:
 * - Responsável apenas pelo roteamento (SoC 2.5). [cite: 101]
 * - Importar e aplicar o authMiddleware. [cite: 102]
 * - Importar zValidator e schemas (do Módulo 1) para rotas POST/PUT (DSpP 2.16). [cite: 103]
 * - Importar handlers de appointments.handlers.ts. [cite: 104]
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware } from '../../core/auth'; // [cite: 102]

// Importando os schemas (do Módulo 1 / @repo/schemas) [cite: 103]
// Assumindo que os schemas Zod de appointments existem em @repo/schemas
import {
  CreateAppointmentSchema,
  UpdateAppointmentSchema,
} from '@repo/schemas';

// Importando os handlers [cite: 104]
import {
  getAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  deleteAppointment,
} from './appointments.handlers';

const appointmentsRoutes = new Hono();

// Aplicar o middleware de autenticação a todas as rotas de agendamentos [cite: 102]
appointmentsRoutes.use('*', authMiddleware);

// Rotas CRUD para Appointments

// GET /api/appointments (Listar todos)
appointmentsRoutes.get('/', getAppointments);

// GET /api/appointments/:id (Buscar um)
appointmentsRoutes.get('/:id', getAppointmentById);

// POST /api/appointments (Criar)
appointmentsRoutes.post(
  '/',
zValidator('json', CreateAppointmentSchema), // [cite: 103]
  createAppointment
);

// PUT /api/appointments/:id (Atualizar)
appointmentsRoutes.put(
  '/:id',
zValidator('json', UpdateAppointmentSchema), // [cite: 103]
  updateAppointment
);

// DELETE /api/appointments/:id (Deletar)
appointmentsRoutes.delete('/:id', deleteAppointment);

export default appointmentsRoutes;