import { z } from 'zod';

export const ClientSchema = z.object({
  id: z.number().positive(),
  name: z.string().min(1, 'Nome do cliente é obrigatório'),
  email: z.string().email({ message: 'Email inválido' }).nullable(),
  phone: z.string().nullable(),
  // Implementação da validação robusta de data
  birth_date: z.coerce.date()
    .refine((date) => date <= new Date(), {
      message: "Data de nascimento não pode ser no futuro"
    })
    .nullable(),
  gender: z.enum(['masculino', 'feminino', 'outro']).nullable(),
  how_found: z.string().nullable().optional(),
  created_at: z
    .string()
    .datetime({ message: 'Data de criação inválida' })
    .or(z.date()),
  updated_at: z
    .string()
    .datetime({ message: 'Data de atualização inválida' })
    .or(z.date())
    .optional(),
});

export const CreateClientSchema = ClientSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type Client = z.infer<typeof ClientSchema>;
export type CreateClientInput = z.infer<typeof CreateClientSchema>;