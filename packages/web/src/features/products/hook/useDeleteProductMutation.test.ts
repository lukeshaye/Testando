import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';

import { useAuthenticatedApi } from '@/hooks/useAuthenticatedApi';
import { useDeleteProductMutation } from './useDeleteProductMutation';

// 1. Mockar o hook de autenticação (Princípio PTE 2.15 e DIP 2.9)
vi.mock('@/hooks/useAuthenticatedApi');

// 2. Criar um wrapper de teste para o React Query (Permanece o mesmo)
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

// 3. Limpar mocks antes de cada teste
const mockApi = {
  products: {
    ':id': {
      $delete: vi.fn(),
    },
  },
};

beforeEach(() => {
  vi.resetAllMocks();
  // Configurar o mock do hook de autenticação
  (useAuthenticatedApi as any).mockReturnValue(mockApi);
  if (queryClient) {
    queryClient.clear();
  }
});

afterEach(() => {
  vi.clearAllMocks();
});

// 4. Descrever os testes para o hook de mutação
describe('useDeleteProductMutation (Teste de Hook - PTE 2.15)', () => {
  
  const productIdToDelete = 42;

  it('DEVE excluir um produto com sucesso e invalidar o cache de "products" (CQRS Command)', async () => {
    // Arrange
    // Configura o mock da API para um retorno de sucesso
    // A API Hono RPC retorna um objeto 'Response'
    mockApi.products[':id'].$delete.mockResolvedValue({
      ok: true,
      json: async () => ({}), // A exclusão não retorna corpo
    } as any); // 'as any' para simplificar o mock da 'Response'

    // Espiona o método invalidateQueries
    const wrapper = createWrapper();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useDeleteProductMutation(), {
      wrapper,
    });

    // Act
    result.current.mutate(productIdToDelete);

    // Assert
    // Aguarda a mutação ser concluída com sucesso
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // 1. Verifica se a API (abstração) foi chamada corretamente
    expect(mockApi.products[':id'].$delete).toHaveBeenCalledTimes(1);
    // O hook refatorado converte o ID para string para o 'param' da rota
    expect(mockApi.products[':id'].$delete).toHaveBeenCalledWith({
      param: { id: productIdToDelete.toString() },
    });

    // 2. Verifica se a mutação foi bem-sucedida (sem retorno de dados)
    expect(result.current.data).toBeUndefined();
    expect(result.current.isError).toBe(false);

    // 3. Verifica se o cache foi invalidado (CQRS)
    expect(invalidateQueriesSpy).toHaveBeenCalledTimes(1);
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['products'] });
  });

  it('DEVE retornar um erro se a chamada à API falhar e NÃO invalidar o cache', async () => {
    // Arrange
    const mockErrorMsg = 'Falha na exclusão (ex: RLS, violação de FK)';
    
    // Configura o mock da API para um retorno de erro (!res.ok)
    mockApi.products[':id'].$delete.mockResolvedValue({
      ok: false,
      json: async () => ({ error: mockErrorMsg }),
    } as any);

    // Espiona o método invalidateQueries
    const wrapper = createWrapper();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useDeleteProductMutation(), {
      wrapper,
    });

    // Act
    result.current.mutate(productIdToDelete);

    // Assert
    // Aguarda a mutação falhar
    await waitFor(() => expect(result.current.isError).toBe(true));

    // 1. Verifica se o erro foi propagado
    // O hook refatorado lança um 'new Error()' com a mensagem da API
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error.message).toEqual(mockErrorMsg);

    // 2. Verifica se a mutação não foi bem-sucedida
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.data).toBeUndefined();

    // 3. (MAIS IMPORTANTE) Verifica se o cache NÃO foi invalidado
    expect(invalidateQueriesSpy).not.toHaveBeenCalled();
  });
});