import { z } from 'zod';

// ---------------------------------------------------------------------------
// Aplicação do Princípio 2.2 (DRY - Don't Repeat Yourself)
// ---------------------------------------------------------------------------
// A regex é definida uma única vez como uma constante autoritativa. 
// Formato aceito: HH:MM (ex: 08:00, 23:59).
// Regex estrito: exige 2 dígitos para hora (rejeita "9:00", exige "09:00")
// Princípio 2.16 (DSpP): Zero Trust - rejeita formatos ambíguos
const TIME_REGEX = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
const TIME_ERROR_MESSAGE = 'Formato HH:MM inválido';

// ---------------------------------------------------------------------------
// Schema: BusinessHours (Horários de Funcionamento)
// ---------------------------------------------------------------------------
export const BusinessHoursSchema = z.object({
  id: z.number().int().positive().optional(),
  
  // Refatorado para camelCase (antes: day_of_week)
  dayOfWeek: z
    .number({ invalid_type_error: "O dia da semana deve ser um número." })
    .int("O dia da semana deve ser um número inteiro.")
    .min(0, "O dia deve ser no mínimo 0 (Domingo).")
    .max(6, "O dia deve ser no máximo 6 (Sábado)."),
    
  // Aplicação do Princípio 2.16 (DSpP - Design Seguro por Padrão)
  // Refatorado para camelCase (antes: start_time)
  startTime: z
    .string()
    .regex(TIME_REGEX, TIME_ERROR_MESSAGE)
    .nullable(),
    
  // Refatorado para camelCase (antes: end_time)
  endTime: z
    .string()
    .regex(TIME_REGEX, TIME_ERROR_MESSAGE)
    .nullable(),
});

// ---------------------------------------------------------------------------
// Schema: BusinessException (Exceções de Horário/Feriados)
// ---------------------------------------------------------------------------
export const BusinessExceptionSchema = z.object({
  id: z.number().int().positive().optional(),
  
  // Refatorado para camelCase (antes: exception_date)
  // Mantido z.string().date() para validação estrita do formato ISO (YYYY-MM-DD).
  exceptionDate: z
    .string({ required_error: "A data da exceção é obrigatória." })
    .date("Data inválida"), 
    
  description: z
    .string()
    .min(1, { message: 'Descrição é obrigatória' }),
    
  // Reutilização da constante TIME_REGEX (Princípio 2.2)
  // Refatorado para camelCase (antes: start_time)
  startTime: z
    .string()
    .regex(TIME_REGEX, TIME_ERROR_MESSAGE)
    .nullable()
    .optional(),
    
  // Refatorado para camelCase (antes: end_time)
  endTime: z
    .string()
    .regex(TIME_REGEX, TIME_ERROR_MESSAGE)
    .nullable()
    .optional(),
});

// Exportação dos tipos inferidos para uso no frontend/backend
export type BusinessHours = z.infer<typeof BusinessHoursSchema>;
export type BusinessException = z.infer<typeof BusinessExceptionSchema>;