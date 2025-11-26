// hooks/useAddServiceMutation.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/packages/web/src/lib/api';
import { CreateServiceType } from '@/packages/shared-types';
import { useToast } from '@/components/ui/use-toast';

export const useAddServiceMutation = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateServiceType) => {
      const res = await api.services.$post({ json: data });

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
        description: 'Serviço criado com sucesso!',
        variant: 'default',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: `Erro ao criar serviço: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
};