import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, describe, it, expect, beforeEach } from 'vitest'
// REMOVIDO: import { api } from '@/packages/web/src/lib/api'
// ADICIONADO: Import do hook de autenticação
import { useAuthenticatedApi } from '@/packages/web/src/hooks/useAuthenticatedApi'
import { useProfessionalByIdQuery } from './useProfessionalByIdQuery'
import type { ProfessionalType } from '@/packages/shared-types'

// REMOVIDO: Mock estático da api
// vi.mock('@/packages/web/src/lib/api', ...

// ADICIONADO: Mock do hook de autenticação
vi.mock('@/packages/web/src/hooks/useAuthenticatedApi')

// Helper para criar um wrapper React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Desabilita retentativas para testes
      },
    },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

// Mock de dados (refletindo o Plano 3.1)
const mockProfessional: ProfessionalType = {
  id: 1,
  name: 'Dr. Teste',
  color: '#123456',
  commission_rate: 0.1,
  salary: 5000.0,
  created_at: new Date().toISOString(),
  work_start_time: '09:00',
  work_end_time: '18:00',
  lunch_start_time: '12:00',
  lunch_end_time: '13:00',
}

describe('useProfessionalByIdQuery', () => {
  // Criamos uma função mock local para controlar o método específico
  const mockGet = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    // Configura o mock do hook para retornar a estrutura da API esperada
    ;(useAuthenticatedApi as any).mockReturnValue({
      api: {
        professionals: {
          ':id': {
            $get: mockGet,
          },
        },
      },
    })
  })

  // Teste (PTE 2.15): Verifica se useQuery retorna os dados corretos
  it('should fetch and return a single professional when id is provided', async () => {
    // Arrange
    const professionalId = 1
    
    mockGet.mockResolvedValue({
      ok: true,
      json: async () => mockProfessional,
      status: 200,
      statusText: 'OK',
      headers: new Headers(),
    })

    // Act
    const { result } = renderHook(
      () => useProfessionalByIdQuery(professionalId),
      {
        wrapper: createWrapper(),
      },
    )

    // Assert
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockProfessional)
    expect(result.current.isError).toBe(false)
    expect(mockGet).toHaveBeenCalledTimes(1)
    expect(mockGet).toHaveBeenCalledWith({
      param: { id: professionalId.toString() },
    })
  })

  // Teste (PTE 2.15): Verifica o estado de erro se a API falhar
  it('should return an error state if the API call is not ok', async () => {
    // Arrange
    const professionalId = 2
    const errorResponse = { message: 'Not Found' }
    
    mockGet.mockResolvedValue({
      ok: false,
      json: async () => errorResponse,
      status: 404,
      statusText: 'Not Found',
      headers: new Headers(),
    })

    // Act
    const { result } = renderHook(() => useProfessionalByIdQuery(professionalId), {
      wrapper: createWrapper(),
    })

    // Assert
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.data).toBeUndefined()
    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.error?.message).toBe('Not Found')
  })

  // Teste (Plano 1.2): Verifica 'enabled: !!id'
  it('should not execute the query if id is not provided (undefined)', () => {
    // Arrange
    const professionalId = undefined

    // Act
    const { result } = renderHook(
      () => useProfessionalByIdQuery(professionalId),
      {
        wrapper: createWrapper(),
      },
    )

    // Assert
    expect(result.current.isLoading).toBe(false) // Não deve estar loading (disabled)
    expect(result.current.isFetching).toBe(false)
    expect(result.current.isSuccess).toBe(false)
    expect(mockGet).not.toHaveBeenCalled()
  })

  // Teste (Plano 1.2): Verifica 'enabled: !!id' com outro valor falsy
  it('should not execute the query if id is 0', () => {
    // Arrange
    const professionalId = 0

    // Act
    const { result } = renderHook(
      () => useProfessionalByIdQuery(professionalId),
      {
        wrapper: createWrapper(),
      },
    )

    // Assert
    expect(result.current.isLoading).toBe(false)
    expect(result.current.isFetching).toBe(false)
    expect(mockGet).not.toHaveBeenCalled()
  })
})