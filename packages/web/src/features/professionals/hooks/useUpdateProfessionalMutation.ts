import { useMutation, useQueryClient } from '@tanstack/react-query'
// import { supabase } from '@/packages/supabase/supabase-client'; // <-- REMOVIDO
import { api } from '@/packages/web/src/lib/api' // <-- ADICIONADO
import { ProfessionalSchema, ProfessionalType } from '@/packages/shared-types'
import { z } from 'zod'

// Define the input type for the mutation based on the Zod schema
// It requires the full professional object, including the ID.
type UpdateProfessionalInput = z.infer<typeof ProfessionalSchema>

/**
 * Asynchronous function to update an existing professional in the database.
 * This is the "mutation function" that useMutation will call.
 *
 * @param professionalData - The complete professional object to update, including its ID.
 * @returns The updated professional object from the database.
 */
const updateProfessional = async (professionalData: UpdateProfessionalInput) => {
  const { id, ...dataToUpdate } = professionalData

  if (!id) {
    throw new Error('Professional ID is required for an update operation.')
  }

  // 1. Chama o endpoint dinâmico com 'param' e 'json'
  const res = await api.professionals[':id'].$put({
    param: { id: id.toString() },
    json: dataToUpdate,
  })

  // 2. Tratamento de erro
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: res.statusText }))
    const errorMessage = errorData?.message || 'Failed to update professional'
    console.error(`Error updating professional with id ${id}:`, errorMessage)
    throw new Error(errorMessage)
  }

  // 3. Retorna o JSON
  return await res.json()
}

/**
 * Hook to update an existing professional.
 *
 * Implements CQRS (2.12) by encapsulating the update operation in a dedicated
 * mutation hook. It handles cache invalidation via PTE (2.15).
 *
 * @returns The result of the useMutation hook.
 */
export const useUpdateProfessionalMutation = () => {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    /**
     * mutationFn: The function that performs the async task.
     */
    mutationFn: updateProfessional,

    /**
     * onSuccess: Executed after a successful mutation.
     * PTE (2.15): Invalidates both the main 'professionals' list cache and the
     * specific 'professional' cache for the updated item.
     *
     * @param updatedProfessional - The data returned from the mutationFn.
     */
    onSuccess: (updatedProfessional) => {
      // Invalidate the list of all professionals
      queryClient.invalidateQueries({ queryKey: ['professionals'] })

      // Invalidate the specific cache for this individual professional
      if (updatedProfessional?.id) {
        queryClient.invalidateQueries({
          queryKey: ['professional', updatedProfessional.id],
        })
      }
    },

    /**
     * onError: Executed if the mutation function throws an error.
     */
    onError: (error, variables) => {
      console.error(
        `Failed to update professional with id ${variables.id}:`,
        (error as Error).message,
      )
      // Here you could show a toast notification to the user
    },
  })

  return mutation
}