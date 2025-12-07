/*
 * Arquivo de Destino: /packages/web/src/features/professionals/hooks/useProfessionalsQuery.test.ts
 *
 * Tarefa: 4. Testes (Refatorado para useAuthenticatedApi)
 *
 * Princípios:
 * - PTE (2.15): Mocka o hook de autenticação para isolar a lógica.
 * - PGEC (2.13): Testa os estados de sucesso e erro.
 */

import { renderHook, waitFor } from "@testing-library/react"
import { vi } from "vitest"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fetchProfessionals, useProfessionalsQuery } from "./useProfessionalsQuery"
// [REFATORADO] Importação do hook de autenticação
import { useAuthenticatedApi } from "@/packages/web/src/hooks/useAuthenticatedApi"
import { ProfessionalType } from "@/packages/shared-types"

// --- Mocking de Dependências (PTE 2.15) ---

// [REFATORADO] 1. Mock do hook useAuthenticatedApi
vi.mock("@/packages/web/src/hooks/useAuthenticatedApi")

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

// [REFATORADO] Configuração do Mock da API
const mockGet = vi.fn()

const mockApi = {
  professionals: {
    $get: mockGet,
  },
}

// Configura o hook para retornar o mockApi
;(useAuthenticatedApi as any).mockReturnValue({
  api: mockApi,
})

// --- Testes ---

describe("fetchProfessionals", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Garante que o hook retorne o mock atualizado a cada teste
    ;(useAuthenticatedApi as any).mockReturnValue({ api: mockApi })
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test("deve retornar a lista de profissionais em caso de sucesso", async () => {
    // Configura o mock de sucesso
    mockGet.mockResolvedValue({
      ok: true,
      json: async () => mockProfessionals,
      status: 200,
      statusText: "OK",
    } as any)

    // [REFATORADO] Passamos o mockApi como dependência
    const professionals = await fetchProfessionals(mockApi as any)

    expect(professionals).toEqual(mockProfessionals)
    expect(mockGet).toHaveBeenCalledTimes(1)
  })

  test("deve lançar um erro se a resposta da API não for 'ok' (com JSON)", async () => {
    const errorResponse = { message: "Acesso Negado" }
    // Configura o mock de erro
    mockGet.mockResolvedValue({
      ok: false,
      json: async () => errorResponse,
      status: 403,
      statusText: "Forbidden",
    } as any)

    // [REFATORADO] Passamos o mockApi como dependência
    await expect(fetchProfessionals(mockApi as any)).rejects.toThrow(
      "Acesso Negado",
    )
    expect(console.error).toHaveBeenCalledWith(
      "Error fetching professionals:",
      "Acesso Negado",
    )
  })

  test("deve lançar um erro com statusText se o JSON do erro falhar", async () => {
    // Configura o mock de erro
    mockGet.mockResolvedValue({
      ok: false,
      json: async () => {
        throw new Error("JSON parse error")
      },
      status: 500,
      statusText: "Internal Server Error",
    } as any)

    // [REFATORADO] Passamos o mockApi como dependência
    await expect(fetchProfessionals(mockApi as any)).rejects.toThrow(
      "Internal Server Error",
    )
    expect(console.error).toHaveBeenCalledWith(
      "Error fetching professionals:",
      "Internal Server Error",
    )
  })
})

describe("useProfessionalsQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(useAuthenticatedApi as any).mockReturnValue({ api: mockApi })
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test("deve buscar dados com sucesso e preencher 'data' (PGEC)", async () => {
    mockGet.mockResolvedValue({
      ok: true,
      json: async () => mockProfessionals,
      status: 200,
      statusText: "OK",
    } as any)

    const { result } = renderHook(() => useProfessionalsQuery(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockProfessionals)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.isError).toBe(false)
    expect(result.current.error).toBeNull()
  })

  test("deve lidar com erro e preencher 'error' (PGEC)", async () => {
    const errorMessage = "Falha na busca"
    mockGet.mockResolvedValue({
      ok: false,
      json: async () => ({ message: errorMessage }),
      status: 500,
      statusText: "Server Error",
    } as any)

    const { result } = renderHook(() => useProfessionalsQuery(), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.data).toBeUndefined()
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.error?.message).toBe(errorMessage)
  })
})