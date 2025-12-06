import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { useAuthenticatedApi } from '@/hooks/useAuthenticatedApi'
import { useDeleteProfessionalMutation } from './useDeleteProfessionalMutation'

/**
 * Mock do hook de autenticação.
 */
vi.mock('@/hooks/useAuthenticatedApi')

describe('useDeleteProfessionalMutation', () => {
  const mockApi = {
    professionals: {
      ':id': {
        $delete: vi.fn(),
      },
    },
  }
  const PROFESSIONAL_ID = 99

  // Setup do QueryClient e Spy
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: {
        retry: false, // Desabilita retentativas para testes
      },
    },
  })
  
  // Criamos o Spy no invalidateQueries para monitorar a invalidação de cache
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

  const createWrapper = () => ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  beforeEach(() => {
    vi.clearAllMocks()
    // Configurar o mock do hook de autenticação
    (useAuthenticatedApi as any).mockReturnValue(mockApi)
    queryClient.clear()
    invalidateSpy.mockClear()
  })

  // Teste 1: Sucesso da Mutação e Invalidação de Cache (PTE 2.15)
  it('should call the API with the correct ID and invalidate professionals cache on success', async () => {
    // Arrange
    // Simula a resposta de sucesso para um DELETE (status 200/204, sem corpo)
    mockApi.professionals[':id'].$delete.mockResolvedValue({
      ok: true,
      json: async () => ({}), // O hook real retorna { success: true }
      status: 204, 
      statusText: 'No Content',
      headers: new Headers(),
    })

    // Act
    const { result } = renderHook(() => useDeleteProfessionalMutation(), {
      wrapper: createWrapper(),
    })

    // Executa a mutação
    result.current.mutate(PROFESSIONAL_ID)

    // Assert 1: Verifica se a mutação foi bem-sucedida
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    // O hook retorna { success: true }
    expect(result.current.data).toEqual({ success: true })

    // Assert 2: Verifica se a função da API foi chamada corretamente (CQRS 2.12)
    expect(mockApi.professionals[':id'].$delete).toHaveBeenCalledWith({
      param: { id: PROFESSIONAL_ID.toString() },
    })

    // Assert 3: Verifica se o cache de 'professionals' foi invalidado (PTE 2.15)
    expect(invalidateSpy).toHaveBeenCalledTimes(1)
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['professionals'] })
  })

  // Teste 2: Falha da API (res.ok = false)
  it('should handle API failure and return an error without invalidating cache', async () => {
    // Arrange
    const errorBody = { message: 'Deletion forbidden' }
    mockApi.professionals[':id'].$delete.mockResolvedValue({
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

    // Executa a mutação
    result.current.mutate(PROFESSIONAL_ID)

    // Assert 1: Verifica o estado de erro
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.error?.message).toBe('Deletion forbidden')

    // Assert 2: Verifica que a invalidação de cache NÃO ocorreu
    expect(invalidateSpy).not.toHaveBeenCalled()
  })

  // Teste 3: Falha de rede (Rejected promise)
  it('should handle network errors (rejected promise)', async () => {
    // Arrange
    const networkError = new Error('Network timeout')
    mockApi.professionals[':id'].$delete.mockRejectedValue(networkError)

    // Act
    const { result } = renderHook(() => useDeleteProfessionalMutation(), {
      wrapper: createWrapper(),
    })

    // Executa a mutação
    result.current.mutate(PROFESSIONAL_ID)

    // Assert 1: Verifica o estado de erro
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBe(networkError)

    // Assert 2: Verifica que a invalidação de cache NÃO ocorreu
    expect(invalidateSpy).not.toHaveBeenCalled()
  })
})