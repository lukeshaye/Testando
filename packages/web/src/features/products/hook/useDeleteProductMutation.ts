import { useMutation, useQueryClient } from '@tanstack/react-query';
// import { supabase } from '@/packages/lib/supabase'; // <-- REMOVIDO (Violação do Princípio 2.9 DIP)
import { api } from '@/packages/web/src/lib/api'; // <-- ADICIONADO (Depende da abstração)

/**
 * Função de mutação para excluir um produto.
 * Recebe o ID do produto e executa a operação de exclusão.
 *
 * Refatorado para aderir ao DIP (2.9), esta função agora usa
 * a abstração 'api' (cliente Hono RPC) em vez do 'supabase' diretamente.
 */
const deleteProduct = async (productId: number) => {
  // A chamada agora é feita para o cliente RPC (abstração de alto nível).
  // O hook não sabe se o backend é Supabase, Hono, etc.
  // Usamos o endpoint dinâmico (':id') e passamos o 'param'.
  const res = await api.products[':id'].$delete({
    param: { id: productId.toString() }, // A rota RPC espera o parâmetro como string
  });

  if (!res.ok) {
    // Trata erros vindos da resposta da API
    const errorData = await res.json();
    const errorMessage =
      errorData?.error || 'Falha ao excluir produto. Resposta não-OK.';

    console.error('Error deleting product:', errorMessage);
    throw new Error(errorMessage);
  }

  // A exclusão bem-sucedida não retorna dados, apenas status 200 (ok)
  // O 'return' é implícito.
};

/**
 * Hook (useMutation) para excluir um produto.
 *
 * Este hook encapsula a lógica de exclusão (Command no CQRS) e gerencia
 * a invalidação do cache do React Query (PGEC Nível 3).
 *
 * A estrutura do hook permanece a mesma, pois já adere aos princípios
 * CQRS e PGEC. A única alteração foi na 'mutationFn' (deleteProduct)
 * para corrigir a violação do DIP.
 *
 * @returns Uma mutação do React Query.
 *
 * @exemplo
 * const { mutate, isPending } = useDeleteProductMutation();
 * mutate(productIdToDelete);
 */
export const useDeleteProductMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProduct, // <-- Agora usa a função refatorada
    onSuccess: () => {
      // Invalida o cache de 'products' para forçar um refetch na UI (PGEC/CQRS)
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error) => {
      // Implementação de feedback de erro (conforme plano)
      console.error('Erro ao excluir produto:', error);
      // Aqui seria um bom lugar para adicionar um toast de erro
    },
  });
};