import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { z } from 'zod';

// 1. MUDANÇA: Substituir API estática pelo Hook Autenticado
import { useAuthenticatedApi } from '@/hooks/useAuthenticatedApi'; 
import { CreateProductSchema } from '@/packages/shared-types';
import { useAddProductMutation } from './useAddProductMutation';

// 2. Mockar o Hook de Autenticação
vi.mock('@/hooks/useAuthenticatedApi');

// Criamos a função de mock isolada para podermos verificar chamadas (spies)
const mockPost = vi.fn();

// O tipo de dados que a mutationFn receberá
type ProductData = z.infer<typeof CreateProductSchema>;

// Wrapper do React Query (Sem alterações)
const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
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

beforeEach(() => {
  vi.resetAllMocks();
  
  if (queryClient) {
    queryClient.clear();
  }

  // 3. Configurar o retorno do Hook Mockado
  // Simulamos que o hook retorna um objeto contendo a API estruturada
  (useAuthenticatedApi as any).mockReturnValue({
    api: {
      products: {
        $post: mockPost, // Injetamos nossa função espiã aqui
      },
    },
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('useAddProductMutation (Refatorado com useAuthenticatedApi)', () => {
  
  const newProductData: ProductData = {
    name: 'Produto Teste',
    description: 'Descrição de teste',
    price: 1500,
    quantity: 50,
    image_url: 'http://example.com/image.png',
  };

  const newlyCreatedProduct = {
    ...newProductData,
    id: 'prod_123',
    tenant_id: 'mock-tenant-id',
    created_at: new Date().toISOString(),
  };

  it('DEVE adicionar um produto com sucesso e invalidar o cache de "products"', async () => {
    // Arrange
    mockPost.mockResolvedValue({
      ok: true,
      json: async () => newlyCreatedProduct,
    } as any);

    const wrapper = createWrapper();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useAddProductMutation(), {
      wrapper,
    });

    // Act
    result.current.mutate(newProductData);

    // Assert
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Verifica chamada da API
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledWith({ json: newProductData });

    // Verifica dados retornados
    expect(result.current.data).toEqual(newlyCreatedProduct);

    // Verifica invalidação de cache
    expect(invalidateQueriesSpy).toHaveBeenCalledTimes(1);
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['products'] });
    
    expect(result.current.isError).toBe(false);
  });

  it('DEVE retornar um erro se a chamada à API falhar e NÃO invalidar o cache', async () => {
    // Arrange
    const mockError = { error: 'Falha na inserção via API' };

    mockPost.mockResolvedValue({
      ok: false,
      json: async () => mockError,
    } as any);

    const wrapper = createWrapper();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useAddProductMutation(), {
      wrapper,
    });

    // Act
    result.current.mutate(newProductData);

    // Assert
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error.message).toEqual(mockError.error);

    expect(result.current.isSuccess).toBe(false);
    expect(invalidateQueriesSpy).not.toHaveBeenCalled();
  });
});