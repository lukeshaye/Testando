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
import { AppointmentFormSchema, CreateAppointmentInput } from '@/packages/shared-types';

// Define o tipo de dados do formulário com base no schema Zod
type AppointmentFormData = z.infer<typeof AppointmentFormSchema>;

/**
 * REMOVIDO: Interface manual 'CreateAppointmentPayload'.
 * Motivo: Violação do Princípio 2.2 (DRY)[cite: 16]. O contrato deve vir de @salonflow/shared-types.
 *
 * REMOVIDO: Funções 'formatTimeHHMM' e 'formatDateISO'.
 * Motivo: Violação do Princípio 2.3 (KISS)[cite: 24]. A API agora aceita datas ISO completas.
 */

/**
 * Função de mutação (fetcher) que envia os dados do novo agendamento
 * para a API.
 *
 * @param appointmentData Os dados validados do formulário.
 */
const addAppointment = async (
  appointmentData: AppointmentFormData,
): Promise<any> => {
  /**
   * ADAPTER / MAPPER
   * Constrói o payload usando a tipagem 'CreateAppointmentInput' oficial.
   *
   * Correções aplicadas:
   * 1. Conversão explícita de IDs para Number para evitar erro de validação Zod "Expected number, received string".
   * 2. Envio de datas completas (Date/ISO) em vez de strings separadas (HH:MM), restaurando o contrato (Princípio 2.1).
   */
  const payload: CreateAppointmentInput = {
    clientId: Number(appointmentData.clientId),
    professionalId: Number(appointmentData.professionalId),
    serviceId: Number(appointmentData.serviceId),
    price: Number(appointmentData.price),
    notes: appointmentData.notes,
    // Envia o objeto Date diretamente (o JSON.stringify converterá para ISO String automaticamente)
    appointmentDate: appointmentData.appointmentDate,
    endDate: appointmentData.endDate,
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