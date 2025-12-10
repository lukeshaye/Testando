import { z } from 'zod';

/**
 * CONSTANTES DE VALIDAÇÃO
 * Princípio 2.2 (DRY): Centralizamos o Regex de hora para garantir consistência. [cite: 14]
 */
// Regex estrito: exige 2 dígitos para hora (rejeita "9:00", exige "09:00")
// Princípio 2.16 (DSpP): Zero Trust - rejeita formatos ambíguos. [cite: 108]
const TIME_REGEX = /^([01][0-9]|2[0-3]):[0-5][0-9]$/; // Formato HH:MM (00:00 a 23:59)

/**
 * SCHEMA BASE DE AGENDAMENTO (Formulário)
 * Refatoração Padrão Ouro: Conversão para camelCase.
 * Princípio 2.16 (DSpP): Validação de borda robusta. [cite: 108]
 * Princípio 2.12 (CQRS): Otimizado para operação de escrita. [cite: 75]
 */
const AppointmentFormBaseSchema = z.object({
  clientId: z.number({ required_error: "Cliente é obrigatório" }).int().positive(),
  professionalId: z.number({ required_error: "Profissional é obrigatório" }).int().positive(),
  serviceId: z.number({ required_error: "Serviço é obrigatório" }).int().positive(),
  
  // z.coerce.date() facilita o binding com inputs HTML que retornam string
  appointmentDate: z.coerce.date({
    required_error: 'A data do agendamento é obrigatória.',
  }),

  // Para formulários, usamos endDate como Date object completo
  endDate: z.coerce.date({
    required_error: 'A data/hora de término é obrigatória.',
  }),

  price: z.number().positive('O preço deve ser um valor positivo.'),
  notes: z.string().optional(),
});

/**
 * SCHEMA DE CRIAÇÃO DE AGENDAMENTO (Formulário)
 * Este schema é usado para formulários que trabalham com Date objects.
 */
export const AppointmentFormSchema = AppointmentFormBaseSchema.refine((data) => {
  /**
   * LÓGICA DE VALIDAÇÃO TEMPORAL
   * Princípio 2.15 (PTE): Lógica determinística e isolada. [cite: 100]
   * Valida que endDate é posterior a appointmentDate.
   */
  return data.endDate > data.appointmentDate;
}, {
  message: "O horário de término deve ser posterior ao início.",
  path: ["endDate"], // Aponta o erro especificamente para o campo endDate
});

/**
 * SCHEMA DE CRIAÇÃO DE AGENDAMENTO (API)
 * Refatoração Padrão Ouro: Conversão para camelCase (startTime, endTime).
 * Princípio 2.12 (CQRS): Otimizado para operação de escrita (separando data e hora). [cite: 75]
 */
export const CreateAppointmentSchema = z.object({
  clientId: z.number({ required_error: "Cliente é obrigatório" }).int().positive(),
  professionalId: z.number({ required_error: "Profissional é obrigatório" }).int().positive(),
  serviceId: z.number({ required_error: "Serviço é obrigatório" }).int().positive(),
  
  appointmentDate: z.coerce.date({
    required_error: 'A data do agendamento é obrigatória.',
  }),

  // Validamos o formato da string de hora antes de processar a lógica
  startTime: z.string().regex(TIME_REGEX, "Formato de hora inválido (HH:MM)"),
  endTime: z.string().regex(TIME_REGEX, "Formato de hora inválido (HH:MM)"),

  price: z.number().positive('O preço deve ser um valor positivo.'),
  notes: z.string().optional(),
})
.refine((data) => {
  /**
   * LÓGICA DE VALIDAÇÃO TEMPORAL
   * Princípio 2.15 (PTE): Lógica determinística e isolada. [cite: 100]
   */
  try {
    const dateStr = data.appointmentDate.toISOString().split('T')[0];
    
    // Note o uso das novas chaves camelCase: startTime e endTime
    const start = new Date(`${dateStr}T${data.startTime}`);
    const end = new Date(`${dateStr}T${data.endTime}`);

    return end > start;
  } catch (e) {
    return false; // Falha segura (DSpP)
  }
}, {
  message: "O horário de término deve ser posterior ao início.",
  path: ["endTime"], // Aponta o erro especificamente para o campo endTime
});

/**
 * SCHEMA COMPLETO DE AGENDAMENTO (Banco de Dados)
 * Princípio 2.5 (SoC): Separação entre schema de criação e schema completo. [cite: 35]
 * Refatoração: createdAt e updatedAt em camelCase.
 */
export const AppointmentSchema = AppointmentFormBaseSchema.extend({
  id: z.number().int().positive(),
  createdAt: z.date(),
  updatedAt: z.date(),
})
.refine((data) => {
  return data.endDate > data.appointmentDate;
}, {
  message: "O horário de término deve ser posterior ao início.",
  path: ["endDate"],
});

// Tipos inferidos para uso no Frontend e Backend
export type CreateAppointmentInput = z.infer<typeof CreateAppointmentSchema>;
export type AppointmentFormInput = z.infer<typeof AppointmentFormSchema>;
export type Appointment = z.infer<typeof AppointmentSchema>;