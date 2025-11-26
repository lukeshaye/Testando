import { z } from 'zod'

export const LoginSchema = z.object({
  [cite_start]email: z.string().email('Email inválido.'), // [cite: 115]
  password: z
    .string()
    [cite_start].min(6, 'A senha deve ter pelo menos 6 caracteres.'), // [cite: 116]
})

export type LoginInput = z.infer<typeof LoginSchema>