import { z } from 'zod';

// Criar um UserSchema básico.
// Manter o schema simples, pois não temos requisitos complexos de usuário ainda.
export const UserSchema = z.object({
  // 
  id: z.string().uuid(),
  // 
  email: z.string().email(),
});

export type User = z.infer<typeof UserSchema>;