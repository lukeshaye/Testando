import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useUpdateServiceMutation } from './useUpdateServiceMutation';
// 1. Nova importação
import { useAuthenticatedApi } from '@/hooks/useAuthenticatedApi';
import { ServiceType } from '@/packages/shared-types';

// 2. Mock do novo hook
vi.mock('@/hooks/useAuthenticatedApi');

// Mock do useToast (Mantido igual)
const mockToast = vi.fn();
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

describe('useUpdateServiceMutation', () => {
  let queryClient: QueryClient;
  // Criamos uma função mock para controlar o método $put
  const mockPut = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // 3. Configuração do Mock para retornar a estrutura da API
    (useAuthenticatedApi as any).mockReturnValue({
      api: {
        services: {
          ':id': {
            $put: mockPut,
          },
        },
      },
    });
  });

  const createWrapper = () => ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('deve chamar a API com os dados corretos e invalidar a query no sucesso', async () => {
    const updateData: ServiceType = {
      id: 1,
      name: 'Serviço Atualizado',
      price: 150,
      duration: 45,
      color: '#ABCDEF',
      image_url: 'http://example.com/updated.png'
    };

    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');
    
    // Configura o retorno de sucesso na função mockPut
    mockPut.mockResolvedValueOnce({
      ok: true,
      json: async () => updateData,
    });

    const { result } = renderHook(() => useUpdateServiceMutation(), {
      wrapper: createWrapper(),
    });

    // Executa a mutação
    result.current.mutate(updateData);

    // Verificações
    await waitFor(() => {
      // Verifica se o mockPut foi chamado corretamente
      expect(mockPut).toHaveBeenCalledWith({
        param: { id: updateData.id.toString() },
        json: updateData,
      });
    });

    await waitFor(() => {
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['services'] });
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Sucesso',
      description: 'Serviço atualizado com sucesso!',
      variant: 'default',
    });
  });

  it('deve exibir toast de erro quando a API falhar', async () => {
    const updateData: ServiceType = {
      id: 2,
      name: 'Serviço Falha',
      price: 10,
      duration: 10,
    };
    const errorMessage = 'Erro de validação';

    // Configura o retorno de erro na função mockPut
    mockPut.mockResolvedValueOnce({
      ok: false,
      statusText: errorMessage,
      json: async () => ({ message: errorMessage }),
    });

    const { result } = renderHook(() => useUpdateServiceMutation(), {
      wrapper: createWrapper(),
    });

    // Executa a mutação
    result.current.mutate(updateData);

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