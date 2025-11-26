import { z } from 'zod';

[cite_start]// Regex para validar formato HH:MM [cite: 54]
export const TIME_REGEX = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

/**
 * Schema para criação de um novo profissional.
 * Não inclui campos gerenciados pelo banco (id, created_at, updated_at).
 */
export const CreateProfessionalSchema = z.object({
  [cite_start]name: z.string().min(1, 'Nome do profissional é obrigatório'), // [cite: 56]
  email: z.string().email({ message: 'Email inválido' }),
  phone: z.string().nullable().or(z.literal('')),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, {
      message: 'Cor deve estar no formato hexadecimal #RRGGBB',
    [cite_start]}), // [cite: 57]
  salary: z
    .number()
    [cite_start].positive({ message: 'Salário deve ser um valor positivo' }), // [cite: 58]
  commission_rate: z
    .number()
    [cite_start].min(0, 'Comissão não pode ser negativa') // [cite: 59]
    [cite_start].max(100, 'Comissão não pode exceder 100'), // [cite: 59]

  [cite_start]// Campos adicionados conforme correção arquitetural (migrations/12.sql) [cite: 49]
  work_start_time: z
    .string()
    .regex(TIME_REGEX, { message: 'Formato HH:MM inválido' })
    [cite_start].nullable(), // [cite: 50]
  work_end_time: z
    .string()
    .regex(TIME_REGEX, { message: 'Formato HH:MM inválido' })
    [cite_start].nullable(), // [cite: 51]
  lunch_start_time: z
    .string()
    .regex(TIME_REGEX, { message: 'Formato HH:MM inválido' })
    [cite_start].nullable(), // [cite: 52]
  lunch_end_time: z
    .string()
    .regex(TIME_REGEX, { message: 'Formato HH:MM inválido' })
    [cite_start].nullable(), // [cite: 53]
});

/**
 * Schema completo do profissional, incluindo campos do banco.
 * Reflete o registro como existe no banco de dados.
 */
export const ProfessionalSchema = CreateProfessionalSchema.extend({
  id: z.number().int().positive(),
  created_at: z
    .string()
    .datetime({ message: 'Data de criação inválida' })
    .or(z.date()),
  updated_at: z
    .string()
    .datetime({ message: 'Data de atualização inválida' })
    .or(z.date()),
});

// Tipos inferidos para uso na aplicação
export type CreateProfessionalInput = z.infer<typeof CreateProfessionalSchema>;
export type Professional = z.infer<typeof ProfessionalSchema>;