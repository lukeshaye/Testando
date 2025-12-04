import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { signInHandler, signUpHandler } from './auth.handlers'; // [cite: 104]

// [cite: 103] Importando os schemas Zod definidos no Módulo 1 [cite: 8]
// Assumindo que o Módulo 1 os disponibiliza em um pacote (ex: @salonflow/schemas)
import { SignInSchema, SignUpSchema } from '@salonflow/schemas';

/**
* [cite: 101] Responsável apenas pelo roteamento de autenticação (SoC).
 * Estas rotas são públicas e não usam o 'authMiddleware',
 * pois são usadas para obter o token.
 */
export const authRoutes = new Hono()
  .post(
    '/signin',
// [cite: 103] (DSpP 2.16): Validar o corpo da requisição
    zValidator('json', SignInSchema),
signInHandler, // [cite: 133]
  )
  .post(
    '/signup',
// [cite: 103] (DSpP 2.16): Validar o corpo da requisição
    zValidator('json', SignUpSchema),
signUpHandler, // [cite: 133]
  );