// /packages/web/src/features/settings/hooks/useUpdateSettingsMutation.test.ts

import { renderHook, waitFor } from '@testing-library/react';
import { 
  useUpdateProfileSettingsMutation, 
  useUpdateWorkingHoursMutation, 
  useAddBusinessExceptionMutation, 
  useDeleteBusinessExceptionMutation 
} from './useUpdateSettingsMutation';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// --- Mocks ---

// 1. Mock da API
jest.mock('@/lib/api');
const mockedApi = api as jest.Mocked<typeof api>;

// 2. Mock do Sonner (Toast)
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('useUpdateSettingsMutation', () => {
  let queryClient: QueryClient;
  let wrapper: ({ children }: { children: ReactNode }) => JSX.Element;

  beforeEach(() => {
    jest.clearAllMocks();

    // Configuração do React Query para testes
    queryClient = new QueryClient({
      defaultOptions: {
        mutations: {
          retry: false, // Desativa retentativas para testes de erro
        },
      },
    });

    // Spy no invalidateQueries para verificar a lógica DRY do hook base
    jest.spyOn(queryClient, 'invalidateQueries');

    // Wrapper necessário para prover o contexto do React Query
    wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  });

  // --- TESTES: useUpdateProfileSettingsMutation ---

  describe('useUpdateProfileSettingsMutation', () => {
    it('deve chamar api.put, invalidar queries e mostrar toast de sucesso', async () => {
      mockedApi.put.mockResolvedValueOnce({ data: {} });

      const { result } = renderHook(() => useUpdateProfileSettingsMutation(), { wrapper });
      const payload = { name: 'Nova Loja', phone: '123' };

      result.current.mutate(payload as any);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Verifica API
      expect(mockedApi.put).toHaveBeenCalledWith('/api/settings/profile', payload);
      // Verifica Lógica DRY (Base Hook)
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['settings'] });
      expect(toast.success).toHaveBeenCalledWith('Perfil atualizado com sucesso!');
    });

    it('deve tratar erros corretamente', async () => {
      mockedApi.put.mockRejectedValueOnce(new Error('Erro API'));
      const { result } = renderHook(() => useUpdateProfileSettingsMutation(), { wrapper });

      result.current.mutate({ name: 'X' } as any);

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(toast.error).toHaveBeenCalledWith('Erro ao atualizar perfil.');
    });
  });

  // --- TESTES: useUpdateWorkingHoursMutation ---

  describe('useUpdateWorkingHoursMutation', () => {
    it('deve chamar api.put na rota de business-hours', async () => {
      mockedApi.put.mockResolvedValueOnce({ data: {} });
      const { result } = renderHook(() => useUpdateWorkingHoursMutation(), { wrapper });
      
      const payload = { hours: [] }; // Payload simplificado
      result.current.mutate(payload as any);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockedApi.put).toHaveBeenCalledWith('/api/settings/business-hours', payload);
      expect(toast.success).toHaveBeenCalledWith('Horários atualizados com sucesso!');
    });
  });

  // --- TESTES: useAddBusinessExceptionMutation ---

  describe('useAddBusinessExceptionMutation', () => {
    it('deve chamar api.post na rota de exceptions', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: {} });
      const { result } = renderHook(() => useAddBusinessExceptionMutation(), { wrapper });

      const payload = { description: 'Feriado', exception_date: new Date() };
      result.current.mutate(payload as any);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockedApi.post).toHaveBeenCalledWith('/api/settings/exceptions', payload);
      expect(toast.success).toHaveBeenCalledWith('Exceção adicionada com sucesso!');
    });
  });

  // --- TESTES: useDeleteBusinessExceptionMutation ---

  describe('useDeleteBusinessExceptionMutation', () => {
    it('deve chamar api.delete com o ID correto', async () => {
      mockedApi.delete.mockResolvedValueOnce({ data: {} });
      const { result } = renderHook(() => useDeleteBusinessExceptionMutation(), { wrapper });

      const exceptionId = 123;
      result.current.mutate(exceptionId);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockedApi.delete).toHaveBeenCalledWith('/api/settings/exceptions/123');
      expect(toast.success).toHaveBeenCalledWith('Exceção removida com sucesso!');
    });

    it('deve mostrar toast de erro específico na falha', async () => {
      mockedApi.delete.mockRejectedValueOnce(new Error('Falha ao deletar'));
      const { result } = renderHook(() => useDeleteBusinessExceptionMutation(), { wrapper });

      result.current.mutate(999);

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(toast.error).toHaveBeenCalledWith('Erro ao remover exceção.');
    });
  });
});