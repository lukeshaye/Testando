import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';

// REFATORAÇÃO: Substituição da importação estática pelo Hook Autenticado
import { useAuthenticatedApi } from '@/hooks/useAuthenticatedApi';
import { ProductType } from '@/packages/shared-types';
import { useProductsQuery } from './useProductsQuery';

// 1. Mockar o hook de autenticação em vez da lib/api direta
vi.mock('@/hooks/useAuthenticatedApi');

// 2. Criar a função spy (mock) que será injetada
const mockGet = vi.fn();

// Wrapper do React Query
const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
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

// 3. Configuração antes de cada teste
beforeEach(() => {
  vi.resetAllMocks();
  
  // Configura o retorno do hook useAuthenticatedApi para usar nosso mockGet
  (useAuthenticatedApi as any).mockReturnValue({
    api: {
      products: {
        $get: mockGet,
      },
    },
  });

  if (queryClient) {
    queryClient.clear();
  }
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('useProductsQuery (Refatorado com useAuthenticatedApi)', () => {
  
  it('DEVE estar no estado "isLoading" inicialmente', () => {
    // Arrange
    mockGet.mockReturnValue(new Promise(() => {}));

    // Act
    const { result } = renderHook(() => useProductsQuery(), {
      wrapper: createWrapper(),
    });

    // Assert
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it('DEVE buscar e retornar os dados dos produtos com sucesso', async () => {
    // Arrange
    const mockProducts: ProductType[] = [
      { id: 1, name: 'Produto A', price: 1000, quantity: 10, description: 'Desc A', image_url: 'url_a', tenant_id: 't1' },
      { id: 2, name: 'Produto B', price: 2000, quantity: 5, description: 'Desc B', image_url: 'url_b', tenant_id: 't1' },
    ];

    mockGet.mockResolvedValue({
      ok: true,
      json: async () => mockProducts,
    });

    // Act
    const { result } = renderHook(() => useProductsQuery(), {
      wrapper: createWrapper(),
    });

    // Assert
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockProducts);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);

    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it('DEVE retornar um erro se a chamada à API falhar (ex: promise rejeitada)', async () => {
    // Arrange
    const mockError = new Error('Falha na conexão com a API');
    mockGet.mockRejectedValue(mockError);

    // Act
    const { result } = renderHook(() => useProductsQuery(), {
      wrapper: createWrapper(),
    });

    // Assert
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(mockError);
    expect(result.current.isSuccess).toBe(false);
  });

   it('DEVE retornar um erro se a resposta da API não for "ok"', async () => {
    // Arrange
    const errorResponseMessage = 'Erro interno do servidor';
    
    mockGet.mockResolvedValue({
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
    expect(result.current.error).toEqual(new Error(errorResponseMessage));
  });

  it('DEVE retornar um array vazio se a API retornar "data" como null mas sem erro', async () => {
    // Arrange
    mockGet.mockResolvedValue({
      ok: true,
      json: async () => null,
    });

    // Act
    const { result } = renderHook(() => useProductsQuery(), {
      wrapper: createWrapper(),
    });

    // Assert
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});