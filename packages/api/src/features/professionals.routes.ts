import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { 
  CreateProfessionalSchema, 
  UpdateProfessionalSchema 
} from '@shared/types'; // Assumido do Módulo 1 
import { authMiddleware } from '../../core/auth'; // 
import {
  getProfessionals,
  getProfessionalById,
  createProfessional,
  updateProfessional,
  deleteProfessional
} from './professionals.handlers'; // 
import { Variables } from '../../types';

// Definir rotas Hono para a feature 'professionals'
const professionalsRoutes = new Hono<{ Variables: Variables }>();

// Aplicar o middleware de autenticação a todas as rotas de profissionais
professionalsRoutes.use('*', authMiddleware);

// Rotas CRUD

// GET / (Listar todos)
professionalsRoutes.get('/', getProfessionals);

// GET /:id (Buscar um)
professionalsRoutes.get('/:id', getProfessionalById);

// POST / (Criar)
// Aplicar zValidator para validação de entrada (DSpP 2.16)
professionalsRoutes.post(
  '/',
  zValidator('json', CreateProfessionalSchema), // 
  createProfessional
);

// PUT /:id (Atualizar)
// Aplicar zValidator para validação de entrada (DSpP 2.16)
professionalsRoutes.put(
  '/:id',
  zValidator('json', UpdateProfessionalSchema), // 
  updateProfessional
);

// DELETE /:id (Excluir)
professionalsRoutes.delete('/:id', deleteProfessional);

export default professionalsRoutes;