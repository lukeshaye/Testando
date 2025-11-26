import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/packages/web/src/lib/api';

export const useDeleteFinancialEntryMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      // Chamada RPC com parâmetro dinâmico (:id) para exclusão
      const res = await api.financial[':id'].$delete({
        param: { id: id.toString() }, // Converte ID para string conforme exigido pelo Hono client
      });

      // Verificação manual de erro exigida pelo cliente Hono (hc)
      if (!res.ok) {
        throw new Error('Falha ao excluir lançamento financeiro');
      }

      return await res.json();
    },
    onSuccess: () => {
      // Invalida o cache da lista para remover o item excluído da interface imediatamente
      queryClient.invalidateQueries({ queryKey: ['financialEntries'] });
    },
  });
};