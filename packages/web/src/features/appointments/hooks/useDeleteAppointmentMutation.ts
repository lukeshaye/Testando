import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/packages/ui/components/ui/use-toast'; // Seguindo a estrutura do plano

/**
 * Função de API para excluir um agendamento.
 * Chama o endpoint DELETE /api/appointments/:id
 */
const deleteAppointment = async (appointmentId: number): Promise<void> => {
  const response = await fetch(`/api/appointments/${appointmentId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({})); // Tenta pegar detalhes do erro
    throw new Error(errorData.message || 'Falha ao excluir o agendamento.');
  }

  // Não é esperado conteúdo no retorno de um DELETE 204
  return;
};

/**
 * Hook (Command) para excluir um agendamento.
 * Em conformidade com o plano de feature 4.8, item 1.4.
 *
 * - Implementa useMutation (CQRS 2.12)
 * - Chama o endpoint DELETE /api/appointments/:id
 * - Invalida ['appointments'] no onSuccess (PGEC 2.13)
 */
export const useDeleteAppointmentMutation = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<void, Error, number>({
    mutationFn: deleteAppointment,
    
    onSuccess: () => {
      // Princípio PGEC (2.13): Invalidar o cache para atualizar a UI
      queryClient.invalidateQueries({ queryKey: ['appointments'] });

      toast({
        title: 'Sucesso',
        description: 'Agendamento excluído com sucesso.',
      });
    },

    onError: (error) => {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível excluir o agendamento.',
        variant: 'destructive',
      });
    },
  });
};