import { z } from 'zod';

export const ClientSchema = z.object({
  id: z.number().positive(),
  name: z.string().min(1, 'Nome do cliente é obrigatório'),
  email: z.string().email({ message: 'Email inválido' }).nullable(),
  phone: z.string().nullable(),
  
  // Refatorado: birth_date -> birthDate
  // Mantida a validação robusta de data conforme Princípio de Design Seguro (2.16)
  birthDate: z.coerce.date()
    .refine((date) => date <= new Date(), {
      message: "Data de nascimento não pode ser no futuro"
    })
    .nullable(),
    
  gender: z.enum(['masculino', 'feminino', 'outro']).nullable(),
  
  // Refatorado: how_found -> howFound
  howFound: z.string().nullable().optional(),
  
  // Refatorado: created_at -> createdAt
  createdAt: z
    .string()
    .datetime({ message: 'Data de criação inválida' })
    .or(z.date()),
    
  // Refatorado: updated_at -> updatedAt
  updatedAt: z
    .string()
    .datetime({ message: 'Data de atualização inválida' })
    .or(z.date())
    .optional(),
});

export const CreateClientSchema = ClientSchema.omit({
  id: true,
  createdAt: true, // Atualizado para omitir a nova chave em camelCase
  updatedAt: true, // Atualizado para omitir a nova chave em camelCase
});

export type Client = z.infer<typeof ClientSchema>;
export type CreateClientInput = z.infer<typeof CreateClientSchema>;