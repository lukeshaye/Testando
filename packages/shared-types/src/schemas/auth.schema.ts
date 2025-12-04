import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email({ message: 'Email inválido.' }),
  password: z.string()
    .min(1, { message: 'A senha deve ter pelo menos 6 caracteres.' })
    .min(6, { message: 'A senha deve ter pelo menos 6 caracteres.' }),
});

export type LoginInput = z.infer<typeof LoginSchema>;