/**
 * ARQUIVO: /packages/web/src/features/appointments/hooks/useAppointmentsQuery.ts
 *
 * $$PLANO_DE_FEATURE$$
 * (REVISADO) - Tarefa 1.1: Feature - Appointments (CRUD Padrão)
 *
 * Hook (Query) para buscar agendamentos.
 * Implementa o lado "Query" (Leitura) do CQRS (2.12) e serve como
 * fonte de dados do "Estado do Servidor" (Nível 3) para PGEC (2.13).
 */

import { useQuery } from '@tanstack/react-query';
import type { AppointmentType } from '@/packages/shared-types';

/**
 * Define os filtros aceitos pelo hook useAppointmentsQuery.
 * Conforme Tarefa 1.1.
 */
interface UseAppointmentsQueryFilters {
  startDate: Date;
  endDate: Date;
  professionalId: number | null;
}

/**
 * Função de busca (fetcher) para os agendamentos.
 * É chamada pelo useQuery.
 */
const fetchAppointments = async ({
  startDate,
  endDate,
  professionalId,
}: UseAppointmentsQueryFilters): Promise<AppointmentType[]> => {
  const params = new URLSearchParams();

  // Formata as datas para strings ISO para a API
  params.append('startDate', startDate.toISOString());
  params.append('endDate', endDate.toISOString());

  // Adiciona o ID profissional apenas se for um valor válido
  if (professionalId) {
    params.append('professionalId', professionalId.toString());
  }

  // O endpoint da API (ex: /api/appointments) é assumido
  const response = await fetch(`/api/appointments?${params.toString()}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Falha ao buscar agendamentos');
  }

  return response.json();
};

/**
 * Hook (Query) para buscar agendamentos com base em filtros.
 *
 * @param filters Filtros de data e profissional para a busca.
 */
export const useAppointmentsQuery = (filters: UseAppointmentsQueryFilters) => {
  /**
   * A queryKey (conforme o plano 1.1) deve ser um array estável
   * que inclui os filtros para permitir o cache granular.
   */
  const queryKey = [
    'appointments',
    {
      start: filters.startDate.toISOString(),
      end: filters.endDate.toISOString(),
      profId: filters.professionalId,
    },
  ];

  return useQuery<AppointmentType[]>({
    queryKey: queryKey,
    queryFn: () => fetchAppointments(filters),
    // A query só será ativada se as datas estiverem presentes.
    enabled: !!filters.startDate && !!filters.endDate,
  });
};