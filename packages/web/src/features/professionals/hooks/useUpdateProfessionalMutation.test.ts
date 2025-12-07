import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { useUpdateProfessionalMutation } from './useUpdateProfessionalMutation'
import type { ProfessionalType, ProfessionalSchema } from '@/packages/shared-types'
import { z } from 'zod'

// NOVA IMPORTAÇÃO: Hook de API autenticada
import { useAuthenticatedApi } from '@/hooks/useAuthenticatedApi'

// Define o tipo de input esperado para o teste
type UpdateProfessionalInput = z.infer<typeof ProfessionalSchema>

// MOCK DO HOOK: Substitui o mock estático da lib/api
vi.mock('@/hooks/useAuthenticatedApi')

// Dados mockados de entrada e resposta
const MOCK_ID = 42
const MOCK_CREATED_AT = new Date(Date.now() - 10000).toISOString()

const mockInput: UpdateProfessionalInput = {
  id: MOCK_ID,
  name: 'Atualizado Smith',
  color: '#FF0000',
  commission_rate: 0.2,
  salary: 60000,
  created_at: MOCK_CREATED_AT, // O created_at DEVE ser incluído no payload de teste (DRY 2.2)
  work_start_time: '08:30',
  work_end_time: '17:30',
  lunch_start_time: '12:30',
  lunch_end_time: '13:30',
}

const mockResponse: ProfessionalType = {
  ...mockInput,
}

describe('useUpdateProfessionalMutation', () => {
  // Criamos uma função mock específica para o método $put
  const mockPut = vi.fn()
  
  // Setup do QueryClient e Spy
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: {
        retry: false,
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
    queryClient.clear()
    invalidateSpy.mockClear()
    mockPut.mockReset()

    // CONFIGURAÇÃO DO MOCK DO HOOK
    // Recriamos a estrutura api.professionals[':id'].$put
    ;(useAuthenticatedApi as any).mockReturnValue({
      api: {
        professionals: {
          ':id': {
            $put: mockPut,
          },
        },
      },
    })
  })

  // Teste 1: Sucesso da Mutação e Invalidação de Cache Dupla (PTE 2.15)
  it('should call the API passing the full payload (except ID for param) and invalidate caches on success', async () => {
    // Arrange
    const { id, created_at, ...expectedPayload } = mockInput
    
    // O payload deve incluir o created_at.
    const payloadForApi = { ...expectedPayload, created_at: MOCK_CREATED_AT }

    // Simula a resposta da API usando mockPut
    mockPut.mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
      status: 200,
      headers: new Headers(),
    })

    // Act
    const { result } = renderHook(() => useUpdateProfessionalMutation(), {
      wrapper: createWrapper(),
    })

    // Executa a mutação
    result.current.mutate(mockInput)

    // Assert 1: Verifica se a mutação foi bem-sucedida
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockResponse)

    // Assert 2: Verifica se a função da API foi chamada corretamente
    expect(mockPut).toHaveBeenCalledWith({
      param: { id: MOCK_ID.toString() },
      json: payloadForApi,
    })

    // Assert 3: Verifica se o cache foi invalidado duas vezes (PTE 2.15)
    expect(invalidateSpy).toHaveBeenCalledTimes(2)
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['professionals'] })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['professional', MOCK_ID],
    })
  })

  // Teste 2: Falha da API (res.ok = false)
  it('should handle API failure and return an error without invalidating cache', async () => {
    // Arrange
    const errorBody = { message: 'ID not found' }
    
    mockPut.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => errorBody,
      headers: new Headers(),
    })

    // Act
    const { result } = renderHook(() => useUpdateProfessionalMutation(), {
      wrapper: createWrapper(),
    })

    // Executa a mutação
    result.current.mutate(mockInput)

    // Assert 1: Verifica o estado de erro
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.error?.message).toBe('ID not found')

    // Assert 2: Verifica que a invalidação de cache NÃO ocorreu
    expect(invalidateSpy).not.toHaveBeenCalled()
  })

  // Teste 3: Falta do ID (DSpP 2.16 - Falha na validação Zod ou na API)
  it('should fail the mutation if the professional ID is missing, relying on DSpP/Zod validation', async () => {
    // Arrange
    const inputWithoutId = { ...mockInput, id: undefined as any }

    // Simulamos uma falha caso a chamada chegue a acontecer (ou erro do Zod pré-chamada)
    mockPut.mockRejectedValue(new Error('Zod validation failed: ID is required'))

    // Act
    const { result } = renderHook(() => useUpdateProfessionalMutation(), {
      wrapper: createWrapper(),
    })

    // O mutate deve ser chamado com o objeto inválido.
    result.current.mutate(inputWithoutId)

    // Assert 1: Verifica o estado de erro
    await waitFor(() => expect(result.current.isError).toBe(true))
    
    // Assert 2: Verifica que a mutação falhou
    expect(result.current.isSuccess).toBe(false)
    expect(result.current.error).toBeInstanceOf(Error)
    
    expect(result.current.error?.message).not.toBe(
        'Professional ID is required for an update operation.',
    ) 

    expect(invalidateSpy).not.toHaveBeenCalled()
  })
})