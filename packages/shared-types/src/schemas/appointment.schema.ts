import { z } from 'zod';

// Schema para o formulário de criação/edição de agendamento.
// Não inclui IDs gerados pelo banco (id, created_at, updated_at).
export const AppointmentFormSchema = z
  .object({
    client_id: z.number().min(1, 'Cliente é obrigatório.'),
    professional_id: z.number().min(1, 'Profissional é obrigatório.'),
    service_id: z.number().min(1, 'Serviço é obrigatório.'),
    appointment_date: z.date({
      required_error: 'Data e hora de início são obrigatóAs.',
    }),
    end_date: z.date({
      required_error: 'Data e hora de término são obrigatórias.',
    }),
    price: z.number().positive('O preço deve ser um valor positivo.'),
    notes: z.string().optional(),
    // TODO: Status 'agendado', 'concluido', 'cancelado' será tratado futuramente.
  })
  .refine((data) => data.end_date > data.appointment_date, {
    message: 'A data de término deve ser posterior à data de início.',
    path: ['end_date'], // Campo que receberá o erro
  });

// Schema completo, representando o dado como ele existe no banco de dados.
export const AppointmentSchema = AppointmentFormSchema.extend({
  id: z.number(),
  created_at: z.date(),
  updated_at: z.date(),
  // status: z.enum(['agendado', 'concluido', 'cancelado']), // Exemplo de adição futura
});

// Tipos inferidos para uso no frontend e backend
export type Appointment = z.infer<typeof AppointmentSchema>;
export type AppointmentFormInput = z.infer<typeof AppointmentFormSchema>;