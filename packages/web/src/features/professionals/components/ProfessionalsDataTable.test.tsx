/*
 * Arquivo de Destino: /packages/web/src/features/professionals/components/ProfessionalsDataTable.test.tsx
 *
 * Tarefa: 4. Testes (PTE 2.15)
 *
 * Princípios:
 * - PTE (2.15): Mocka os hooks (useProfessionalsQuery, useDeleteProfessionalMutation)
 * para isolar o componente e testar sua lógica de UI.
 * - PGEC (2.13): Testa os estados de loading, error e empty.
 * - SoC (2.5): Testa se os botões de "Novo", "Editar" e "Excluir"
 * acionam os estados corretos (abertura de modal/alerta) e
 * delegam a lógica (chamada da mutação).
 */

import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { vi } from "vitest"
import { ProfessionalsDataTable } from "./ProfessionalsDataTable"
import { ProfessionalType } from "@/@types/shared-types"

// --- Mocking de Dependências (PTE 2.15) ---

// 1. Mock do hook de Query (Leitura)
const mockUseProfessionalsQuery = vi.fn()
vi.mock("../hooks/useProfessionalsQuery", () => ({
  useProfessionalsQuery: () => mockUseProfessionalsQuery(),
}))

// 2. Mock do hook de Mutation (Escrita)
const mockMutate = vi.fn()
const mockUseDeleteProfessionalMutation = vi.fn()
vi.mock("../hooks/useDeleteProfessionalMutation", () => ({
  // O hook (use...) retorna um objeto com a função mutate
  useDeleteProfessionalMutation: (options: any) => ({
    mutate: mockMutate,
    isPending: false,
    ...options, // Permite que o componente passe onSuccess/onError
  }),
}))

// 3. Mock do hook de UI (Toast)
vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}))

// 4. Mock do Componente Filho (Modal de Formulário) (SoC)
// O DataTable não deve ser responsável pela lógica interna do formulário.
vi.mock("./ProfessionalFormModal", () => ({
  ProfessionalFormModal: vi.fn(
    ({
      isOpen,
      onClose,
      professional,
    }: {
      isOpen: boolean
      onClose: () => void
      professional: ProfessionalType | null
    }) =>
      isOpen ? (
        <div data-testid="mock-modal">
          <span>
            {professional
              ? `Editando: ${professional.name}`
              : "Modo de Criação"}
          </span>
          <button onClick={onClose}>Fechar Modal</button>
        </div>
      ) : null,
  ),
}))

// --- Dados de Mock ---

const mockProfessionals: ProfessionalType[] = [
  {
    id: "1",
    name: "Dr. João Silva",
    color: "#0000ff",
    salary: 500000, // R$ 5.000,00
    commission_rate: 0.1, // 10%
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
    salary: 450000, // R$ 4.500,00
    commission_rate: 0.05, // 5%
    created_at: new Date().toISOString(),
    user_id: "user-2",
    work_start_time: null,
    work_end_time: null,
    lunch_start_time: null,
    lunch_end_time: null,
  },
]

// --- Setup de Teste ---

const renderComponent = () => {
  const user = userEvent.setup()
  const utils = render(<ProfessionalsDataTable />)
  return { ...utils, user }
}

// Resetar mocks antes de cada teste
beforeEach(() => {
  vi.clearAllMocks()
  // Configuração padrão da mutação (não pendente)
  mockUseDeleteProfessionalMutation.mockReturnValue({
    mutate: mockMutate,
    isPending: false,
  })
})

// --- Testes ---

describe("ProfessionalsDataTable", () => {
  test("deve exibir o estado de loading corretamente (PGEC)", () => {
    mockUseProfessionalsQuery.mockReturnValue({
      data: [],
      isLoading: true,
      isError: false,
      error: null,
    })
    renderComponent()
    expect(screen.getByText("Carregando profissionais...")).toBeInTheDocument()
    expect(screen.getByRole("status")).toBeInTheDocument() // Loader icon
  })

  test("deve exibir o estado de erro corretamente (PGEC)", () => {
    mockUseProfessionalsQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: true,
      error: { message: "Falha ao buscar dados" },
    })
    renderComponent()
    expect(
      screen.getByText("Erro ao carregar profissionais"),
    ).toBeInTheDocument()
    expect(screen.getByText("Falha ao buscar dados")).toBeInTheDocument()
  })

  test("deve exibir o estado vazio (sem dados)", () => {
    mockUseProfessionalsQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    })
    renderComponent()
    expect(
      screen.getByText("Nenhum profissional encontrado."),
    ).toBeInTheDocument()
    // Garante que o cabeçalho da tabela ainda existe
    expect(screen.getByRole("columnheader", { name: "Nome" })).toBeInTheDocument()
  })

  test("deve renderizar a tabela com os dados dos profissionais", () => {
    mockUseProfessionalsQuery.mockReturnValue({
      data: mockProfessionals,
      isLoading: false,
      isError: false,
    })
    renderComponent()

    // Verifica Profissional 1 (João Silva)
    const row1 = screen.getByRole("row", { name: /João Silva/i })
    expect(within(row1).getByText("Dr. João Silva")).toBeInTheDocument()
    expect(within(row1).getByText("#0000ff")).toBeInTheDocument()
    expect(within(row1).getByText("R$ 5.000,00")).toBeInTheDocument()
    expect(within(row1).getByText("10%")).toBeInTheDocument()

    // Verifica Profissional 2 (Maria Oliveira)
    const row2 = screen.getByRole("row", { name: /Maria Oliveira/i })
    expect(within(row2).getByText("Maria Oliveira")).toBeInTheDocument()
    expect(within(row2).getByText("#ff0000")).toBeInTheDocument()
    expect(within(row2).getByText("R$ 4.500,00")).toBeInTheDocument()
    expect(within(row2).getByText("5%")).toBeInTheDocument()
  })

  test("deve filtrar a tabela pelo nome do profissional", async () => {
    mockUseProfessionalsQuery.mockReturnValue({
      data: mockProfessionals,
      isLoading: false,
      isError: false,
    })
    const { user } = renderComponent()

    expect(screen.getByText("Dr. João Silva")).toBeInTheDocument()
    expect(screen.getByText("Maria Oliveira")).toBeInTheDocument()

    const filterInput = screen.getByPlaceholderText("Filtrar por nome...")
    await user.type(filterInput, "Maria")

    expect(screen.queryByText("Dr. João Silva")).not.toBeInTheDocument()
    expect(screen.getByText("Maria Oliveira")).toBeInTheDocument()
  })

  test("deve abrir o modal de criação ao clicar em 'Novo Profissional' (SoC)", async () => {
    mockUseProfessionalsQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    })
    const { user } = renderComponent()

    // Modal não deve estar visível
    expect(screen.queryByTestId("mock-modal")).not.toBeInTheDocument()

    const newButton = screen.getByRole("button", { name: /Novo Profissional/i })
    await user.click(newButton)

    // Modal deve estar visível e em modo de criação
    expect(screen.getByTestId("mock-modal")).toBeInTheDocument()
    expect(screen.getByText("Modo de Criação")).toBeInTheDocument()
  })

  test("deve abrir o modal de edição ao clicar em 'Editar' (SoC)", async () => {
    mockUseProfessionalsQuery.mockReturnValue({
      data: [mockProfessionals[0]], // Apenas Dr. João
      isLoading: false,
      isError: false,
    })
    const { user } = renderComponent()

    expect(screen.queryByTestId("mock-modal")).not.toBeInTheDocument()

    // 1. Encontrar a linha e abrir o menu de ações
    const row = screen.getByRole("row", { name: /João Silva/i })
    const menuButton = within(row).getByRole("button", { name: "Abrir menu" })
    await user.click(menuButton)

    // 2. Clicar em Editar
    const editButton = await screen.findByRole("menuitem", { name: "Editar" })
    await user.click(editButton)

    // 3. Verificar se o modal abriu com os dados corretos
    expect(screen.getByTestId("mock-modal")).toBeInTheDocument()
    expect(screen.getByText("Editando: Dr. João Silva")).toBeInTheDocument()
  })

  test("deve abrir o alerta de exclusão e chamar a mutação ao confirmar (PTE)", async () => {
    mockUseProfessionalsQuery.mockReturnValue({
      data: [mockProfessionals[1]], // Apenas Maria Oliveira
      isLoading: false,
      isError: false,
    })
    const { user } = renderComponent()

    // 1. Encontrar a linha e abrir o menu
    const row = screen.getByRole("row", { name: /Maria Oliveira/i })
    const menuButton = within(row).getByRole("button", { name: "Abrir menu" })
    await user.click(menuButton)

    // 2. Clicar em Excluir
    const deleteMenuItem = await screen.findByRole("menuitem", {
      name: "Excluir",
    })
    await user.click(deleteMenuItem)

    // 3. Verificar se o AlertDialog está visível
    const alertDialog = await screen.findByRole("alertdialog")
    expect(
      within(alertDialog).getByText("Você tem certeza absoluta?"),
    ).toBeInTheDocument()
    expect(
      within(alertDialog).getByText(/excluirá permanentemente o profissional/i),
    ).toBeInTheDocument()
    expect(
      within(alertDialog).getByText("Maria Oliveira"),
    ).toBeInTheDocument()

    // 4. Clicar no botão de confirmação de exclusão
    const confirmButton = within(alertDialog).getByRole("button", {
      name: "Excluir",
    })
    await user.click(confirmButton)

    // 5. Verificar se a mutação foi chamada com o ID correto (PTE)
    expect(mockMutate).toHaveBeenCalledTimes(1)
    expect(mockMutate).toHaveBeenCalledWith(mockProfessionals[1].id) // ID '2'
  })
})