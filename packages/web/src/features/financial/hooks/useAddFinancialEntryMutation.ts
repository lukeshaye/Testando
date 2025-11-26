// /packages/web/src/features/financial/hooks/useAddFinancialEntryMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { api } from '@/packages/web/src/lib/api';
import { CreateFinancialEntrySchema } from '@/packages/shared-types';

// Tipagem inferida do Schema compartilhado para garantir consistência entre Front e Back
type CreateFinancialEntryDTO = z.infer<typeof CreateFinancialEntrySchema>;

export const useAddFinancialEntryMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newEntryData: CreateFinancialEntryDTO) => {
      const res = await api.financial.$post({
        json: newEntryData,
      });

      if (!res.ok) {
        throw new Error('Failed to create financial entry');
      }

      // Retorna o dado criado (tipado automaticamente pelo RPC do Hono)
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financialEntries'] });
    },
  });
};