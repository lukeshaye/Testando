// packages/web/src/features/dashboard/hooks/useTodayAppointmentsQuery.ts

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export const useTodayAppointmentsQuery = () => {
  return useQuery({
    queryKey: ['dashboard', 'appointments', 'today'],
    queryFn: async () => {
      // Seguindo o plano: Reutiliza o endpoint de appointments com filtro de data
      const today = new Date().toISOString();
      
      const res = await api.appointments.$get({
        query: {
          date: today,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch today\'s appointments');
      }

      const data = await res.json();
      return data;
    },
  });
};