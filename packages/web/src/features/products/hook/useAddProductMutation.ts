import { useMutation, useQueryClient } from '@tanstack/react-query';
// import { supabase } from '@/packages/lib/supabase'; // <-- REMOVIDO (Violação do Princípio 2.9 DIP)
import { api } from '@/packages/web/src/lib/api'; // <-- ADICIONADO (Depende da abstração)
import { CreateProductSchema } from '@/packages/shared-types';
import { z } from 'zod';

// O tipo de dados que a mutationFn receberá, derivado do Zod schema
// (Permanece o mesmo, pois o schema é compartilhado)
type ProductData = z.infer<typeof CreateProductSchema>;

/**
 * Define a função assíncrona para adicionar um novo produto.
 *
 * Esta função foi refatorada para aderir ao Princípio da Inversão de Dependência (2.9).
 * Ela não depende mais da implementação de baixo nível (supabase), mas sim
 * da abstração 'api' (cliente Hono RPC).
 */
const addProduct = async (productData: ProductData) => {
  // A chamada agora é feita para o cliente RPC (abstração de alto nível).
  // O hook não sabe mais qual é o backend (Supabase, Hono, etc.)
  const res = await api.products.$post({ json: productData });

  if (!res.ok) {
    // Trata erros vindos da resposta da API
    const errorData = await res.json();
    const errorMessage =
      errorData?.error || 'Falha ao adicionar produto. Resposta não-OK.';

    console.error('Error adding product:', errorMessage);
    throw new Error(errorMessage);
  }

  // Retorna os dados do produto criado (tipo inferido pelo cliente RPC)
  const data = await res.json();
  return data;
};

/**
 * Hook customizado (Nível 3 - Server State) para a mutação de adicionar produto.
 * Utiliza @tanstack/react-query para gerenciar a escrita de dados.
 *
 * A estrutura do hook permanece a mesma, pois já adere aos princípios
 * CQRS e PGEC. A única alteração foi na 'mutationFn' (addProduct)
 * para corrigir a violação do DIP.
 *
 * @returns A mutação para adicionar um novo produto.
 */
export const useAddProductMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addProduct, // <-- Agora usa a função refatorada
    onSuccess: () => {
      // Invalida o cache de 'products' para forçar um refetch da lista
      // (Princípio CQRS e PGEC)
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error) => {
      // Implementação de feedback de erro (Princípio 3.1.2.5)
      console.error('Erro ao adicionar produto:', error.message);
      // Aqui poderia ser integrado um toast, por exemplo:
      // toast.error("Falha ao adicionar produto", error.message);
    },
  });
};