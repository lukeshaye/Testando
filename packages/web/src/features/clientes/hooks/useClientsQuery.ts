// /packages/web/src/features/clients/hooks/useClientsQuery.ts

import { useQuery } from '@tanstack/react-query';
import { api } from '@/packages/web/src/lib/api'; // Assumindo que o cliente API esteja neste local
import type { ClientType } from '@/packages/shared-types';

/**
 * Função de busca assíncrona para obter a lista de clientes da API.
 * Tipada para garantir que o retorno seja um array de ClientType.
 */
const fetchClients = async (): Promise<ClientType[]> => {
  // O cliente 'api' (Axios/fetch) fará a requisição GET
  // e já deve estar configurado para extrair o 'data' da resposta.
  const response = await api.get('/api/clients');
  return response.data;
};

/**
 * Hook (Query) para buscar e gerenciar o estado da lista de clientes.
 *
 * Princípios Aplicados:
 * - PGEC (2.13): Gerencia o estado do servidor (Nível 3), substituindo o Nível 4 (Zustand).
 * - CQRS (2.12): Implementa o lado "Query" (Leitura) da feature.
 * - SoC (2.5): Isola a responsabilidade de buscar dados de clientes.
 */
export const useClientsQuery = () => {
  return useQuery<ClientType[], Error>({
    queryKey: ['clients'], // Chave de cache para o React Query
    queryFn: fetchClients, // Função que será executada para buscar os dados
  });
};