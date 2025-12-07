import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useAddServiceMutation } from './useAddServiceMutation';
// SUBSTITUÍDO: Importação da API estática pelo hook autenticado
import { useAuthenticatedApi } from '@/hooks/useAuthenticatedApi';
import { CreateServiceType } from '@/packages/shared-types';

// SUBSTITUÍDO: Mock do hook useAuthenticatedApi ao invés da lib/api
vi.mock('@/hooks/useAuthenticatedApi');

// Mock do useToast (Mantido igual)
const mockToast = vi.fn();
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

describe('useAddServiceMutation', () => {
  let queryClient: QueryClient;
  // Criamos uma função mock para o método $post
  const mockPost = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Instancia um novo QueryClient para cada teste
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // CONFIGURAÇÃO DO MOCK:
    // Faz o hook retornar a estrutura da API que o mutation espera
    (useAuthenticatedApi as any).mockReturnValue({
      api: {
        services: {
          $post: mockPost,
        },
      },
    });
  });

  const createWrapper = () => ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('deve chamar a API com os dados corretos e invalidar a query no sucesso', async () => {
    const newServiceData: CreateServiceType = {
      name: 'Novo Serviço',
      price: 100,
      duration: 60,
      color: '#123456',
      image_url: 'http://example.com/image.png'
    };

    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');
    
    // Mock da resposta de sucesso usando a variável local mockPost
    mockPost.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, ...newServiceData }),
    });

    const { result } = renderHook(() => useAddServiceMutation(), {
      wrapper: createWrapper(),
    });

    // Executa a mutação
    result.current.mutate(newServiceData);

    // Verificações
    await waitFor(() => {
      // Verifica se o mockPost foi chamado
      expect(mockPost).toHaveBeenCalledWith({ json: newServiceData });
    });

    await waitFor(() => {
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['services'] });
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Sucesso',
      description: 'Serviço criado com sucesso!',
      variant: 'default',
    });
  });

  it('deve exibir toast de erro quando a API falhar', async () => {
    const newServiceData: CreateServiceType = {
      name: 'Serviço Falha',
      price: 0,
      duration: 0,
    };
    const errorMessage = 'Erro interno no servidor';

    // Mock de erro usando a variável local mockPost
    mockPost.mockResolvedValueOnce({
      ok: false,
      statusText: errorMessage,
      json: async () => ({ message: errorMessage }),
    });

    const { result } = renderHook(() => useAddServiceMutation(), {
      wrapper: createWrapper(),
    });

    // Executa a mutação
    result.current.mutate(newServiceData);

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