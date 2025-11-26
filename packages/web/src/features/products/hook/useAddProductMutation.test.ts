import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { z } from 'zod';

// import { supabase } from '@/packages/lib/supabase'; // <-- REMOVIDO (Não é mais a dependência)
import { api } from '@/packages/web/src/lib/api'; // <-- ADICIONADO (Nova dependência - Abstração)
import { CreateProductSchema } from '@/packages/shared-types';
import { useAddProductMutation } from './useAddProductMutation';

// 1. Mockar a chamada à API (Hono RPC) (Princípio PTE 2.15 e DIP 2.9)
// O hook agora chama 'api.products.$post'
vi.mock('@/packages/web/src/lib/api', () => ({
  api: {
    products: {
      $post: vi.fn(), // A função de 'escrita' (Command) que será mockada
    },
  },
}));

// Typecasting para facilitar o uso do mock
const mockedApi = api as vi.Mocked<typeof api>;
const mockPost = mockedApi.products.$post; // Acesso direto à função mockada

// O tipo de dados que a mutationFn receberá
type ProductData = z.infer<typeof CreateProductSchema>;

// 2. Criar um wrapper de teste para o React Query (Permanece o mesmo)
const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Desabilita retries para testes
      },
      mutations: {
        retry: false, // Desabilita retries para testes
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
  vi.resetAllMocks(); // Limpa 'mockPost' e outros

  if (queryClient) {
    queryClient.clear();
  }
});

afterEach(() => {
  vi.clearAllMocks();
});

// 4. Descrever os testes para o hook de mutação
describe('useAddProductMutation (Teste de Hook - PTE 2.15)', () => {
  
  // Mock de dados para o teste (Permanece o mesmo)
  const newProductData: ProductData = {
    name: 'Produto Teste',
    description: 'Descrição de teste',
    price: 1500, // 15.00
    quantity: 50,
    image_url: 'http://example.com/image.png',
  };

  const newlyCreatedProduct = {
    ...newProductData,
    id: 'prod_123', // O que a API RPC retornaria
    tenant_id: 'mock-tenant-id',
    created_at: new Date().toISOString(),
  };

  it('DEVE adicionar um produto com sucesso e invalidar o cache de "products" (CQRS Command)', async () => {
    // Arrange
    // Configura o mock da API para um retorno de sucesso
    // A API Hono RPC retorna um objeto 'Response' (ou similar) com .ok e .json()
    mockPost.mockResolvedValue({
      ok: true,
      json: async () => newlyCreatedProduct,
    } as any); // 'as any' para simplificar o mock da 'Response'

    // Espiona o método invalidateQueries para verificar se foi chamado
    const wrapper = createWrapper();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useAddProductMutation(), {
      wrapper,
    });

    // Act
    // Chama a função de mutação
    result.current.mutate(newProductData);

    // Assert
    // Aguarda a mutação ser concluída com sucesso
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // 1. Verifica se a API (abstração) foi chamada corretamente
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledWith({ json: newProductData });

    // 2. Verifica se a mutação retornou os dados corretos
    expect(result.current.data).toEqual(newlyCreatedProduct);

    // 3. (MAIS IMPORTANTE) Verifica se o cache foi invalidado (CQRS)
    expect(invalidateQueriesSpy).toHaveBeenCalledTimes(1);
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['products'] });
    
    expect(result.current.isError).toBe(false);
  });

  it('DEVE retornar um erro se a chamada à API falhar e NÃO invalidar o cache', async () => {
    // Arrange
    const mockError = { error: 'Falha na inserção via API' };

    // Configura o mock da API para um retorno de erro (!res.ok)
    mockPost.mockResolvedValue({
      ok: false,
      json: async () => mockError,
    } as any);

    // Espiona o método invalidateQueries
    const wrapper = createWrapper();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useAddProductMutation(), {
      wrapper,
    });

    // Act
    result.current.mutate(newProductData);

    // Assert
    // Aguarda a mutação falhar
    await waitFor(() => expect(result.current.isError).toBe(true));

    // 1. Verifica se o erro foi propagado
    // O hook refatorado cria um 'new Error()' com a mensagem da API
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error.message).toEqual(mockError.error);

    // 2. Verifica se a mutação não foi bem-sucedida
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.data).toBeUndefined();

    // 3. (MAIS IMPORTANTE) Verifica se o cache NÃO foi invalidado
    expect(invalidateQueriesSpy).not.toHaveBeenCalled();
  });
});