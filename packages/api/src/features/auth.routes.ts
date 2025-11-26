import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { signInHandler, signUpHandler } from './auth.handlers'; [cite_start]// [cite: 104]

[cite_start]// [cite: 103] [cite_start]Importando os schemas Zod definidos no Módulo 1 [cite: 8]
// Assumindo que o Módulo 1 os disponibiliza em um pacote (ex: @salonflow/schemas)
import { SignInSchema, SignUpSchema } from '@salonflow/schemas';

/**
 [cite_start]* [cite: 101] Responsável apenas pelo roteamento de autenticação (SoC).
 * Estas rotas são públicas e não usam o 'authMiddleware',
 * pois são usadas para obter o token.
 */
export const authRoutes = new Hono()
  .post(
    '/signin',
    [cite_start]// [cite: 103] (DSpP 2.16): Validar o corpo da requisição
    zValidator('json', SignInSchema),
    [cite_start]signInHandler, // [cite: 133]
  )
  .post(
    '/signup',
    [cite_start]// [cite: 103] (DSpP 2.16): Validar o corpo da requisição
    zValidator('json', SignUpSchema),
    [cite_start]signUpHandler, // [cite: 133]
  );