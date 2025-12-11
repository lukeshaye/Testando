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
import { AppointmentFormSchema } from '@/packages/shared-types';

// Define o tipo de dados do formulário com base no schema Zod
type AppointmentFormData = z.infer<typeof AppointmentFormSchema>;

/**
 * Interface do Payload da API (Contrato).
 * Define explicitamente o que a API espera receber, desacoplando
 * o formulário da requisição de rede.
 */
interface CreateAppointmentPayload {
  clientId: string;
  professionalId: string;
  serviceId: string;
  price: number;
  appointmentDate: string; // YYYY-MM-DD
  startTime: string;       // HH:MM
  endTime: string;         // HH:MM
  notes?: string;
}

/**
 * Função auxiliar para extrair HH:MM de um objeto Date.
 * Garante consistência e evita dependência de locale do navegador.
 * Princípio 2.3 KISS.
 */
const formatTimeHHMM = (date: Date): string => {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

/**
 * Função auxiliar para extrair YYYY-MM-DD de um objeto Date.
 */
const formatDateISO = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

/**
 * Função de mutação (fetcher) que envia os dados do novo agendamento
 * para a API.
 *
 * @param appointmentData Os dados validados do formulário.
 */
const addAppointment = async (
  appointmentData: AppointmentFormData,
): Promise<any> => {
  // ADAPTER / MAPPER
  // Transforma os objetos Date do formulário nas strings que a API espera.
  // Resolve a inconsistência de contrato apontada no plano de correção.
  const payload: CreateAppointmentPayload = {
    clientId: appointmentData.clientId,
    professionalId: appointmentData.professionalId,
    serviceId: appointmentData.serviceId,
    price: appointmentData.price,
    notes: appointmentData.notes,
    // Extrai a data (YYYY-MM-DD)
    appointmentDate: formatDateISO(appointmentData.appointmentDate),
    // Extrai o horário de início (HH:MM)
    startTime: formatTimeHHMM(appointmentData.appointmentDate),
    // Extrai o horário de término (HH:MM)
    endTime: formatTimeHHMM(appointmentData.endDate),
  };

  const response = await fetch('/api/appointments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
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