// packages/web/src/features/dashboard/hooks/useWeeklyEarningsQuery.ts

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export const useWeeklyEarningsQuery = () => {
  return useQuery({
    queryKey: ['dashboard', 'chart'],
    queryFn: async () => {
      const res = await api.dashboard.chart.$get();

      if (!res.ok) {
        throw new Error('Failed to fetch dashboard chart data');
      }

      const data = await res.json();
      return data;
    },
  });
};