import { z } from 'zod';

// Define o regex para o formato HH:MM (baseado no )
export const TIME_REGEX = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

// Schema para Horários de Funcionamento (BusinessHoursSchema)
export const BusinessHoursSchema = z.object({
  id: z.number().int().positive().optional(), // Assumindo que pode ter um ID do banco
  day_of_week: z
    .number()
    .int()
    .min(0, 'Dia da semana deve ser entre 0 (Domingo) e 6 (Sábado)') // 
    .max(6, 'Dia da semana deve ser entre 0 (Domingo) e 6 (Sábado)'), // 
  start_time: z
    .string()
    .regex(TIME_REGEX, 'Formato HH:MM inválido')
    .nullable(), // 
  end_time: z.string().regex(TIME_REGEX, 'Formato HH:MM inválido').nullable(), // 
});

// Schema para Exceções de Horário (BusinessExceptionSchema)
export const BusinessExceptionSchema = z.object({
  id: z.number().int().positive().optional(), // Assumindo que pode ter um ID do banco
  exception_date: z.coerce.date({
    // (Usando coerce para DSpP, convertendo string para Date)
    errorMap: () => ({ message: 'Data da exceção inválida.' }),
  }),
  description: z
    .string()
    .min(1, { message: 'A descrição da exceção é obrigatória.' }), // 
  start_time: z
    .string()
    .regex(TIME_REGEX, 'Formato HH:MM inválido')
    .nullable(), // 
  end_time: z.string().regex(TIME_REGEX, 'Formato HH:MM inválido').nullable(), // 
});

// Exporta os tipos inferidos
export type BusinessHours = z.infer<typeof BusinessHoursSchema>;
export type BusinessException = z.infer<typeof BusinessExceptionSchema>;