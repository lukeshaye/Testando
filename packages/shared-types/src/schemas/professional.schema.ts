import { z } from 'zod';

// Regex para validar formato HH:MM (estrito: exige 2 dígitos para hora)
// Princípio 2.16 (DSpP): Zero Trust - rejeita formatos ambíguos como "9:00"
export const TIME_REGEX = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

/**
 * Schema para criação de um novo profissional.
 * Não inclui campos gerenciados pelo banco (id, createdAt, updatedAt).
 * Refatorado para camelCase conforme Passo 2 do plano de implementação.
 */
export const CreateProfessionalSchema = z.object({
  name: z.string().min(1, 'Nome do profissional é obrigatório'),
  email: z.string().email({ message: 'Email inválido' }),
  phone: z.string().nullable().or(z.literal('')),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, {
      message: 'Cor deve estar no formato hexadecimal #RRGGBB',
    }),
  
  // Aplicação de Coerção para robustez com formulários HTML
  salary: z.coerce
    .number()
    .positive({ message: 'Salário deve ser um valor positivo' }),
  
  // Refatorado: commission_rate -> commissionRate
  commissionRate: z.coerce
    .number()
    .min(0, 'Comissão não pode ser negativa')
    .max(100, 'Comissão não pode exceder 100'),

  // Campos de horário de trabalho (Refatorado para camelCase)
  workStartTime: z
    .string()
    .regex(TIME_REGEX, { message: 'Formato HH:MM inválido' })
    .nullable(),
  workEndTime: z
    .string()
    .regex(TIME_REGEX, { message: 'Formato HH:MM inválido' })
    .nullable(),
  lunchStartTime: z
    .string()
    .regex(TIME_REGEX, { message: 'Formato HH:MM inválido' })
    .nullable(),
  lunchEndTime: z
    .string()
    .regex(TIME_REGEX, { message: 'Formato HH:MM inválido' })
    .nullable(),
});

/**
 * Schema completo do profissional, incluindo campos do banco.
 * Reflete o objeto de domínio usado na aplicação (camelCase).
 */
export const ProfessionalSchema = CreateProfessionalSchema.extend({
  id: z.number().int().positive(),
  
  // Refatorado: created_at -> createdAt
  createdAt: z
    .string()
    .datetime({ message: 'Data de criação inválida' })
    .or(z.date()),
    
  // Refatorado: updated_at -> updatedAt
  updatedAt: z
    .string()
    .datetime({ message: 'Data de atualização inválida' })
    .or(z.date()),
});

// Tipos inferidos para uso na aplicação
export type CreateProfessionalInput = z.infer<typeof CreateProfessionalSchema>;
export type Professional = z.infer<typeof ProfessionalSchema>;