import { z } from 'zod';

/**
 * CONSTANTES DE VALIDAÇÃO
 * Removido TIME_REGEX pois adotamos a validação direta de Date objects.
 * Princípio 2.4 (YAGNI): Não precisamos de regex se não vamos fazer parsing manual. [cite: 29]
 */

/**
 * SCHEMA BASE DE AGENDAMENTO (Campos Comuns)
 * Princípio 2.2 (DRY): Definimos os campos comuns uma única vez. [cite: 15]
 */
const AppointmentFormBaseSchema = z.object({
  clientId: z.number({ required_error: "Cliente é obrigatório" }).int().positive(),
  professionalId: z.number({ required_error: "Profissional é obrigatório" }).int().positive(),
  serviceId: z.number({ required_error: "Serviço é obrigatório" }).int().positive(),
  
  // Representa a data e hora de INÍCIO
  appointmentDate: z.coerce.date({
    required_error: 'A data do agendamento é obrigatória.',
  }),

  // Representa a data e hora de TÉRMINO
  endDate: z.coerce.date({
    required_error: 'A data/hora de término é obrigatória.',
  }),

  price: z.number().positive('O preço deve ser um valor positivo.'),
  notes: z.string().optional(),
});

/**
 * SCHEMA DE CRIAÇÃO DE AGENDAMENTO (Formulário & API)
 * Correção Crítica (Opção B do Plano):
 * Unificamos a lógica. Agora a API aceita objetos Date completos (ISO Strings), 
 * eliminando a necessidade de conversão manual de strings "HH:MM" e corrigindo o conflito com o Frontend.
 * * Princípio 2.3 (KISS): Removemos a complexidade de parsing de hora. [cite: 23]
 * Princípio 2.15 (PTE): A validação torna-se determinística usando objetos Date nativos. 
 */
export const CreateAppointmentSchema = AppointmentFormBaseSchema.refine((data) => {
  // Validação simples e robusta: O fim deve ser após o início.
  return data.endDate > data.appointmentDate;
}, {
  message: "O horário de término deve ser posterior ao início.",
  path: ["endDate"], // Aponta o erro para o campo endDate
});

// Mantemos o AppointmentFormSchema como um alias ou extensão se necessário no futuro,
// mas por agora eles compartilham a mesma regra de negócio base.
export const AppointmentFormSchema = CreateAppointmentSchema;

/**
 * SCHEMA COMPLETO DE AGENDAMENTO (Banco de Dados)
 * Princípio 2.5 (SoC): Separação entre schema de entrada (Create) e schema de entidade (DB). 
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