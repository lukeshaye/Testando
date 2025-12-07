import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';

// REFATORADO: Nova importação do hook de autenticação
// Ajuste o caminho se necessário (ex: '@/hooks/...' ou '@/packages/web/src/hooks/...')
import { useAuthenticatedApi } from '@/packages/web/src/hooks/useAuthenticatedApi'; 

import { ProductType } from '@/packages/shared-types';
import { useUpdateProductMutation } from './useUpdateProductMutation';

// REFATORADO: Mock do hook em vez da lib estática
vi.mock('@/packages/web/src/hooks/useAuthenticatedApi');

// Cria o mock da função $put globalmente para ser usado nas asserções
const mockedApiPut = vi.fn();

// Wrapper do React Query
const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
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

beforeEach(() => {
  vi.resetAllMocks();
  if (queryClient) {
    queryClient.clear();
  }

  // REFATORADO: Configura o retorno do hook simulando a estrutura da API
  (useAuthenticatedApi as any).mockReturnValue({
    api: {
      products: {
        ':id': {
          $put: mockedApiPut,
        },
      },
    },
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('useUpdateProductMutation (Refatorado - Auth Hook)', () => {
  
  const originalProduct: ProductType = {
    id: 1,
    name: 'Produto Antigo',
    price: 1000,
    quantity: 10,
    description: 'Desc Antiga',
    image_url: 'url_antiga',
    tenant_id: 't1',
  };

  const updatedProductData: ProductType = {
    ...originalProduct,
    name: 'Produto Atualizado',
    price: 1500,
  };

  const { id: _, ...updateData } = updatedProductData;

  it('DEVE atualizar um produto com sucesso e invalidar o cache de "products"', async () => {
    // Arrange
    mockedApiPut.mockResolvedValue({
      ok: true,
      json: async () => updatedProductData,
    });

    const wrapper = createWrapper();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateProductMutation(), {
      wrapper,
    });

    // Act
    result.current.mutate(updatedProductData);

    // Assert
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedApiPut).toHaveBeenCalledTimes(1);
    expect(mockedApiPut).toHaveBeenCalledWith({
      param: { id: updatedProductData.id.toString() },
      json: updateData,
    });

    expect(result.current.data).toEqual(updatedProductData);

    expect(invalidateQueriesSpy).toHaveBeenCalledTimes(1);
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['products'] });
    
    expect(result.current.isError).toBe(false);
  });

  it('DEVE retornar um erro se a chamada à API falhar e NÃO invalidar o cache', async () => {
    // Arrange
    const mockErrorMsg = 'Falha na atualização (ex: RLS)';
    mockedApiPut.mockResolvedValue({
      ok: false,
      json: async () => ({ message: mockErrorMsg }),
      statusText: 'Bad Request',
    });

    const wrapper = createWrapper();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateProductMutation(), {
      wrapper,
    });

    // Act
    result.current.mutate(updatedProductData);

    // Assert
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(new Error(mockErrorMsg));
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(invalidateQueriesSpy).not.toHaveBeenCalled();
  });

  it('DEVE retornar um erro se o ID do produto não for fornecido (erro síncrono)', async () => {
    // Arrange
    const productMissingId = {
      name: 'Produto sem ID',
      price: 100,
      quantity: 1,
    } as any;

    const wrapper = createWrapper();
    const { result } = renderHook(() => useUpdateProductMutation(), {
      wrapper,
    });

    // Act
    result.current.mutate(productMissingId);

    // Assert
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('ID do produto é necessário para atualização.');
    expect(mockedApiPut).not.toHaveBeenCalled();
  });
});