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
import { api } from '@/lib/api';
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
 * * CORREÇÃO (Princípio 2.2 e 2.9): 
 * Utiliza o cliente 'api' (Hono RPC) em vez de 'fetch' nativo.
 * Isso garante tipagem forte e evita strings de URL hardcoded (DRY).
 */
const fetchAppointments = async ({
  startDate,
  endDate,
  professionalId,
}: UseAppointmentsQueryFilters): Promise<AppointmentType[]> => {
  const response = await api.appointments.$get({
    query: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      // Converte para string apenas se existir, compatível com URLSearchParams do backend
      ...(professionalId ? { professionalId: professionalId.toString() } : {}),
    },
  });

  if (!response.ok) {
    // O cliente RPC retorna um wrapper, precisamos extrair o erro se houver
    const errorData = await response.json().catch(() => ({}));
    // @ts-expect-error: errorData pode ser any, mas assumimos message
    throw new Error(errorData.message || 'Falha ao buscar agendamentos');
  }

  const data = await response.json();
  
  // Garantimos que o retorno bate com o tipo compartilhado
  return data as unknown as AppointmentType[];
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