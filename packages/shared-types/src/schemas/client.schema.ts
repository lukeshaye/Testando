import { z } from 'zod';

export const ClientSchema = z.object({
  id: z.number().positive(),
  name: z.string().min(1, 'Nome do cliente é obrigatório'),
  email: z.string().email({ message: 'Email inválido' }).nullable(),
  phone: z.string().nullable(),
  birth_date: z
    .string()
    .min(10, 'Data deve estar no formato YYYY-MM-DD')
    .max(new Date().toISOString().split('T')[0], 'Data não pode ser no futuro') // Garante que a data não seja futura
    .nullable(),
  gender: z.enum(['masculino', 'feminino', 'outro']).nullable(),
  created_at: z.date(),
});

export const CreateClientSchema = ClientSchema.omit({
  id: true,
  created_at: true,
});

export type Client = z.infer<typeof ClientSchema>;
export type CreateClientInput = z.infer<typeof CreateClientSchema>;