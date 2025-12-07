import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';

// 1. MUDANÇA: Removemos a importação estática da api e adicionamos o hook de autenticação
// import { api } from '@/packages/web/src/lib/api'; // <-- REMOVIDO
import { useAuthenticatedApi } from '@/hooks/useAuthenticatedApi'; // <-- ADICIONADO
import { useDeleteProductMutation } from './useDeleteProductMutation';

// 2. MUDANÇA: Mockamos o hook em vez da biblioteca
vi.mock('@/hooks/useAuthenticatedApi');

// Criamos o spy function globalmente para usar nos testes
const mockDeleteRpc = vi.fn();

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
  
  // 3. MUDANÇA: Configuramos o retorno do hook useAuthenticatedApi
  // Recriando a estrutura: api.products[':id'].$delete
  (useAuthenticatedApi as any).mockReturnValue({
    api: {
      products: {
        ':id': {
          $delete: mockDeleteRpc,
        },
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

describe('useDeleteProductMutation (Refatorado para useAuthenticatedApi)', () => {
  
  const productIdToDelete = 42;

  it('DEVE excluir um produto com sucesso e invalidar o cache de "products"', async () => {
    // Arrange
    // Configura o mock da função RPC para sucesso
    mockDeleteRpc.mockResolvedValue({
      ok: true,
      json: async () => ({}), 
    } as any);

    const wrapper = createWrapper();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useDeleteProductMutation(), {
      wrapper,
    });

    // Act
    result.current.mutate(productIdToDelete);

    // Assert
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Verifica se a função mockada foi chamada
    expect(mockDeleteRpc).toHaveBeenCalledTimes(1);
    expect(mockDeleteRpc).toHaveBeenCalledWith({
      param: { id: productIdToDelete.toString() },
    });

    expect(result.current.data).toBeUndefined();
    expect(result.current.isError).toBe(false);

    // Verifica invalidação do cache
    expect(invalidateQueriesSpy).toHaveBeenCalledTimes(1);
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['products'] });
  });

  it('DEVE retornar um erro se a chamada à API falhar e NÃO invalidar o cache', async () => {
    // Arrange
    const mockErrorMsg = 'Falha na exclusão (ex: RLS, violação de FK)';
    
    // Configura o mock da função RPC para erro
    mockDeleteRpc.mockResolvedValue({
      ok: false,
      json: async () => ({ error: mockErrorMsg }),
    } as any);

    const wrapper = createWrapper();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useDeleteProductMutation(), {
      wrapper,
    });

    // Act
    result.current.mutate(productIdToDelete);

    // Assert
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error.message).toEqual(mockErrorMsg);
    expect(result.current.isSuccess).toBe(false);

    // Verifica que o cache NÃO foi invalidado
    expect(invalidateQueriesSpy).not.toHaveBeenCalled();
  });
});