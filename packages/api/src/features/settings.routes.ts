/**
 * /packages/api/src/features/settings/settings.routes.ts
 *
 * Define as rotas Hono para a feature 'settings'.
 *
 * De Onde (Refatoração): [cite: 98] Rotas de src/worker/index.ts.
 * O Quê (Lógica): [cite: 99] Definir rotas Hono para a feature.
 * Como (Princípios):
* [cite: 101] SoC (2.5): Responsável apenas pelo roteamento.
* [cite: 103] DSpP (2.16): Usa zValidator com schemas Zod (Módulo 1).
* [cite: 102] Aplica o authMiddleware.
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';

// Importa os schemas Zod (Módulo 1) - Assumindo o path do monorepo
// O plano não especifica o nome do schema de settings, mas ele é necessário para a validação.
// Assumindo 'UpdateSettingsSchema' com base na lógica do handler 'updateSettings'.
import { UpdateSettingsSchema } from '@repo/db/schema/zod-schemas';

// Importa o middleware de autenticação [cite: 102]
import { authMiddleware } from '../../core/auth';

// Importa os handlers [cite: 104]
import { getSettings, updateSettings } from './settings.handlers';

// Importa os tipos Hono (Tarefa 3.4)
import { Variables } from '../../types';

// Cria a nova instância do Hono com tipagem [cite: 144]
const settingsRoutes = new Hono<{ Variables: Variables }>();

// Aplica o middleware de autenticação a todas as rotas de 'settings' [cite: 102]
settingsRoutes.use('*', authMiddleware);

/**
 * Rota: GET /
 * Busca as configurações do usuário autenticado.
 */
settingsRoutes.get(
  '/',
  getSettings
);

/**
 * Rota: POST /
 * Cria ou atualiza (Upsert) as configurações do usuário.
* [cite: 103] Valida o body da requisição usando o schema Zod (Módulo 1).
 */
settingsRoutes.post(
  '/',
zValidator('json', UpdateSettingsSchema), // [cite: 103]
  updateSettings
);

export default settingsRoutes;