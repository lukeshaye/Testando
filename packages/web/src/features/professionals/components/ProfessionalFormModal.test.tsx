/*
 * Arquivo de Destino: /packages/web/src/features/professionals/components/ProfessionalFormModal.test.tsx
 *
 * Tarefa: 4. Testes (PTE 2.15) - Refatorado para Padrão Ouro (camelCase)
 *
 * Princípios:
 * - PTE (2.15): Mocka os hooks de mutação.
 * - DSpP (2.16): Testa a validação do formulário (Zod).
 * - Padrão Ouro: Propriedades em camelCase (ex: workStartTime) alinhadas ao Schema.
 */

import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { vi } from "vitest"
import { ProfessionalFormModal } from "./ProfessionalFormModal"
import { ProfessionalType } from "@/packages/shared-types"

// --- Mocking de Dependências (PTE 2.15) ---

// 1. Mock do hook de Adicionar
const mockAddMutate = vi.fn()
vi.mock("../hooks/useAddProfessionalMutation", () => ({
  useAddProfessionalMutation: ({ onSuccess }: { onSuccess: () => void }) => ({
    mutate: (data: any) => {
      mockAddMutate(data)
      onSuccess() // Simula o sucesso para fechar o modal
    },
    isPending: false,
  }),
}))

// 2. Mock do hook de Atualizar
const mockUpdateMutate = vi.fn()
vi.mock("../hooks/useUpdateProfessionalMutation", () => ({
  useUpdateProfessionalMutation: ({ onSuccess }: { onSuccess: () => void }) => ({
    mutate: (data: any) => {
      mockUpdateMutate(data)
      onSuccess() // Simula o sucesso para fechar o modal
    },
    isPending: false,
  }),
}))

// 3. Mock do hook de UI (Toast)
vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}))

// --- Dados de Mock (Atualizado para camelCase) ---

const mockProfessional: ProfessionalType = {
  id: "prof-1",
  userId: "user-abc", // snake_case -> camelCase
  name: "João Silva (Existente)",
  color: "#ff0000",
  salary: 500000, // 5.000,00 BRL (em centavos)
  commissionRate: 0.1, // snake_case -> camelCase
  createdAt: new Date().toISOString(), // snake_case -> camelCase
  workStartTime: "08:00", // snake_case -> camelCase
  workEndTime: "18:00", // snake_case -> camelCase
  lunchStartTime: "12:00", // snake_case -> camelCase
  lunchEndTime: "13:00", // snake_case -> camelCase
}

// --- Setup de Teste ---

const renderComponent = (
  props: Partial<React.ComponentProps<typeof ProfessionalFormModal>>,
) => {
  const user = userEvent.setup()
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    professional: null, // Modo "create" por padrão
  }
  const utils = render(<ProfessionalFormModal {...defaultProps} {...props} />)
  return { ...utils, user, onCloseMock: defaultProps.onClose }
}

// Resetar mocks antes de cada teste
beforeEach(() => {
  vi.clearAllMocks()
})

// --- Testes ---

describe("ProfessionalFormModal", () => {
  describe("Modo Criação (professional = null)", () => {
    test("deve renderizar o título 'Novo Profissional' e campos padrão", () => {
      renderComponent({ professional: null })
      expect(
        screen.getByRole("heading", { name: "Novo Profissional" }),
      ).toBeInTheDocument()
      expect(screen.getByLabelText(/Nome/i)).toHaveValue("")
      // Verifica o valor padrão do seletor de cor
      expect(screen.getByLabelText(/Cor de Identificação/i)).toHaveValue(
        "#a855f7",
      )
    })

    test("deve exibir erros de validação (DSpP) ao tentar submeter vazio", async () => {
      const { user } = renderComponent({ professional: null })

      const submitButton = screen.getByRole("button", {
        name: "Adicionar Profissional",
      })
      await user.click(submitButton)

      // Espera a validação do Zod
      expect(await screen.findByText("Nome é obrigatório")).toBeInTheDocument()
      expect(mockAddMutate).not.toHaveBeenCalled()
    })

    test("deve submeter com sucesso (create) e transformar os dados para API (SoC/PTE)", async () => {
      const { user, onCloseMock } = renderComponent({ professional: null })

      // Preenche o formulário
      await user.type(screen.getByLabelText(/Nome/i), "Nova Contratação")
      await user.type(screen.getByLabelText(/Salário Base/i), "3500.75")
      await user.type(screen.getByLabelText(/Comissão/i), "20")
      await user.type(screen.getByLabelText(/Início \(Trabalho\)/i), "09:00")
      await user.type(screen.getByLabelText(/Fim \(Trabalho\)/i), "18:00")

      // Submete
      const submitButton = screen.getByRole("button", {
        name: "Adicionar Profissional",
      })
      await user.click(submitButton)

      // Verifica se a mutação foi chamada (PTE)
      await waitFor(() => {
        expect(mockAddMutate).toHaveBeenCalledTimes(1)
      })

      // Verifica a *transformação* de dados (Teste Crítico)
      // ATUALIZADO: Espera chaves em camelCase
      expect(mockAddMutate).toHaveBeenCalledWith({
        name: "Nova Contratação",
        color: "#a855f7", // Valor padrão
        salary: 350075, // 3500.75 -> 350075 (centavos)
        commissionRate: 0.2, // 20 -> 0.2 (decimal) | snake_case -> camelCase
        workStartTime: "09:00", // snake_case -> camelCase
        workEndTime: "18:00", // snake_case -> camelCase
        lunchStartTime: null, // snake_case -> camelCase
        lunchEndTime: null, // snake_case -> camelCase
      })

      // Verifica se o modal fechou no sucesso
      expect(onCloseMock).toHaveBeenCalledTimes(1)
    })
  })

  describe("Modo Edição (professional = mock)", () => {
    test("deve renderizar 'Editar Profissional' e preencher o formulário (Transformação API -> UI)", () => {
      renderComponent({ professional: mockProfessional })

      expect(
        screen.getByRole("heading", { name: "Editar Profissional" }),
      ).toBeInTheDocument()

      // Verifica a *transformação* inversa (Teste Crítico)
      expect(screen.getByLabelText(/Nome/i)).toHaveValue(
        "João Silva (Existente)",
      )
      expect(screen.getByLabelText(/Cor de Identificação/i)).toHaveValue(
        "#ff0000",
      )
      // 500000 (centavos) -> 5000 (R$)
      expect(screen.getByLabelText(/Salário Base/i)).toHaveValue(5000)
      // 0.1 (decimal) -> 10 (%)
      expect(screen.getByLabelText(/Comissão/i)).toHaveValue(10)
      // Campos de horário
      expect(screen.getByLabelText(/Início \(Trabalho\)/i)).toHaveValue("08:00")
      expect(screen.getByLabelText(/Fim \(Almoço\)/i)).toHaveValue("13:00")
    })

    test("deve submeter com sucesso (update) e transformar os dados para API (SoC/PTE)", async () => {
      const { user, onCloseMock } = renderComponent({
        professional: mockProfessional,
      })

      // Altera alguns campos
      const nameInput = screen.getByLabelText(/Nome/i)
      await user.clear(nameInput)
      await user.type(nameInput, "João Silva (Atualizado)")

      const salaryInput = screen.getByLabelText(/Salário Base/i)
      await user.clear(salaryInput)
      await user.type(salaryInput, "5100") // Novo salário R$ 5100

      // Submete
      const submitButton = screen.getByRole("button", {
        name: "Salvar Alterações",
      })
      await user.click(submitButton)

      // Verifica se a mutação foi chamada (PTE)
      await waitFor(() => {
        expect(mockUpdateMutate).toHaveBeenCalledTimes(1)
      })

      // Verifica a *transformação* de dados (Teste Crítico)
      // ATUALIZADO: Espera chaves em camelCase
      expect(mockUpdateMutate).toHaveBeenCalledWith({
        // Dados do formulário
        name: "João Silva (Atualizado)",
        salary: 510000, // 5100 -> 510000 (centavos)
        // Dados originais mantidos
        id: "prof-1",
        userId: "user-abc", // snake_case -> camelCase
        color: "#ff0000", // Não foi alterado
        commissionRate: 0.1, // Não foi alterado (10%) | snake_case -> camelCase
        workStartTime: "08:00", // snake_case -> camelCase
        workEndTime: "18:00", // snake_case -> camelCase
        lunchStartTime: "12:00", // snake_case -> camelCase
        lunchEndTime: "13:00", // snake_case -> camelCase
      })

      expect(onCloseMock).toHaveBeenCalledTimes(1)
    })
  })

  describe("Validações Específicas (DSpP / Correções)", () => {
    test("deve exibir erro para formato de cor inválido (Bug 4)", async () => {
      const { user } = renderComponent({ professional: null })

      await user.type(screen.getByLabelText(/Nome/i), "Teste Cor")
      // O input de cor é duplo (nativo e texto). Vamos testar o de texto.
      const colorTextInput = screen.getByPlaceholderText("#a855f7")
      await user.clear(colorTextInput)
      await user.type(colorTextInput, "cor-invalida") // Formato inválido

      const submitButton = screen.getByRole("button", {
        name: "Adicionar Profissional",
      })
      await user.click(submitButton)

      expect(
        await screen.findByText(/Formato de cor inválido/i),
      ).toBeInTheDocument()
      expect(mockAddMutate).not.toHaveBeenCalled()
    })

    test("deve exibir erro para comissão > 100% (DSpP)", async () => {
      const { user } = renderComponent({ professional: null })

      await user.type(screen.getByLabelText(/Nome/i), "Teste Comissão")
      await user.type(screen.getByLabelText(/Comissão/i), "101") // > 100%

      const submitButton = screen.getByRole("button", {
        name: "Adicionar Profissional",
      })
      await user.click(submitButton)

      expect(
        await screen.findByText(/Comissão não pode ser maior que 100%/i),
      ).toBeInTheDocument()
      expect(mockAddMutate).not.toHaveBeenCalled()
    })
  })
})