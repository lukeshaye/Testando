/**
 * ARQUIVO: /packages/web/src/features/appointments/hooks/useAddAppointmentMutation.ts
 *
 * $$PLANO_DE_FEATURE$$
 * (REVISADO) - Tarefa 1.2: Feature - Appointments (CRUD Padrão)
 *
 * Hook (Command) para criar (adicionar) um novo agendamento.
 * Implementa o lado "Command" (Escrita) do CQRS[cite: 75].
 * Responsável por modificar o "Estado do Servidor" (Nível 3)[cite: 88].
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
// Importação do Tipo Compartilhado para garantir a "Fonte Única da Verdade" (DRY)
import { AppointmentFormSchema } from '@/packages/shared-types';
// Importação do Cliente RPC (Hono Client) para garantir Type Safety e DRY (Princípio 2.2)
// Isso substitui o 'fetch' manual e centraliza a definição da rota (Princípio 2.9 - DIP)
import { api } from '@/lib/api';

// Define o tipo de dados do formulário com base no schema Zod
type AppointmentFormData = z.infer<typeof AppointmentFormSchema>;

/**
 * Função de mutação (fetcher) que envia os dados do novo agendamento
 * para a API usando o cliente RPC.
 *
 * @param appointmentData Os dados validados do formulário.
 */
const addAppointment = async (
  appointmentData: AppointmentFormData,
): Promise<any> => {
  /**
   * ADAPTER / MAPPER
   * Constrói o payload usando o cliente 'api' tipado.
   *
   * Correções aplicadas (Plano Correção 3):
   * 1. Substituição do fetch manual pelo método '$post' do cliente RPC.
   * 2. Conversão explícita de IDs para Number.
   * 3. Conversão de datas (Date) para ISO String (.toISOString()), pois o JSON
   * do Hono RPC espera strings para serialização correta.
   */
  const response = await api.appointments.$post({
    json: {
      clientId: Number(appointmentData.clientId),
      professionalId: Number(appointmentData.professionalId),
      serviceId: Number(appointmentData.serviceId),
      price: Number(appointmentData.price),
      notes: appointmentData.notes,
      // Conversão obrigatória para ISO String para transporte via JSON RPC
      appointmentDate: appointmentData.appointmentDate.toISOString(),
      endDate: appointmentData.endDate.toISOString(),
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    // Type assertion seguro pois sabemos que errorData é um objeto genérico aqui
    const message = (errorData as any).message || 'Falha ao adicionar o agendamento';
    throw new Error(message);
  }

  return await response.json();
};

/**
 * Hook (Command) 'useAddAppointmentMutation'.
 * Encapsula a lógica de criação de agendamento, incluindo a
 * invalidação de cache (PGEC 2.13)[cite: 81].
 */
export const useAddAppointmentMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, AppointmentFormData>({
    mutationFn: addAppointment,

    /**
     * onSuccess: Implementa o princípio PGEC (2.13)[cite: 81].
     * É mandatório invalidar as queries de 'appointments' após
     * uma criação bem-sucedida para atualizar a UI (Nível 1)
     * com os dados frescos do "Estado do Servidor" (Nível 3).
     */
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
};