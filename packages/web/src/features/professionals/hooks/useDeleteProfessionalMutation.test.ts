import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { useAuthenticatedApi } from '@/hooks/useAuthenticatedApi' // 1. Nova importação
import { useDeleteProfessionalMutation } from './useDeleteProfessionalMutation'

// 2. Mock do novo hook em vez da lib/api
vi.mock('@/hooks/useAuthenticatedApi')

describe('useDeleteProfessionalMutation', () => {
  const PROFESSIONAL_ID = 99
  
  // 3. Criamos uma função mock específica para o método DELETE
  const mockDelete = vi.fn()

  // Setup do QueryClient
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: {
        retry: false, 
      },
    },
  })
  
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

  const createWrapper = () => ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient.clear()
    invalidateSpy.mockClear()

    // 4. Configuramos o retorno do hook para usar nossa função mockDelete
    ;(useAuthenticatedApi as any).mockReturnValue({
      api: {
        professionals: {
          ':id': {
            $delete: mockDelete,
          },
        },
      },
    })
  })

  // Teste 1: Sucesso
  it('should call the API with the correct ID and invalidate professionals cache on success', async () => {
    // Arrange
    mockDelete.mockResolvedValue({
      ok: true,
      json: async () => ({}),
      status: 204, 
      statusText: 'No Content',
      headers: new Headers(),
    })

    // Act
    const { result } = renderHook(() => useDeleteProfessionalMutation(), {
      wrapper: createWrapper(),
    })

    result.current.mutate(PROFESSIONAL_ID)

    // Assert
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ success: true })

    // Verifica se o mock foi chamado corretamente
    expect(mockDelete).toHaveBeenCalledWith({
      param: { id: PROFESSIONAL_ID.toString() },
    })

    expect(invalidateSpy).toHaveBeenCalledTimes(1)
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['professionals'] })
  })

  // Teste 2: Falha da API
  it('should handle API failure and return an error without invalidating cache', async () => {
    // Arrange
    const errorBody = { message: 'Deletion forbidden' }
    mockDelete.mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      json: async () => errorBody,
      headers: new Headers(),
    })

    // Act
    const { result } = renderHook(() => useDeleteProfessionalMutation(), {
      wrapper: createWrapper(),
    })

    result.current.mutate(PROFESSIONAL_ID)

    // Assert
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.error?.message).toBe('Deletion forbidden')

    expect(invalidateSpy).not.toHaveBeenCalled()
  })

  // Teste 3: Falha de rede
  it('should handle network errors (rejected promise)', async () => {
    // Arrange
    const networkError = new Error('Network timeout')
    mockDelete.mockRejectedValue(networkError)

    // Act
    const { result } = renderHook(() => useDeleteProfessionalMutation(), {
      wrapper: createWrapper(),
    })

    result.current.mutate(PROFESSIONAL_ID)

    // Assert
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBe(networkError)

    expect(invalidateSpy).not.toHaveBeenCalled()
  })
})