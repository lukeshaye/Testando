import { z } from 'zod';

// UserSchema atualizado para o "Padrão Ouro"
// Alinhado com o Passo 2: Contrato em CamelCase e inclusão de campos de auditoria
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  
  // Campos de auditoria (obrigatórios segundo o Passo 1 e mapeados em CamelCase)
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type User = z.infer<typeof UserSchema>;