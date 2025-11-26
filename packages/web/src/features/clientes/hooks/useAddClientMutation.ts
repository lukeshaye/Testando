// /packages/web/src/features/clients/hooks/useAddClientMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/packages/web/src/lib/api'; // Assumindo que o cliente API esteja neste local
import type { CreateClientSchema } from '@/packages/shared-types';

/**
 * Função de mutação para adicionar um novo cliente via API.
 * Recebe os dados validados pelo schema Zod.
 */
const addClient = async (clientData: CreateClientSchema) => {
  const response = await api.post('/api/clients', clientData);
  return response.data;
};

/**
 * Hook (Mutation) para adicionar um novo cliente.
 *
 * Princípios Aplicados:
 * - CQRS (2.12): Implementa o lado "Command" (Escrita) da feature.
 * - PGEC (2.13): Gerencia o estado da mutação e seus efeitos colaterais (invalidação de cache, toasts).
 */
export const useAddClientMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addClient,
    onSuccess: () => {
      // Invalida o cache da lista de clientes para forçar um refetch
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      // Notifica o usuário sobre o sucesso
      toast.success('Cliente adicionado com sucesso!');
    },
    onError: (error) => {
      // Notifica o usuário sobre o erro
      console.error('Falha ao adicionar cliente:', error);
      toast.error('Falha ao adicionar cliente.');
    },
  });
};