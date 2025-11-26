// /packages/web/src/features/financial/hooks/useFinancialEntriesQuery.ts

import { useQuery } from '@tanstack/react-query';
import { api } from '@/packages/web/src/lib/api';
import type { FinancialEntry } from '@/packages/shared-types';

// Definição estrita dos filtros, removendo 'any' para conformidade com DSpP (2.16)
type FinancialEntriesQueryFilters = {
  startDate?: string;
  endDate?: string;
  type?: 'receita' | 'despesa';
  entry_type?: 'pontual' | 'fixa';
};

export const useFinancialEntriesQuery = (filters?: FinancialEntriesQueryFilters) => {
  return useQuery<FinancialEntry[], Error>({
    queryKey: ['financialEntries', filters],
    queryFn: async () => {
      const res = await api.financial.$get({
        query: filters,
      });

      if (!res.ok) {
        throw new Error('Failed to fetch financial entries');
      }

      const data = await res.json();
      return data as FinancialEntry[];
    },
  });
};