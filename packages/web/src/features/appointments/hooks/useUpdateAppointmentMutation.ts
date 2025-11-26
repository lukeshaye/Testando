/**
 * ARQUIVO: /packages/web/src/features/appointments/hooks/useUpdateAppointmentMutation.ts
 *
 * $$PLANO_DE_FEATURE$$
 * (REVISADO) - Tarefa 1.3: Feature - Appointments (CRUD Padrão)
 *
 * Hook (Command) para atualizar um agendamento existente.
 * Implementa o lado "Command" (Escrita) do CQRS (2.12).
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { AppointmentFormSchema } from '@/packages/shared-types';

// Define o tipo de dados do formulário com base no schema Zod
type AppointmentFormData = z.infer<typeof AppointmentFormSchema>;

/**
 * Define as variáveis que a função de mutação espera.
 * Conforme o plano (1.3), deve aceitar o 'id' e os 'novos dados'.
 */
interface UpdateAppointmentVariables {
  id: number;
  data: AppointmentFormData;
}

/**
 * Função de mutação (fetcher) que envia os dados atualizados
 * para a API.
 *
 * @param variables Objeto contendo o ID do agendamento e os novos dados.
 */
const updateAppointment = async ({
  id,
  data,
}: UpdateAppointmentVariables): Promise<any> => {
  const response = await fetch(`/api/appointments/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message || 'Falha ao atualizar o agendamento',
    );
  }

  return response.json();
};

/**
 * Hook (Command) 'useUpdateAppointmentMutation'.
 * Encapsula a lógica de atualização de agendamento, incluindo a
 * invalidação de cache (PGEC 2.13).
 */
export const useUpdateAppointmentMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, UpdateAppointmentVariables>({
    mutationFn: updateAppointment,

    /**
     * onSuccess: Implementa o princípio PGEC (2.13).
     * Invalida as queries de 'appointments' após uma atualização
     * bem-sucedida para forçar a atualização dos dados na UI (Nível 1).
     */
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },

    // onError: (error) => {
    //   console.error("Erro ao atualizar agendamento:", error);
    // },
  });
};