// hooks/useDeleteServiceMutation.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/packages/web/src/lib/api';
import { useToast } from '@/components/ui/use-toast';

export const useDeleteServiceMutation = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (serviceId: number) => {
      const res = await api.services[':id'].$delete({
        param: { id: serviceId.toString() },
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
        description: 'Serviço removido!',
        variant: 'default',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: `Erro ao remover serviço: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
};