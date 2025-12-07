import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useDeleteServiceMutation } from './useDeleteServiceMutation';
// 1. Nova importação
import { useAuthenticatedApi } from '@/hooks/useAuthenticatedApi';

// 2. Mock do novo hook em vez da lib/api
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
  // 3. Criamos a função mockada aqui para ser usada nos testes
  const mockDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // 4. Configuração do mock do useAuthenticatedApi
    (useAuthenticatedApi as any).mockReturnValue({
      api: {
        services: {
          ':id': {
            $delete: mockDelete,
          },
        },
      },
    });
  });

  const createWrapper = () => ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('deve chamar a API com o ID correto e invalidar a query no sucesso', async () => {
    const serviceId = 123;

    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');
    
    // 5. Configura o retorno usando a variável mockDelete
    mockDelete.mockResolvedValueOnce({
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
      expect(mockDelete).toHaveBeenCalledWith({
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

    // 6. Configura o erro usando a variável mockDelete
    mockDelete.mockResolvedValueOnce({
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