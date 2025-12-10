/**
 * /packages/api/src/features/settings/settings.handlers.ts
 *
 * Implementação dos handlers para a feature 'settings' seguindo o Padrão Ouro.
 *
 * Mudanças aplicadas (Refatoração Passo 3):
 * - Uso estrito de camelCase nas variáveis e propriedades (ex: userId).
 * - Remoção de qualquer mapeamento manual. O Drizzle cuida da tradução para snake_case.
 * - Manutenção da segurança (Tenancy) via injeção de user_id[cite: 113].
 */

import { Context } from 'hono';
import { eq } from 'drizzle-orm';
// Importa o schema (Atualizado no Passo 1 com mapeamento snake_case -> camelCase)
import { settings } from '@repo/db/schema';
// Importa os tipos Hono
import { Variables } from '../../types';

// Define o tipo de Context com as Variables injetadas
type HandlerContext = Context<{ Variables: Variables }>;

/**
 * getSettings
 * * Busca as configurações. O retorno do Drizzle já virá em camelCase
 * graças ao mapeamento definido no schema do Passo 1.
 */
export const getSettings = async (c: HandlerContext) => {
  // Obtém o usuário autenticado (DIP/Security)
  const user = c.var.user;

  // Busca no banco usando a chave camelCase do schema (settings.userId)
  // O Drizzle traduz isso para SQL 'WHERE user_id = ...'
  const data = await c.var.db
    .select()
    .from(settings)
    .where(eq(settings.userId, user.id))
    .limit(1);

  // Retorna o objeto diretamente. O frontend receberá camelCase.
  return c.json(data[0] || null);
};

/**
 * updateSettings (Upsert)
 * * Recebe payload em camelCase (validado pelo Zod no Passo 2) e persiste.
 */
export const updateSettings = async (c: HandlerContext) => {
  // Obtém o body validado (Zod Schema já está em camelCase no Passo 2)
  const settingsData = c.req.valid('json');
  const user = c.var.user;

  // Upsert limpo, sem "malabarismos" de renomeação de propriedades.
  // Princípio KISS (2.3) e DRY (2.2)[cite: 22, 14].
  const data = await c.var.db
    .insert(settings)
    .values({
      ...settingsData,
      userId: user.id, // Garante a posse do registro (Security)
    })
    .onConflictDoUpdate({
      target: settings.userId, // Alvo do conflito (chave única)
      set: settingsData,       // Atualiza com os dados recebidos
    })
    .returning(); // Retorna o registro atualizado (já em camelCase)

  return c.json(data[0], 200);
};