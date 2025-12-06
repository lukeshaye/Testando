import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useDeleteServiceMutation } from './useDeleteServiceMutation';
import { useAuthenticatedApi } from '@/hooks/useAuthenticatedApi';

// Mock do hook de autenticação
vi.mock('@/hooks/useAuthenticatedApi');

// Mock do useToast
const mockToast = vi.fn();
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

describe('useDeleteServiceMutation', () => {
  let queryClient: QueryClient;
  const mockApi = {
    services: {
      ':id': {
        $delete: vi.fn(),
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Configurar o mock do hook de autenticação
    (useAuthenticatedApi as any).mockReturnValue(mockApi);
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  const createWrapper = () => ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('deve chamar a API com o ID correto e invalidar a query no sucesso', async () => {
    const serviceId = 123;

    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');
    
    // Mock da resposta de sucesso da API (RPC Pattern)
    mockApi.services[':id'].$delete.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    const { result } = renderHook(() => useDeleteServiceMutation(), {
      wrapper: createWrapper(),
    });

    // Executa a mutação
    result.current.mutate(serviceId);

    // Verificações
    await waitFor(() => {
      // Verifica se o ID foi passado corretamente no param (como string)
      expect(mockApi.services[':id'].$delete).toHaveBeenCalledWith({
        param: { id: serviceId.toString() },
      });
    });

    await waitFor(() => {
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['services'] });
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Sucesso',
      description: 'Serviço removido!',
      variant: 'default',
    });
  });

  it('deve exibir toast de erro quando a API falhar', async () => {
    const serviceId = 456;
    const errorMessage = 'Erro ao deletar registro';

    // Mock de erro da API (Simulando !res.ok)
    mockApi.services[':id'].$delete.mockResolvedValueOnce({
      ok: false,
      statusText: errorMessage,
      json: async () => ({ message: errorMessage }),
    });

    const { result } = renderHook(() => useDeleteServiceMutation(), {
      wrapper: createWrapper(),
    });

    // Executa a mutação
    result.current.mutate(serviceId);

    // Verificações
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Erro',
        description: expect.stringContaining(errorMessage),
        variant: 'destructive',
      });
    });
  });
});