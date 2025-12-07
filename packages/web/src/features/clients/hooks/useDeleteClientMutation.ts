// /packages/web/src/features/clients/hooks/useDeleteClientMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/packages/web/src/lib/api';
import { toast } from 'sonner';

/**
 * Função de mutação para deletar um cliente.
 * Faz uma requisição DELETE para a API.
 */
const deleteClient = async (clientId: string | number) => {
  const response = await api.delete(`/api/clients/${clientId}`);
  return response.data;
};

/**
 * Hook useMutation para deletar um cliente.
 *
 * Princípios:
 * - CQRS (2.12): Este é um "Command" (Escrita) para deletar dados.
 * - PGEC (2.13): Gerencia o estado da mutação (loading, error, success) e
 * orquestra os efeitos colaterais (invalidação de cache, toasts).
 * - SoC (2.5): Isola a lógica de deleção de cliente.
 */
export const useDeleteClientMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteClient,
    /**
     * Efeito colateral em caso de sucesso.
     */
    onSuccess: () => {
      // PGEC (2.13): Invalida o cache de 'clients' para forçar
      // a atualização da tabela com os dados mais recentes.
      queryClient.invalidateQueries({ queryKey: ['clients'] });

      // Fornece feedback ao usuário.
      toast.success('Cliente removido com sucesso!');
    },
    /**
     * Efeito colateral em caso de erro.
     */
    onError: () => {
      // Fornece feedback de erro ao usuário.
      toast.error('Falha ao remover cliente.');
    },
  });
};