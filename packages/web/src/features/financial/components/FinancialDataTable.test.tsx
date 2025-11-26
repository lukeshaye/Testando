import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FinancialDataTable } from './FinancialDataTable';
import { useFinancialEntriesQuery } from '../hooks/useFinancialEntriesQuery';
import { useDeleteFinancialEntryMutation } from '../hooks/useDeleteFinancialEntryMutation';
import type { FinancialEntry } from '@/packages/shared-types';

// Mocks dos Hooks
vi.mock('../hooks/useFinancialEntriesQuery');
vi.mock('../hooks/useDeleteFinancialEntryMutation');

// Mock dos componentes de UI complexos para focar na lógica da tabela
// (Opcional, mas ajuda a evitar ruído de bibliotecas externas nos testes unitários)
vi.mock('@/components/ConfirmationModal', () => ({
  ConfirmationModal: ({ isOpen, title, onConfirm }: any) => (
    isOpen ? (
      <div data-testid="confirmation-modal">
        {title}
        <button onClick={onConfirm}>Confirmar</button>
      </div>
    ) : null
  ),
}));

vi.mock('./FinancialFormModal', () => ({
  FinancialFormModal: ({ open }: any) => (
    open ? <div data-testid="financial-form-modal">Modal de Formulário</div> : null
  ),
}));

describe('FinancialDataTable', () => {
  const mockDelete = vi.fn();

  const mockEntries: FinancialEntry[] = [
    {
      id: 1,
      user_id: 1,
      description: 'Consultoria Tech',
      amount: '5000.00',
      type: 'receita',
      entry_date: '2023-10-01T00:00:00Z',
      entry_type: 'mensal',
      category: 'Serviços',
      created_at: '2023-10-01',
      updated_at: '2023-10-01'
    },
    {
      id: 2,
      user_id: 1,
      description: 'Hospedagem AWS',
      amount: '200.50',
      type: 'despesa',
      entry_date: '2023-10-05T00:00:00Z',
      entry_type: 'mensal',
      category: 'Infraestrutura',
      created_at: '2023-10-05',
      updated_at: '2023-10-05'
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup padrão do hook de delete
    (useDeleteFinancialEntryMutation as any).mockReturnValue({
      mutate: mockDelete,
      isPending: false,
    });
  });

  it('deve exibir skeletons durante o estado de loading', () => {
    (useFinancialEntriesQuery as any).mockReturnValue({
      data: [],
      isLoading: true,
      isError: false,
    });

    const { container } = render(<FinancialDataTable />);
    
    // Verifica a presença de elementos com a classe skeleton (ou estrutura simulada)
    // Como estamos usando shadcn/ui skeleton, geralmente eles renderizam divs com classes de animação
    // Aqui verificamos se o componente não quebrou e se renderizou a estrutura básica de loading
    expect(container.getElementsByClassName('animate-pulse').length).toBeGreaterThan(0);
  });

  it('deve exibir mensagem de erro quando a query falhar', () => {
    (useFinancialEntriesQuery as any).mockReturnValue({
      data: [],
      isLoading: false,
      isError: true,
    });

    render(<FinancialDataTable />);
    
    expect(screen.getByText('Erro ao carregar lançamentos financeiros.')).toBeInTheDocument();
  });

  it('deve exibir mensagem de "Nenhum lançamento encontrado" quando a lista estiver vazia', () => {
    (useFinancialEntriesQuery as any).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });

    render(<FinancialDataTable />);
    
    expect(screen.getByText('Nenhum lançamento encontrado.')).toBeInTheDocument();
  });

  it('deve renderizar os dados corretamente na tabela', () => {
    (useFinancialEntriesQuery as any).mockReturnValue({
      data: mockEntries,
      isLoading: false,
      isError: false,
    });

    render(<FinancialDataTable />);

    expect(screen.getByText('Consultoria Tech')).toBeInTheDocument();
    expect(screen.getByText('Hospedagem AWS')).toBeInTheDocument();
    expect(screen.getByText('Receita')).toBeInTheDocument();
    expect(screen.getByText('Despesa')).toBeInTheDocument();
    
    // Verificando formatação de moeda (aproximada, dependendo do locale do ambiente de teste)
    // O ideal é verificar se contém parte do valor
    expect(screen.getByText((content) => content.includes('5.000,00') || content.includes('5000,00'))).toBeInTheDocument();
  });

  it('deve abrir o modal de formulário ao clicar em "Novo Lançamento"', () => {
    (useFinancialEntriesQuery as any).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });

    render(<FinancialDataTable />);

    const newButton = screen.getByRole('button', { name: /novo lançamento/i });
    fireEvent.click(newButton);

    expect(screen.getByTestId('financial-form-modal')).toBeInTheDocument();
  });

  it('deve abrir o modal de confirmação ao tentar excluir um item', async () => {
    (useFinancialEntriesQuery as any).mockReturnValue({
      data: mockEntries,
      isLoading: false,
      isError: false,
    });

    render(<FinancialDataTable />);

    // Abrir o dropdown do primeiro item
    const dropdownTriggers = screen.getAllByRole('button', { name: /abrir menu/i });
    fireEvent.click(dropdownTriggers[0]);

    // Clicar em excluir no menu
    const deleteButton = screen.getByText('Excluir');
    fireEvent.click(deleteButton);

    // Verificar se o modal de confirmação abriu
    expect(screen.getByTestId('confirmation-modal')).toBeInTheDocument();
    expect(screen.getByText('Excluir Lançamento')).toBeInTheDocument();
  });

  it('deve chamar a mutação de delete ao confirmar a exclusão', async () => {
    (useFinancialEntriesQuery as any).mockReturnValue({
      data: mockEntries,
      isLoading: false,
      isError: false,
    });

    // Mock implementation para simular sucesso do delete e chamar o onSuccess se necessário
    mockDelete.mockImplementation((id, { onSuccess }) => {
        onSuccess();
    });

    render(<FinancialDataTable />);

    // Fluxo de exclusão
    const dropdownTriggers = screen.getAllByRole('button', { name: /abrir menu/i });
    fireEvent.click(dropdownTriggers[0]);

    const deleteOption = screen.getByText('Excluir');
    fireEvent.click(deleteOption);

    const confirmButton = screen.getByText('Confirmar');
    fireEvent.click(confirmButton);

    expect(mockDelete).toHaveBeenCalledWith(1, expect.any(Object));
  });

  it('deve abrir o modal de edição ao clicar em editar', async () => {
    (useFinancialEntriesQuery as any).mockReturnValue({
      data: mockEntries,
      isLoading: false,
      isError: false,
    });

    render(<FinancialDataTable />);

    // Abrir o dropdown
    const dropdownTriggers = screen.getAllByRole('button', { name: /abrir menu/i });
    fireEvent.click(dropdownTriggers[0]);

    // Clicar em Editar
    const editButton = screen.getByText('Editar');
    fireEvent.click(editButton);

    expect(screen.getByTestId('financial-form-modal')).toBeInTheDocument();
    // Nota: Testar se o formulário foi preenchido corretamente seria responsabilidade do teste do FinancialFormModal
    // ou de um teste de integração mais amplo. Aqui garantimos que o estado de "aberto" foi acionado.
  });
});