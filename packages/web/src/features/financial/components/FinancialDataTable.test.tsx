import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FinancialDataTable } from './FinancialDataTable';
import { useFinancialEntriesQuery } from '../hooks/useFinancialEntriesQuery';
import { useDeleteFinancialEntryMutation } from '../hooks/useDeleteFinancialEntryMutation';
import type { FinancialEntry } from '@/packages/shared-types';

// Mocks dos Hooks
vi.mock('../hooks/useFinancialEntriesQuery');
vi.mock('../hooks/useDeleteFinancialEntryMutation');

// Mock dos componentes de UI complexos para focar na lógica da tabela
// Princípio 2.3 (KISS) e 2.5 (SoC): Isolamos a tabela de suas dependências visuais complexas para testar apenas a lógica.
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

  // ATENÇÃO: Refatorado para camelCase conforme o "Padrão Ouro".
  // Isso reflete a atualização do Passo 2 (Shared Types) e garante que o
  // componente receba os dados no formato que espera (Passo 4).
  const mockEntries: FinancialEntry[] = [
    {
      id: 1,
      userId: 1,                    // Atualizado: user_id -> userId
      description: 'Consultoria Tech',
      amount: '5000.00',
      type: 'receita',
      entryDate: '2023-10-01T00:00:00Z', // Atualizado: entry_date -> entryDate
      entryType: 'mensal',          // Atualizado: entry_type -> entryType
      category: 'Serviços',
      createdAt: '2023-10-01',      // Atualizado: created_at -> createdAt
      updatedAt: '2023-10-01'       // Atualizado: updated_at -> updatedAt
    },
    {
      id: 2,
      userId: 1,                    // Atualizado: user_id -> userId
      description: 'Hospedagem AWS',
      amount: '200.50',
      type: 'despesa',
      entryDate: '2023-10-05T00:00:00Z', // Atualizado: entry_date -> entryDate
      entryType: 'mensal',          // Atualizado: entry_type -> entryType
      category: 'Infraestrutura',
      createdAt: '2023-10-05',      // Atualizado: created_at -> createdAt
      updatedAt: '2023-10-05'       // Atualizado: updated_at -> updatedAt
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

    // Teste de integridade visual dos dados
    expect(screen.getByText('Consultoria Tech')).toBeInTheDocument();
    expect(screen.getByText('Hospedagem AWS')).toBeInTheDocument();
    expect(screen.getByText('Receita')).toBeInTheDocument();
    expect(screen.getByText('Despesa')).toBeInTheDocument();
    
    // Verificando formatação de moeda
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
  });
});