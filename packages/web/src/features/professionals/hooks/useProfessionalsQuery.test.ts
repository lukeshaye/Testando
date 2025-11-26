/*
 * Arquivo de Destino: /packages/web/src/features/professionals/hooks/useProfessionalsQuery.test.ts
 *
 * Tarefa: 4. Testes (PTE 2.15)
 *
 * Princípios:
 * - PTE (2.15): Mocka a dependência externa (o cliente 'api' Hono RPC)
 * para isolar a lógica do hook e da função de fetch.
 * - PGEC (2.13): Testa os estados de sucesso (data) e erro (error)
 * retornados pelo useQuery.
 */

import { renderHook, waitFor } from "@testing-library/react"
import { vi } from "vitest"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fetchProfessionals, useProfessionalsQuery } from "./useProfessionalsQuery"
import { api } from "@/packages/web/src/lib/api" // Dependência a ser mockada
import { ProfessionalType } from "@/packages/shared-types"

// --- Mocking de Dependências (PTE 2.15) ---

// 1. Mock do cliente 'api' Hono RPC
vi.mock("@/packages/web/src/lib/api", () => ({
  api: {
    professionals: {
      $get: vi.fn(),
    },
  },
}))

// 2. Criar um wrapper do QueryClient para os testes do hook
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Desabilita retries para testes
      },
    },
  })

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = createTestQueryClient()
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

// --- Dados de Mock ---

const mockProfessionals: ProfessionalType[] = [
  {
    id: "1",
    name: "Dr. João Silva",
    color: "#0000ff",
    salary: 500000,
    commission_rate: 0.1,
    created_at: new Date().toISOString(),
    user_id: "user-1",
    work_start_time: null,
    work_end_time: null,
    lunch_start_time: null,
    lunch_end_time: null,
  },
  {
    id: "2",
    name: "Maria Oliveira",
    color: "#ff0000",
    salary: 450000,
    commission_rate: 0.05,
    created_at: new Date().toISOString(),
    user_id: "user-2",
    work_start_time: null,
    work_end_time: null,
    lunch_start_time: null,
    lunch_end_time: null,
  },
]

// Cast do mock para o tipo correto da API
const mockedApiGet = vi.mocked(api.professionals.$get)

// --- Testes ---

describe("fetchProfessionals", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, "error").mockImplementation(() => {}) // Suprime logs de erro
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test("deve retornar a lista de profissionais em caso de sucesso", async () => {
    // Configura o mock de sucesso
    mockedApiGet.mockResolvedValue({
      ok: true,
      json: async () => mockProfessionals,
      status: 200,
      statusText: "OK",
    } as any) // 'as any' para simplificar a estrutura do mock da Response

    const professionals = await fetchProfessionals()

    expect(professionals).toEqual(mockProfessionals)
    expect(mockedApiGet).toHaveBeenCalledTimes(1)
  })

  test("deve lançar um erro se a resposta da API não for 'ok' (com JSON)", async () => {
    const errorResponse = { message: "Acesso Negado" }
    // Configura o mock de erro
    mockedApiGet.mockResolvedValue({
      ok: false,
      json: async () => errorResponse,
      status: 403,
      statusText: "Forbidden",
    } as any)

    await expect(fetchProfessionals()).rejects.toThrow("Acesso Negado")
    expect(console.error).toHaveBeenCalledWith(
      "Error fetching professionals:",
      "Acesso Negado",
    )
  })

  test("deve lançar um erro com statusText se o JSON do erro falhar", async () => {
    // Configura o mock de erro
    mockedApiGet.mockResolvedValue({
      ok: false,
      json: async () => {
        throw new Error("JSON parse error")
      },
      status: 500,
      statusText: "Internal Server Error",
    } as any)

    await expect(fetchProfessionals()).rejects.toThrow("Internal Server Error")
    expect(console.error).toHaveBeenCalledWith(
      "Error fetching professionals:",
      "Internal Server Error",
    )
  })
})

describe("useProfessionalsQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, "error").mockImplementation(() => {}) // Suprime logs de erro
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test("deve buscar dados com sucesso e preencher 'data' (PGEC)", async () => {
    mockedApiGet.mockResolvedValue({
      ok: true,
      json: async () => mockProfessionals,
      status: 200,
      statusText: "OK",
    } as any)

    const { result } = renderHook(() => useProfessionalsQuery(), { wrapper })

    // Espera o hook resolver
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockProfessionals)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.isError).toBe(false)
    expect(result.current.error).toBeNull()
  })

  test("deve lidar com erro e preencher 'error' (PGEC)", async () => {
    const errorMessage = "Falha na busca"
    mockedApiGet.mockResolvedValue({
      ok: false,
      json: async () => ({ message: errorMessage }),
      status: 500,
      statusText: "Server Error",
    } as any)

    const { result } = renderHook(() => useProfessionalsQuery(), { wrapper })

    // Espera o hook resolver para o estado de erro
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.data).toBeUndefined()
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.error?.message).toBe(errorMessage)
  })
})