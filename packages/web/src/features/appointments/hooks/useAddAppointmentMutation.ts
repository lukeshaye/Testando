/**
 * ARQUIVO: /packages/web/src/features/appointments/hooks/useAddAppointmentMutation.ts
 *
 * $$PLANO_DE_FEATURE$$
 * (REVISADO) - Tarefa 1.2: Feature - Appointments (CRUD Padrão)
 *
 * Hook (Command) para criar (adicionar) um novo agendamento.
 * Implementa o lado "Command" (Escrita) do CQRS (2.12).
 * Responsável por modificar o "Estado do Servidor" (Nível 3).
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { AppointmentFormSchema } from '@/packages/shared-types';

// Define o tipo de dados do formulário com base no schema Zod
type AppointmentFormData = z.infer<typeof AppointmentFormSchema>;

/**
 * Função de mutação (fetcher) que envia os dados do novo agendamento
 * para a API.
 *
 * @param appointmentData Os dados validados do formulário.
 */
const addAppointment = async (
  appointmentData: AppointmentFormData,
): Promise<any> => {
  const response = await fetch('/api/appointments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    // O Zod schema garante que 'appointment_date' e 'end_date' são objetos Date,
    // JSON.stringify irá convertê-los para strings ISO 8601 automaticamente.
    body: JSON.stringify(appointmentData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message || 'Falha ao adicionar o agendamento',
    );
  }

  return response.json();
};

/**
 * Hook (Command) 'useAddAppointmentMutation'.
 * Encapsula a lógica de criação de agendamento, incluindo a
 * invalidação de cache (PGEC 2.13).
 */
export const useAddAppointmentMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, AppointmentFormData>({
    mutationFn: addAppointment,

    /**
     * onSuccess: Implementa o princípio PGEC (2.13).
     * É mandatório invalidar as queries de 'appointments' após
     * uma criação bem-sucedida para atualizar a UI (Nível 1)
     * com os dados frescos do "Estado do Servidor" (Nível 3).
     */
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },

    // Opcional: tratamento de erro pode ser adicionado aqui
    // onError: (error) => {
    //   console.error("Erro ao adicionar agendamento:", error);
    //   // Aqui poderia ser disparado um toast de erro
    // },
  });
};