import { useQuery } from '@tanstack/react-query';
// VIOLAÇÃO CORRIGIDA: Remove a dependência direta do 'supabase' (baixoível).
// import { supabase } from '@/packages/lib/supabase';

// CORREÇÃO (DIP): Depende da abstração (cliente Hono RPC), conforme
// identificado na análise como a arquitetura correta do projeto.
import { api } from '@/packages/web/src/lib/api';
import { ProductType } from '@/packages/shared-types';

/**
 * Define a função assíncrona para buscar os produtos através da camada de abstração (API).
 * Esta função utiliza o cliente Hono RPC (api) para desacoplar o hook da
 * implementação de baixoível (ex: Supabase), aderindo ao Princípio 2.9 (DIP).
 */
const fetchProducts = async (): Promise<ProductType[]> => {
  // A chamada agora usa o cliente 'api' (abstração), não o 'supabase' (detalhe).
  // Presume-se que existe uma rota 'GET /products' definida no backend Hono.
  const res = await api.products.$get();

  if (!res.ok) {
    // Tenta extrair uma mensagem de erro do corpo da resposta
    const errorData = await res.json().catch(() => ({ message: res.statusText }));
    const errorMessage = errorData?.message || 'Failed to fetch products';
    
    console.error('Error fetching products:', errorMessage);
    throw new Error(errorMessage);
  }

  const data = await res.json();

  // Garante que estamos retornando um array, mesmo que data seja null
  return (data as ProductType[]) || [];
};

/**
 * Hook customizado (Nível 3 - Server State) para buscar a lista de produtos.
 * Utiliza @tanstack/react-query para gerenciar cache, isLoading e isError.
 *
 * @returns O resultado da query de produtos.
 */
export const useProductsQuery = () => {
  return useQuery<ProductType[], Error>({
    queryKey: ['products'],
    queryFn: fetchProducts,
  });
};