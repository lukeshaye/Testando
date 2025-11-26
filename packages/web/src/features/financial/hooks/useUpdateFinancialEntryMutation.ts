import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/packages/web/src/lib/api';
import { CreateFinancialEntrySchema } from '@/packages/shared-types';
import { z } from 'zod';

// Inferir o tipo dos dados de atualização a partir do Schema compartilhado
type FinancialEntryUpdateData = z.infer<typeof CreateFinancialEntrySchema>;

interface UseUpdateFinancialEntryMutationProps {
  id: number;
  data: FinancialEntryUpdateData;
}

export const useUpdateFinancialEntryMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: UseUpdateFinancialEntryMutationProps) => {
      // Chamada RPC com parâmetro dinâmico (:id)
      const res = await api.financial[':id'].$put({
        param: { id: id.toString() }, // Converte ID para string conforme exigido pelo Hono client
        json: data,
      });

      if (!res.ok) {
        throw new Error('Falha ao atualizar lançamento financeiro');
      }

      return await res.json();
    },
    onSuccess: () => {
      // Invalida a query para atualizar a lista automaticamente
      queryClient.invalidateQueries({ queryKey: ['financialEntries'] });
    },
  });
};