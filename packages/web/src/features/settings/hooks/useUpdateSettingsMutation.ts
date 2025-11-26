// /packages/web/src/features/settings/hooks/useUpdateSettingsMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner'; // Ou o sistema de toast configurado no projeto
import { 
  ProfileSettingsFormData, 
  WorkingHoursFormData, 
  BusinessExceptionFormData 
} from '@/packages/shared-types';

// 1. O HOOK BASE (LÓGICA DRY)
// Centraliza o "conhecimento" de onSuccess e onError.
const useBaseSettingsMutation = <TData = unknown, TVariables = void>({
  mutationFn,
  successMessage,
  errorMessage,
}: {
  mutationFn: (variables: TVariables) => Promise<TData>;
  successMessage: string;
  errorMessage: string;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () => {
      // Lógica DRY: Invalida a query principal de settings
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      // Lógica DRY: Mostra toast de sucesso
      toast.success(successMessage);
    },
    onError: (error) => {
      // Lógica DRY: Mostra toast de erro
      console.error(errorMessage, error);
      toast.error(errorMessage);
    },
  });
};

// 2. AS IMPLEMENTAÇÕES ESPECIALIZADAS (CONSUMIDAS PELA UI)

// Hook 1: Atualizar Perfil do Negócio
export const useUpdateProfileSettingsMutation = () =>
  useBaseSettingsMutation({
    mutationFn: (data: ProfileSettingsFormData) => api.put('/api/settings/profile', data),
    successMessage: 'Perfil atualizado com sucesso!',
    errorMessage: 'Erro ao atualizar perfil.',
  });

// Hook 2: Atualizar Horários de Funcionamento
export const useUpdateWorkingHoursMutation = () =>
  useBaseSettingsMutation({
    // De: onSubmitHours
    mutationFn: (data: WorkingHoursFormData) => api.put('/api/settings/business-hours', data),
    successMessage: 'Horários atualizados com sucesso!',
    errorMessage: 'Erro ao salvar horários.',
  });

// Hook 3: Adicionar Exceção
export const useAddBusinessExceptionMutation = () =>
  useBaseSettingsMutation({
    // De: onSubmitException
    mutationFn: (data: BusinessExceptionFormData) => api.post('/api/settings/exceptions', data),
    successMessage: 'Exceção adicionada com sucesso!',
    errorMessage: 'Erro ao adicionar exceção.',
  });

// Hook 4: Deletar Exceção
export const useDeleteBusinessExceptionMutation = () =>
  useBaseSettingsMutation({
    // De: handleConfirmDeleteException
    // (Backend deve implementar DELETE /api/settings/exceptions/:id - Problema 23)
    mutationFn: (exceptionId: number) => api.delete(`/api/settings/exceptions/${exceptionId}`),
    successMessage: 'Exceção removida com sucesso!',
    errorMessage: 'Erro ao remover exceção.',
  });