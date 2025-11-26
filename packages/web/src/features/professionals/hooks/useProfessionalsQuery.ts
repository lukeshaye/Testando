/*
 * Arquivo de Destino: /packages/web/src/features/professionals/hooks/useProfessionalsQuery.ts
 *
 * Tarefa 1.1: Criar um hook useQuery para buscar a lista completa de profissionais.
 *
 * De Onde (Refatoração): Lógica de fetchProfessionals em src/shared/store.ts.
 * Princípios:
 * - PGEC (2.13) / CQRS (2.12): Implementado como um hook useQuery.
 * - PTE (2.15): Hook auto-contido.
 * - O RLS (Row Level Security) habilitado no Supabase (conforme migrações)
 * garante que o usuário só veja seus próprios dados,
 * removendo a necessidade de filtrar manualmente por `user_id`.
 */

import { useQuery } from '@tanstack/react-query'
// import { supabase } from "@/packages/supabase/supabase-client" // <-- REMOVIDO
import { api } from '@/packages/web/src/lib/api' // <-- ADICIONADO
import { ProfessionalType } from '@/packages/shared-types' // Assumindo novo caminho de tipos
// import { PostgrestError } from "@supabase/supabase-js" // <-- REMOVIDO (Não mais necessário)

/**
 * Define a chave de query para a lista de profissionais.
 */
export const professionalsQueryKey = ['professionals']

/**
 * Função de busca (queryFn) que busca a lista de profissionais via Hono RPC.
 * Exportada para ser reutilizável, se necessário.
 */
export const fetchProfessionals = async (): Promise<ProfessionalType[]> => {
  // 1. Chama a abstração 'api' (Hono RPC)
  const res = await api.professionals.$get()

  // 2. Implementa o tratamento de erro padrão da API
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: res.statusText }))
    const errorMessage = errorData?.message || 'Failed to fetch professionals'
    console.error('Error fetching professionals:', errorMessage)
    throw new Error(errorMessage)
  }

  // 3. Retorna o JSON
  const data = await res.json()
  return (data as ProfessionalType[]) || []
}

/**
 * Hook customizado (useQuery) para buscar e armazenar em cache a lista de
 * profissionais do usuário autenticado.
 */
export const useProfessionalsQuery = () => {
  return useQuery<ProfessionalType[], Error>({ // <-- Tipo de Erro atualizado para Error
    queryKey: professionalsQueryKey,
    queryFn: fetchProfessionals,
  })
}