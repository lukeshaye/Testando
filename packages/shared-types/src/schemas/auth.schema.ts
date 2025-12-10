import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email({ message: 'Email inválido.' }),
  password: z.string()
    // Removida a validação redundante de .min(1) que continha mensagem incorreta.
    // Mantida apenas a regra autoritativa de tamanho mínimo (Princípio 2.2 DRY e 2.3 KISS).
    .min(6, { message: 'A senha deve ter pelo menos 6 caracteres.' }),
});

export type LoginInput = z.infer<typeof LoginSchema>;