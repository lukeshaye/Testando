import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useAddServiceMutation } from './useAddServiceMutation';
import { api } from '@/packages/web/src/lib/api';
import { CreateServiceType } from '@/packages/shared-types';

// Mock da api Hono RPC
vi.mock('@/packages/web/src/lib/api', () => ({
  api: {
    services: {
      $post: vi.fn(),
    },
  },
}));

// Mock do useToast
const mockToast = vi.fn();
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

describe('useAddServiceMutation', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    // Instancia um novo QueryClient para cada teste
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

  it('deve chamar a API com os dados corretos e invalidar a query no sucesso', async () => {
    const newServiceData: CreateServiceType = {
      name: 'Novo Serviço',
      price: 100,
      duration: 60,
      color: '#123456',
      image_url: 'http://example.com/image.png'
    };

    // Spy no invalidateQueries para verificar se foi chamado
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');
    
    // Mock da resposta de sucesso da API (Padrão Hono RPC)
    (api.services.$post as any).mockResolvedValueOnce({
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
      expect(api.services.$post).toHaveBeenCalledWith({ json: newServiceData });
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

    // Mock de erro da API (Simulando resposta !ok que o hook deve tratar)
    (api.services.$post as any).mockResolvedValueOnce({
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
        // O hook deve capturar o statusText ou a mensagem do JSON e lançar o erro
        description: expect.stringContaining(errorMessage),
        variant: 'destructive',
      });
    });
  });
});