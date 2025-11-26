import { useMutation, useQueryClient } from '@tanstack/react-query'
// import { supabase } from '@/packages/supabase/supabase-client'; // <-- REMOVIDO
import { api } from '@/packages/web/src/lib/api' // <-- ADICIONADO

/**
 * Asynchronous function to delete a professional from the database.
 * This is the "mutation function" that useMutation will call.
 *
 * @param id - The ID of the professional to delete.
 * @returns The result of the delete operation.
 */
const deleteProfessional = async (id: number) => {
  // 1. Chama o endpoint dinâmico com 'param'
  const res = await api.professionals[':id'].$delete({
    param: { id: id.toString() },
  })

  // 2. Tratamento de erro
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: res.statusText }))
    const errorMessage = errorData?.message || 'Failed to delete professional'
    console.error(`Error deleting professional with id ${id}:`, errorMessage)
    throw new Error(errorMessage)
  }

  // 3. Delete não retorna corpo, apenas sucesso
  return { success: true }
}

/**
 * Hook to delete a professional.
 *
 * Implements CQRS (2.12) by encapsulating the delete operation in a dedicated
 * mutation hook. It handles cache invalidation via PTE (2.15).
 *
 * @returns The result of the useMutation hook.
 */
export const useDeleteProfessionalMutation = () => {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    /**
     * mutationFn: The function that performs the async task.
     * It receives the 'id' directly.
     */
    mutationFn: deleteProfessional,

    /**
     * onSuccess: Executed after a successful mutation.
     * PTE (2.15): Invalidates the main 'professionals' cache to force a refetch,
     * ensuring the UI (e.g., data table) removes the deleted professional.
     */
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professionals'] })
    },

    /**
     * onError: Executed if the mutation function throws an error.
     */
    onError: (error, id) => {
      console.error(
        `Failed to delete professional with id ${id}:`,
        (error as Error).message,
      )
      // Here you could show a toast notification to the user
    },
  })

  return mutation
}