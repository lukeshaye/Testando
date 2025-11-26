import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';

// VIOLAÇÃO CORRIGIDA: Remove a dependência de baixoível (supabase)
// import { supabase } from '@/packages/lib/supabase';

// CORREÇÃO (DIP): Importa a abstração (Hono RPC) para mocká-la
import { api } from '@/packages/web/src/lib/api';
import { ProductType } from '@/packages/shared-types';
import { useProductsQuery } from './useProductsQuery';

// 1. Mockar a chamada à abstração 'api' (Princípio PTE 2.15)
// A nova implementação de useProductsQuery chama api.products.$get()
vi.mock('@/packages/web/src/lib/api', () => ({
  api: {
    products: {
      $get: vi.fn(),
    },
  },
}));

// Typecasting para facilitar o uso do mock
const mockedApiGet = api.products.$get as vi.Mock;

// 2. Criar um wrapper de teste para o React Query
// Isso garante que cada teste tenha um cache limpo e um QueryClient
const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Desabilita retries para testes mais rápidos
      },
    },
  });
};

let queryClient: QueryClient;

const createWrapper = () => {
  queryClient = createTestQueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

// 3. Limpar mocks antes de cada teste
beforeEach(() => {
  vi.resetAllMocks();
  if (queryClient) {
    queryClient.clear();
  }
});

afterEach(() => {
  vi.clearAllMocks();
});

// 4. Descrever os testes para o hook
describe('useProductsQuery (Teste de Hook - PTE 2.15)', () => {
  
  it('DEVE estar no estado "isLoading" inicialmente', () => {
    // Arrange
    // Configura o mock da API para nunca resolver
    mockedApiGet.mockReturnValue(new Promise(() => {}));

    // Act
    const { result } = renderHook(() => useProductsQuery(), {
      wrapper: createWrapper(),
    });

    // Assert
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it('DEVE buscar e retornar os dados dos produtos com sucesso (CQRS Query)', async () => {
    // Arrange
    const mockProducts: ProductType[] = [
      { id: 1, name: 'Produto A', price: 1000, quantity: 10, description: 'Desc A', image_url: 'url_a', tenant_id: 't1' },
      { id: 2, name: 'Produto B', price: 2000, quantity: 5, description: 'Desc B', image_url: 'url_b', tenant_id: 't1' },
    ];

    // Mockar a resposta da API (Hono) -
    // A função 'fetchProducts' espera uma resposta com '.ok' e '.json()'
    mockedApiGet.mockResolvedValue({
      ok: true,
      json: async () => mockProducts,
    });

    // Act
    const { result } = renderHook(() => useProductsQuery(), {
      wrapper: createWrapper(),
    });

    // Assert
    // Aguarda a query resolver (PGEC Nível 3)
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Verifica se os dados corretos foram retornados
    expect(result.current.data).toEqual(mockProducts);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);

    // Verifica se a API (abstração) foi chamada
    expect(mockedApiGet).toHaveBeenCalledTimes(1);
    expect(mockedApiGet).toHaveBeenCalledWith(); // Verifica se foi chamada sem args
  });

  it('DEVE retornar um erro se a chamada à API falhar (ex: promise rejeitada)', async () => {
    // Arrange
    const mockError = new Error('Falha na conexão com a API');

    // Mockar a chamada para rejeitar (simulando falha de rede ou 500)
    mockedApiGet.mockRejectedValue(mockError);

    // Act
    const { result } = renderHook(() => useProductsQuery(), {
      wrapper: createWrapper(),
    });

    // Assert
    // Aguarda o estado de erro
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(mockError);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

   it('DEVE retornar um erro se a resposta da API não for "ok"', async () => {
    // Arrange
    const errorResponseMessage = 'Erro interno do servidor';
    
    // Mockar uma resposta com 'ok: false'
    mockedApiGet.mockResolvedValue({
      ok: false,
      statusText: 'Internal Server Error',
      json: async () => ({ message: errorResponseMessage }),
    });

    // Act
    const { result } = renderHook(() => useProductsQuery(), {
      wrapper: createWrapper(),
    });

    // Assert
    await waitFor(() => expect(result.current.isError).toBe(true));

    // A lógica de fetchProducts extrai a mensagem e lança um novo Error
    expect(result.current.error).toEqual(new Error(errorResponseMessage));
    expect(result.current.isSuccess).toBe(false);
  });

  it('DEVE retornar um array vazio se a API retornar "data" como null mas sem erro', async () => {
    // Arrange
    // (Cenário onde a query funciona mas não há dados, e a API retorna null)
    mockedApiGet.mockResolvedValue({
      ok: true,
      json: async () => null,
    });

    // Act
    const { result } = renderHook(() => useProductsQuery(), {
      wrapper: createWrapper(),
    });

    // Assert
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // A lógica de fetchProducts garante que `|| []` seja retornado
    expect(result.current.data).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
  });
});