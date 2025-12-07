import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useServicesQuery } from './useServicesQuery';
// 1. Nova importação do hook de autenticação
import { useAuthenticatedApi } from '@/hooks/useAuthenticatedApi';

// 2. Mock do hook useAuthenticatedApi
vi.mock('@/hooks/useAuthenticatedApi');

describe('useServicesQuery', () => {
  // Criamos uma função mock para o método específico que será chamado ($get)
  const mockGet = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // 3. Configuramos o mock do hook para retornar a estrutura da API esperada
    (useAuthenticatedApi as any).mockReturnValue({
      api: {
        services: {
          $get: mockGet,
        },
      },
    });
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

    // Simula resposta de sucesso no mock local
    mockGet.mockResolvedValue({
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
    expect(mockGet).toHaveBeenCalled();
  });

  it('deve lidar com erros quando a resposta da API não for ok (!res.ok)', async () => {
    // Simula erro da API no mock local
    mockGet.mockResolvedValue({
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
    expect(mockGet).toHaveBeenCalled();
  });
});