import { useMutation, useQueryClient } from '@tanstack/react-query';
// VIOLAÇÃO CORRIGIDA: Remove a dependência direta do 'supabase' (baixoível).
// import { supabase } from '@/packages/lib/supabase';

// CORREÇÃO (DIP): Depende da abstração (cliente Hono RPC).
import { api } from '@/packages/web/src/lib/api';
import { ProductType } from '@/packages/shared-types';

/**
 * Define a função assíncrona para atualizar um produto existente através da camada de abstração (API).
 * A função espera receber o objeto completo do produto, incluindo seu ID.
 */
const updateProduct = async (productData: ProductType) => {
  const { id, ...updateData } = productData;

  if (!id) {
    throw new Error('ID do produto é necessário para atualização.');
  }

  // A chamada agora usa o cliente 'api' (abstração), não o 'supabase' (detalhe).
  // Presume-se que existe uma rota 'PUT /products/:id' definida no backend Hono.
  // O cliente Hono RPC 'put' envia o ID no 'param' e o restante dos dados no 'json'.
  const res = await api.products[':id'].$put({
    param: { id: id.toString() },
    json: updateData,
  });

  if (!res.ok) {
    // Tenta extrair uma mensagem de erro do corpo da resposta
    const errorData = await res.json().catch(() => ({ message: res.statusText }));
    const errorMessage = errorData?.message || 'Failed to update product';

    console.error('Error updating product:', errorMessage);
    throw new Error(errorMessage);
  }

  return await res.json();
};

/**
 * Hook customizado (Nível 3 - Server State) para a mutação de atualizar produto.
 * Utiliza @tanstack/react-query para gerenciar a escrita de dados.
 *
 * @returns A mutação para atualizar um produto.
 */
export const useUpdateProductMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProduct,
    onSuccess: ()(data) => {
      // Invalida o cache de 'products' para forçar um refetch da lista
      // (Princípio CQRS e PGEC)
      queryClient.invalidateQueries({ queryKey: ['products'] });

      // Opcional: Atualizar o cache específico deste item com os dados de retorno
      // Isso evita um "flash" de dados antigos se o refetch da lista demorar.
      // queryClient.setQueryData(['products', data.id], data);
    },
    onError: (error) => {
      console.error('Erro ao atualizar produto:', error.message);
      // Aqui poderia ser integrado um toast
      // toast.error("Falha ao atualizar produto", error.message);
    },
  });
};