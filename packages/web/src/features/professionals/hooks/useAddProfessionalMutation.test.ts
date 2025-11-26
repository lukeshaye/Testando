import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { api } from '@/packages/web/src/lib/api' // Import a ser mockado
import { useAddProfessionalMutation } from './useAddProfessionalMutation'
import type { ProfessionalType, CreateProfessionalSchema } from '@/packages/shared-types'
import { z } from 'zod'

// Define o tipo de input esperado para o teste
type AddProfessionalInput = z.infer<typeof CreateProfessionalSchema>

/**
 * Mock do cliente API (Hono/RPC).
 * O código real (useAddProfessionalMutation.ts) utiliza este cliente.
 */
vi.mock('@/packages/web/src/lib/api', () => ({
  api: {
    professionals: {
      $post: vi.fn(),
    },
  },
}))

const mockInput: AddProfessionalInput = {
  name: 'Novo Teste',
  color: '#AABBCC',
  commission_rate: 0.15,
  salary: 40000,
  work_start_time: '08:00',
  work_end_time: '17:00',
  lunch_start_time: '12:00',
  lunch_end_time: '13:00',
}

const mockResponse: ProfessionalType = {
  ...mockInput,
  id: 10,
  created_at: new Date().toISOString(),
}

describe('useAddProfessionalMutation', () => {
  const mockedApi = vi.mocked(api)
  
  // Criamos o QueryClient e o Spy aqui para monitorar invalidateQueries
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: {
        retry: false, // Desabilita retentativas para testes
      },
    },
  })
  
  // Criamos o Spy no invalidateQueries antes de renderizar o hook
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

  const createWrapper = () => ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient.clear() // Limpa o cache entre os testes
    // Resetar a implementação do spy para não afetar contagens
    invalidateSpy.mockClear()
  })

  // Teste 1: Sucesso da Mutação e Invalidação de Cache (CQRS 2.12 / PTE 2.15)
  it('should call the API with correct data and invalidate professionals cache on success', async () => {
    // Arrange
    mockedApi.professionals.$post.mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
      status: 201,
      headers: new Headers(),
    })

    // Act
    const { result } = renderHook(() => useAddProfessionalMutation(), {
      wrapper: createWrapper(),
    })

    // Executa a mutação
    result.current.mutate(mockInput)

    // Assert 1: Verifica se a mutação foi bem-sucedida e se o dado retornado é o esperado
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockResponse)

    // Assert 2: Verifica se a função da API foi chamada corretamente
    expect(mockedApi.professionals.$post).toHaveBeenCalledWith({
      json: mockInput,
    })

    // Assert 3: Verifica se o cache de 'professionals' foi invalidado (PTE 2.15)
    expect(invalidateSpy).toHaveBeenCalledTimes(1)
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['professionals'] })
  })

  // Teste 2: Falha da API (res.ok = false)
  it('should handle API failure and return an error without invalidating cache', async () => {
    // Arrange
    const errorBody = { message: 'Validation failed' }
    mockedApi.professionals.$post.mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: async () => errorBody,
      headers: new Headers(),
    })

    // Act
    const { result } = renderHook(() => useAddProfessionalMutation(), {
      wrapper: createWrapper(),
    })

    // Executa a mutação
    result.current.mutate(mockInput)

    // Assert 1: Verifica o estado de erro
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.error?.message).toBe('Validation failed')

    // Assert 2: Verifica que a invalidação de cache NÃO ocorreu
    expect(invalidateSpy).not.toHaveBeenCalled()
  })

  // Teste 3: Falha de rede (Rejected promise)
  it('should handle network errors (rejected promise)', async () => {
    // Arrange
    const networkError = new Error('Network timeout')
    mockedApi.professionals.$post.mockRejectedValue(networkError)

    // Act
    const { result } = renderHook(() => useAddProfessionalMutation(), {
      wrapper: createWrapper(),
    })

    // Executa a mutação
    result.current.mutate(mockInput)

    // Assert 1: Verifica o estado de erro
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBe(networkError)

    // Assert 2: Verifica que a invalidação de cache NÃO ocorreu
    expect(invalidateSpy).not.toHaveBeenCalled()
  })
})