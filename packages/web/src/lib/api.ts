/**
 * /packages/web/src/lib/api.ts
 *
 * (Executor: LLM 2)
 *
 * OBJETIVO:
 * Conforme a Tarefa 4.6, Item 3 do PLANO_DE_FEATURE_Parte_2_Core.
 * Este arquivo substitui as chamadas diretas ao Supabase e cria uma interface
 * de API centralizada usando o cliente Hono RPC (hc).
 *
 * PRINCÍPIOS APLICADOS:
 * - DIP (2.9) / SoC (2.5): O frontend depende da abstração de tipos fornecida pela API.
 * - Type Safety: Garante que o contrato entre Frontend e Backend seja respeitado em tempo de compilação.
 */

import { hc } from 'hono/client';

// CORREÇÃO (Item 2 do Plano):
// Importa o tipo 'AppType' diretamente do pacote de API (@salonflow/api).
// O arquivo anterior tentava importar de '@/worker' (local), que não existe no contexto do pacote 'web'.
// Nota: Certifique-se de que o 'package.json' do web inclua '@salonflow/api' nas dependências/devDependencies.
import type { AppType } from '@salonflow/api';

// Configura e exporta a instância do cliente Hono RPC.
// O prefixo '/api' é o caminho base para todas as rotas no worker.
// Esta instância 'api' será usada em toda a aplicação (hooks/React Query).
export const api = hc<AppType>('/api');