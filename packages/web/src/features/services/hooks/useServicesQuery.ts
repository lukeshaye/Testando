// hooks/useServicesQuery.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '@/packages/web/src/lib/api';

export const useServicesQuery = () => {
  return useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const res = await api.services.$get();

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData?.message || res.statusText);
      }

      return await res.json();
    },
  });
};