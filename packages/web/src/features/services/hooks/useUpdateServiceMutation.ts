// hooks/useUpdateServiceMutation.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/packages/web/src/lib/api';
import { ServiceType } from '@/packages/shared-types';
import { useToast } from '@/components/ui/use-toast';

export const useUpdateServiceMutation = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: ServiceType) => {
      const res = await api.services[':id'].$put({
        param: { id: data.id.toString() },
        json: data,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData?.message || res.statusText);
      }

      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast({
        title: 'Sucesso',
        description: 'Serviço atualizado com sucesso!',
        variant: 'default',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: `Erro ao atualizar serviço: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
};