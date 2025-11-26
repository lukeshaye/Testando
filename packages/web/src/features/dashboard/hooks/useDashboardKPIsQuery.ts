// packages/web/src/features/dashboard/hooks/useDashboardKPIsQuery.ts

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export const useDashboardKPIsQuery = () => {
  return useQuery({
    queryKey: ['dashboard', 'kpis'],
    queryFn: async () => {
      const res = await api.dashboard.stats.$get();

      if (!res.ok) {
        throw new Error('Failed to fetch dashboard KPIs');
      }

      const data = await res.json();
      return data;
    },
  });
};