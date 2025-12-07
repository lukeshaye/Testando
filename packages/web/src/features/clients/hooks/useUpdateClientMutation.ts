// /packages/web/src/features/clients/hooks/useUpdateClientMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/packages/web/src/lib/api'; // Assumindo que o cliente API esteja neste local
import type { CreateClientSchema } from '@/packages/shared-types';

/**
 * Interface para os dados da mutação de atualização.
 * Inclui o ID do cliente e os novos dados.
 */
interface UpdateClientPayload {
  id: string | number;
  data: CreateClientSchema;
}

/**
 * Função de mutação para atualizar um cliente existente via API.
 */
const updateClient = async ({ id, data }: UpdateClientPayload) => {
  const response = await api.put(`/api/clients/${id}`, data);
  return response.data;
};

/**
 * Hook (Mutation) para atualizar um cliente existente.
 *
 * Princípios Aplicados:
 * - CQRS (2.12): Implementa o lado "Command" (Escrita) da feature.
 * - PGEC (2.13): Gerencia o estado da mutação e seus efeitos colaterais (invalidação de cache, toasts).
 */
export const useUpdateClientMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateClient,
    onSuccess: () => {
      // Invalida o cache da lista de clientes para forçar um refetch
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      // Notifica o usuário sobre o sucesso
      toast.success('Cliente atualizado com sucesso!');
    },
    onError: (error) => {
      // Notifica o usuário sobre o erro
      console.error('Falha ao atualizar cliente:', error);
      toast.error('Falha ao atualizar cliente.');
    },
  });
};