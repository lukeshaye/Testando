import { z } from 'zod';

/**
 * CONSTANTES DE VALIDAÇÃO
 * Princípio 2.2 (DRY): Centralizamos o Regex de hora para garantir consistência
 * caso precise ser usado em outros schemas.
 */
// Regex estrito: exige 2 dígitos para hora (rejeita "9:00", exige "09:00")
// Princípio 2.16 (DSpP): Zero Trust - rejeita formatos ambíguos
const TIME_REGEX = /^([01][0-9]|2[0-3]):[0-5][0-9]$/; // Formato HH:MM (00:00 a 23:59)

/**
 * SCHEMA BASE DE AGENDAMENTO (Formulário)
 * Princípio 2.16 (DSpP): Validação de borda robusta (ids inteiros e positivos).
 * Princípio 2.12 (CQRS): Otimizado para operação de escrita.
 * 
 * Este schema base é usado para criar tanto AppointmentFormSchema quanto AppointmentSchema.
 */
const AppointmentFormBaseSchema = z.object({
  client_id: z.number({ required_error: "Cliente é obrigatório" }).int().positive(),
  professional_id: z.number({ required_error: "Profissional é obrigatório" }).int().positive(),
  service_id: z.number({ required_error: "Serviço é obrigatório" }).int().positive(),
  
  // z.coerce.date() facilita o binding com inputs HTML que retornam string
  appointment_date: z.coerce.date({
    required_error: 'A data do agendamento é obrigatória.',
  }),

  // Para formulários, usamos end_date como Date object completo
  end_date: z.coerce.date({
    required_error: 'A data/hora de término é obrigatória.',
  }),

  price: z.number().positive('O preço deve ser um valor positivo.'),
  notes: z.string().optional(),
});

/**
 * SCHEMA DE CRIAÇÃO DE AGENDAMENTO (Formulário)
 * Princípio 2.16 (DSpP): Validação de borda robusta (ids inteiros e positivos).
 * Princípio 2.12 (CQRS): Otimizado para operação de escrita.
 * 
 * Este schema é usado para formulários que trabalham com appointment_date e end_date como Date objects.
 */
export const AppointmentFormSchema = AppointmentFormBaseSchema.refine((data) => {
  /**
   * LÓGICA DE VALIDAÇÃO TEMPORAL
   * Princípio 2.15 (PTE): Lógica determinística e isolada.
   * Valida que end_date é posterior a appointment_date.
   */
  return data.end_date > data.appointment_date;
}, {
  message: "O horário de término deve ser posterior ao início.",
  path: ["end_date"], // Aponta o erro especificamente para o campo end_date
});

/**
 * SCHEMA DE CRIAÇÃO DE AGENDAMENTO (API)
 * Princípio 2.16 (DSpP): Validação de borda robusta (ids inteiros e positivos).
 * Princípio 2.12 (CQRS): Otimizado para operação de escrita (separando data e hora).
 * 
 * Este schema é usado para APIs que trabalham com appointment_date, start_time e end_time separados.
 */
export const CreateAppointmentSchema = z.object({
  client_id: z.number({ required_error: "Cliente é obrigatório" }).int().positive(),
  professional_id: z.number({ required_error: "Profissional é obrigatório" }).int().positive(),
  service_id: z.number({ required_error: "Serviço é obrigatório" }).int().positive(),
  
  // z.coerce.date() facilita o binding com inputs HTML que retornam string
  appointment_date: z.coerce.date({
    required_error: 'A data do agendamento é obrigatória.',
  }),

  // Validamos o formato da string de hora antes de processar a lógica
  start_time: z.string().regex(TIME_REGEX, "Formato de hora inválido (HH:MM)"),
  end_time: z.string().regex(TIME_REGEX, "Formato de hora inválido (HH:MM)"),

  price: z.number().positive('O preço deve ser um valor positivo.'),
  notes: z.string().optional(),
})
.refine((data) => {
  /**
   * LÓGICA DE VALIDAÇÃO TEMPORAL
   * Princípio 2.15 (PTE): Lógica determinística e isolada.
   */
  try {
    // OBSERVAÇÃO TÉCNICA DE ROBUSTEZ:
    // O uso de toISOString() converte para UTC e pode alterar o dia (ex: 21h BRT -> 00h UTC do dia seguinte).
    // No entanto, como usamos a MESMA base `dateStr` para construir tanto o `start` quanto o `end`,
    // o deslocamento afeta ambas as variáveis igualmente. A diferença relativa se mantém correta,
    // garantindo a segurança da validação "Fim > Início" independentemente do Timezone.
    const dateStr = data.appointment_date.toISOString().split('T')[0];
    
    const start = new Date(`${dateStr}T${data.start_time}`);
    const end = new Date(`${dateStr}T${data.end_time}`);

    return end > start;
  } catch (e) {
    return false; // Falha segura (DSpP) caso a data seja inválida
  }
}, {
  message: "O horário de término deve ser posterior ao início.",
  path: ["end_time"], // Aponta o erro especificamente para o campo end_time
});

/**
 * SCHEMA COMPLETO DE AGENDAMENTO (Banco de Dados)
 * Princípio 2.5 (SoC): Separação entre schema de criação e schema completo.
 */
export const AppointmentSchema = AppointmentFormBaseSchema.extend({
  id: z.number().int().positive(),
  created_at: z.date(),
  updated_at: z.date(),
})
.refine((data) => {
  /**
   * LÓGICA DE VALIDAÇÃO TEMPORAL
   * Princípio 2.15 (PTE): Lógica determinística e isolada.
   * Valida que end_date é posterior a appointment_date.
   */
  return data.end_date > data.appointment_date;
}, {
  message: "O horário de término deve ser posterior ao início.",
  path: ["end_date"], // Aponta o erro especificamente para o campo end_date
});

// Tipos inferidos para uso no Frontend e Backend
export type CreateAppointmentInput = z.infer<typeof CreateAppointmentSchema>;
export type AppointmentFormInput = z.infer<typeof AppointmentFormSchema>;
export type Appointment = z.infer<typeof AppointmentSchema>;