/**
 * /packages/api/src/features/appointments/appointments.routes.ts
 *
 * Correção conforme Plano de Ação: Item 2
 * - Correção do path de importação para @salonflow/shared-types.
 * - Manutenção da validação Zod (DSpP 2.16).
 * - Manutenção da responsabilidade única de roteamento (SoC 2.5).
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware } from '../../core/auth';

// CORREÇÃO: Importando do pacote correto definido no monorepo
// Anteriormente: @repo/schemas -> Agora: @salonflow/shared-types
import {
  CreateAppointmentSchema,
  UpdateAppointmentSchema,
} from '@salonflow/shared-types';

import {
  getAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  deleteAppointment,
} from './appointments.handlers';

const appointmentsRoutes = new Hono();

// Aplicar o middleware de autenticação a todas as rotas de agendamentos
// Princípio 2.16 (DSpP): Segurança por padrão, validação de auth na borda[cite: 113].
appointmentsRoutes.use('*', authMiddleware);

// Rotas CRUD para Appointments

// GET /api/appointments (Listar todos)
appointmentsRoutes.get('/', getAppointments);

// GET /api/appointments/:id (Buscar um)
appointmentsRoutes.get('/:id', getAppointmentById);

// POST /api/appointments (Criar)
// Aplica validação estrita do schema de entrada antes de passar para o handler (DSpP) 
appointmentsRoutes.post(
  '/',
  zValidator('json', CreateAppointmentSchema),
  createAppointment
);

// PUT /api/appointments/:id (Atualizar)
// Aplica validação estrita do schema de atualização (DSpP) 
appointmentsRoutes.put(
  '/:id',
  zValidator('json', UpdateAppointmentSchema),
  updateAppointment
);

// DELETE /api/appointments/:id (Deletar)
appointmentsRoutes.delete('/:id', deleteAppointment);

export default appointmentsRoutes;