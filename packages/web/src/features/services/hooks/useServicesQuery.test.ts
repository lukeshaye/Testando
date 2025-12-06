import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useServicesQuery } from './useServicesQuery';
import { useAuthenticatedApi } from '@/hooks/useAuthenticatedApi';

// Mock do hook de autenticação conforme Princípio PTE (2.15)
vi.mock('@/hooks/useAuthenticatedApi');

describe('useServicesQuery', () => {
  const mockApi = {
    services: {
      $get: vi.fn(),
    },
  };

  // Limpa os mocks antes de cada teste
  beforeEach(() => {
    vi.clearAllMocks();
    // Configurar o mock do hook de autenticação
    (useAuthenticatedApi as any).mockReturnValue(mockApi);
  });

  // Wrapper com QueryClientProvider necessário para hooks do React Query
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false, // Desabilita retentativas para testes mais rápidos de erro
        },
      },
    });
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  it('deve buscar e retornar a lista de serviços com sucesso via Hono RPC', async () => {
    const mockData = [
      { id: 1, name: 'Corte de Cabelo', price: 50, duration: 30, color: '#000000' },
      { id: 2, name: 'Barba', price: 30, duration: 20, color: '#ffffff' },
    ];

    // Simula resposta de sucesso do Hono RPC (interface fetch-like)
    mockApi.services.$get.mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    const { result } = renderHook(() => useServicesQuery(), {
      wrapper: createWrapper(),
    });

    // Aguarda o hook resolver com sucesso
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Verificações
    expect(result.current.data).toEqual(mockData);
    // O cliente RPC já encapsula a rota, verificamos apenas a chamada do método correto
    expect(mockApi.services.$get).toHaveBeenCalled();
  });

  it('deve lidar com erros quando a resposta da API não for ok (!res.ok)', async () => {
    // Simula erro da API (ex: 400 ou 500) onde !res.ok é verdadeiro
    mockApi.services.$get.mockResolvedValue({
      ok: false,
      statusText: 'Erro ao buscar serviços',
      json: async () => ({ message: 'Erro interno' }),
    });

    const { result } = renderHook(() => useServicesQuery(), {
      wrapper: createWrapper(),
    });

    // Aguarda o hook entrar em estado de erro
    await waitFor(() => expect(result.current.isError).toBe(true));

    // Verificações
    expect(result.current.error).toBeDefined();
    expect(mockApi.services.$get).toHaveBeenCalled();
  });
});