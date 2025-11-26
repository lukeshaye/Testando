/**
 * /packages/web/src/lib/api.ts
 *
 * (Executor: LLM 2)
 *
 * OBJETIVO:
 * Conforme a Tarefa 4.6, Item 3 do PLANO_DE_FEATURE_Parte_2_Core.
 * Este arquivo substitui as chamadas diretas ao Supabase (legado: src/shared/store.ts)
 * e cria uma interface de API centralizada usando o cliente Hono RPC (hc).
 *
 * PRINCÍPIOS APLICADOS (do plano):
 * - DIP (2.9) / SoC (2.5): O frontend agora depende desta abstração (api)
 * e não da implementação concreta (supabase-js). A responsabilidade de
 * comunicação com o backend está isolada aqui.
 */

import { hc } from 'hono/client';
// Importa o tipo do 'app' Hono exportado pelo worker.
// O alias '@/' aponta para 'src/' conforme tsconfig.app.json e tsconfig.worker.json.
import type app from '@/worker';

// Define o AppType com base na aplicação Hono do backend.
type AppType = typeof app;

// Configura e exporta a instância do cliente Hono RPC.
// O prefixo '/api' é o caminho base para todas as rotas no worker (src/worker/index.ts).
// Esta instância 'api' será usada em toda a aplicação (via React Query)
// para todas as chamadas de dados, substituindo o Supabase.
export const api = hc<AppType>('/api');