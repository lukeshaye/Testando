import { useQuery } from '@tanstack/react-query'
// import { supabase } from '@/packages/supabase/supabase-client'; // <-- REMOVIDO
import { api } from '@/packages/web/src/lib/api' // <-- ADICIONADO
import { ProfessionalType } from '@/packages/shared-types'

/**
 * Hook to fetch a single professional by their ID.
 *
 * Implements PGEC (2.13) and CQRS (2.12) by encapsulating the read
 * operation in a dedicated React Query hook.
 *
 * @param id - The ID of the professional to fetch.
 * @returns The result of the useQuery hook.
 */
export const useProfessionalByIdQuery = (id: string | number | undefined) => {
  const query = useQuery<ProfessionalType, Error>({
    /**
     * The queryKey uniquely identifies this query.
     * It includes the 'id' so that React Query refetches when the id changes.
     */
    queryKey: ['professional', id],

    /**
     * The queryFn is the asynchronous function that fetches the data.
     */
    queryFn: async () => {
      // The 'enabled' flag (below) ensures that 'id' is defined when this function runs.

      // 1. Chama o endpoint dinâmico
      const res = await api.professionals[':id'].$get({
        param: { id: id!.toString() }, // Passa o ID como param
      })

      // 2. Tratamento de erro
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: res.statusText }))
        const errorMessage = errorData?.message || 'Failed to fetch professional'
        console.error(`Error fetching professional ${id}:`, errorMessage)
        throw new Error(errorMessage)
      }

      // 3. Retorna o JSON
      return await res.json()
    },

    /**
     * The query will only execute if 'id' is a truthy value (not undefined, null, 0, or '').
     */
    enabled: !!id,
  })

  return query
}