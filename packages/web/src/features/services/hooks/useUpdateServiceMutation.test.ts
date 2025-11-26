import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useUpdateServiceMutation } from './useUpdateServiceMutation';
import { api } from '@/packages/web/src/lib/api';
import { ServiceType } from '@/packages/shared-types';

// Mock da api Hono RPC com rota dinâmica :id
vi.mock('@/packages/web/src/lib/api', () => ({
  api: {
    services: {
      ':id': {
        $put: vi.fn(),
      },
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

describe('useUpdateServiceMutation', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
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
    const updateData: ServiceType = {
      id: 1,
      name: 'Serviço Atualizado',
      price: 150,
      duration: 45,
      color: '#ABCDEF',
      image_url: 'http://example.com/updated.png'
    };

    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');
    
    // Mock da resposta de sucesso da API (RPC Pattern)
    (api.services[':id'].$put as any).mockResolvedValueOnce({
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
      // Verifica se o ID foi passado no param e os dados no json
      expect(api.services[':id'].$put).toHaveBeenCalledWith({
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

    // Mock de erro da API (Simulando !res.ok)
    (api.services[':id'].$put as any).mockResolvedValueOnce({
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
        // O hook deve extrair a mensagem de erro da resposta
        description: expect.stringContaining(errorMessage),
        variant: 'destructive',
      });
    });
  });
});