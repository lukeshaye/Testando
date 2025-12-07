// /packages/web/src/features/clients/components/ClientsDataTable.test.tsx

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClientsDataTable } from './ClientsDataTable';
import { useClientsQuery } from '../hooks/useClientsQuery';
import { useDeleteClientMutation } from '../hooks/useDeleteClientMutation';
import { ClientType } from '@/packages/shared-types';

// Mock dos hooks (Plano 4.2.2)
vi.mock('../hooks/useClientsQuery');
vi.mock('../hooks/useDeleteClientMutation');

// Mock dos componentes filhos (Modais) (Plano 4.2.2)
vi.mock('./ClientFormModal', () => ({
  ClientFormModal: vi.fn(
    ({
      isOpen,
      editingClient,
      onClose,
    }: {
      isOpen: boolean;
      editingClient: ClientType | null;
      onClose: () => void;
    }) =>
      isOpen ? (
        <div data-testid="client-form-modal">
          <h2>{editingClient ? 'Editar Cliente' : 'Novo Cliente'}</h2>
          <p>Editing ID: {editingClient?.id || 'null'}</p>
          <button onClick={onClose}>Fechar Form</button>
        </div>
      ) : null
  ),
}));

vi.mock('@/packages/web/src/components/ui/ConfirmationModal', () => ({
  ConfirmationModal: vi.fn(
    ({
      isOpen,
      onConfirm,
      onClose,
      title,
    }: {
      isOpen: boolean;
      onConfirm: () => void;
      onClose: () => void;
      title: string;
    }) =>
      isOpen ? (
        <div data-testid="confirmation-modal">
          <h2>{title}</h2>
          <button onClick={onConfirm}>Confirmar Exclusão</button>
          <button onClick={onClose}>Cancelar Exclusão</button>
        </div>
      ) : null
  ),
}));

// Mock da dependência de data
vi.mock('date-fns', async (importOriginal) => {
  const actual = await importOriginal<typeof import('date-fns')>();
  return {
    ...actual,
    differenceInYears: vi.fn((dateLeft, dateRight) => {
      if (dateRight.toISOString().startsWith('1990-01-01')) return 35;
      if (dateRight.toISOString().startsWith('1985-05-10')) return 40;
      return 25;
    }),
  };
});

// Dados de Mock
const mockClients: ClientType[] = [
  {
    id: '1',
    name: 'Ana Silva',
    email: 'ana@teste.com',
    phone: '11999991111',
    birth_date: '1990-01-01T00:00:00.000Z',
    gender: 'feminino',
    notes: '',
    organization_id: 'org1',
    created_at: '',
    updated_at: '',
  },
  {
    id: '2',
    name: 'Bruno Costa',
    email: 'bruno@teste.com',
    phone: '11999992222',
    birth_date: '1985-05-10T00:00:00.000Z',
    gender: 'masculino',
    notes: '',
    organization_id: 'org1',
    created_at: '',
    updated_at: '',
  },
];

// Mocks das funções de mutação
const mockDeleteMutate = vi.fn();

// Helper para renderizar o componente
const renderTable = (props = {}) => {
  const user = userEvent.setup();
  render(<ClientsDataTable {...props} />);
  return { user };
};

describe('ClientsDataTable', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    // Configuração padrão da mutação (Plano 4.2.2)
    (useDeleteClientMutation as vi.Mock).mockReturnValue({
      mutate: mockDeleteMutate,
      isPending: false,
    });
  });

  it('deve exibir o estado de loading (Plano 4.2.2)', () => {
    // Mock do estado de loading (Plano 4.2.2)
    (useClientsQuery as vi.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    renderTable();

    // Verifica se o spinner (Loader2) está visível
    expect(screen.getByRole('status')).toBeInTheDocument();
    // Verifica se a tabela *não* está visível
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('deve exibir o estado vazio (Plano 4.2.2)', () => {
    // Mock do estado vazio (Plano 4.2.2)
    (useClientsQuery as vi.Mock).mockReturnValue({
      data: [],
      isLoading: false,
    });

    renderTable();

    // Verifica a mensagem de estado vazio
    expect(
      screen.getByText('Nenhum cliente cadastrado')
    ).toBeInTheDocument();
    // Verifica se o botão de ação primária (Adicionar Cliente) está visível
    expect(
      screen.getByRole('button', { name: /Adicionar Cliente/ })
    ).toBeInTheDocument();
  });

  it('deve renderizar a tabela com dados mockados (Plano 4.2.2)', () => {
    // Mock de dados (Plano 4.2.2)
    (useClientsQuery as vi.Mock).mockReturnValue({
      data: mockClients,
      isLoading: false,
    });

    renderTable();

    // Verifica o header (filtro e botão)
    expect(
      screen.getByPlaceholderText(/Filtrar por nome/)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Novo Cliente/ })
    ).toBeInTheDocument();

    // Verifica os dados na tabela
    expect(screen.getByText('Ana Silva')).toBeInTheDocument();
    expect(screen.getByText('bruno@teste.com')).toBeInTheDocument();

    // Verifica o cálculo de idade mockado (Plano 3.2.3)
    expect(screen.getByText('35 anos')).toBeInTheDocument(); // Ana
    expect(screen.getByText('40 anos')).toBeInTheDocument(); // Bruno
  });

  it('deve abrir o modal de "Novo Cliente" (Plano 3.2.7)', async () => {
    (useClientsQuery as vi.Mock).mockReturnValue({
      data: mockClients,
      isLoading: false,
    });
    const { user } = renderTable();

    // Clica em "Novo Cliente"
    await user.click(screen.getByRole('button', { name: /Novo Cliente/ }));

    // Verifica se o modal (mockado) abriu em modo de criação (Plano 4.2.2)
    const modal = screen.getByTestId('client-form-modal');
    expect(modal).toBeInTheDocument();
    expect(within(modal).getByText('Novo Cliente')).toBeInTheDocument();
    expect(within(modal).getByText('Editing ID: null')).toBeInTheDocument();
  });

  it('deve abrir o modal de "Editar Cliente" com os dados corretos (Plano 4.2.2)', async () => {
    (useClientsQuery as vi.Mock).mockReturnValue({
      data: mockClients,
      isLoading: false,
    });
    const { user } = renderTable();

    // Encontra a linha da "Ana Silva" (mockClients[0])
    const row = screen.getByText('Ana Silva').closest('tr');
    const actionsButton = within(row as HTMLElement).getByRole('button', {
      name: /Abrir menu/,
    });

    // Abre o menu de ações e clica em "Editar"
    await user.click(actionsButton);
    await user.click(screen.getByRole('menuitem', { name: /Editar/ }));

    // Verifica se o modal (mockado) abriu em modo de edição (Plano 4.2.2)
    const modal = screen.getByTestId('client-form-modal');
    expect(modal).toBeInTheDocument();
    expect(within(modal).getByText('Editar Cliente')).toBeInTheDocument();
    expect(within(modal).getByText('Editing ID: 1')).toBeInTheDocument();
  });

  it('deve abrir o modal de exclusão e chamar a mutação ao confirmar (Plano 4.2.2)', async () => {
    // Simula o onSuccess da mutação (Plano 3.2.10)
    mockDeleteMutate.mockImplementation((id, options) => {
      options.onSuccess?.();
    });

    (useClientsQuery as vi.Mock).mockReturnValue({
      data: mockClients,
      isLoading: false,
    });
    const { user } = renderTable();

    // Encontra a linha do "Bruno Costa" (mockClients[1])
    const row = screen.getByText('Bruno Costa').closest('tr');
    const actionsButton = within(row as HTMLElement).getByRole('button', {
      name: /Abrir menu/,
    });

    // Abre o menu de ações e clica em "Excluir"
    await user.click(actionsButton);
    await user.click(screen.getByRole('menuitem', { name: /Excluir/ }));

    // Verifica se o modal de confirmação (mockado) abriu (Plano 4.2.2)
    const modal = screen.getByTestId('confirmation-modal');
    expect(modal).toBeInTheDocument();
    expect(
      within(modal).getByText('Excluir Cliente')
    ).toBeInTheDocument();

    // Clica em "Confirmar Exclusão"
    await user.click(within(modal).getByText('Confirmar Exclusão'));

    // Verifica se a mutação (mockada) foi chamada com o ID correto (Plano 4.2.2)
    await waitFor(() => {
      expect(mockDeleteMutate).toHaveBeenCalledTimes(1);
      expect(mockDeleteMutate).toHaveBeenCalledWith(
        '2', // ID do Bruno Costa
        expect.any(Object) // Opções (onSuccess)
      );
    });

    // Verifica se o modal fechou após o onSuccess
    expect(screen.queryByTestId('confirmation-modal')).not.toBeInTheDocument();
  });

  it('deve filtrar a tabela com base no input global (Plano 3.2.4)', async () => {
    (useClientsQuery as vi.Mock).mockReturnValue({
      data: mockClients,
      isLoading: false,
    });
    const { user } = renderTable();

    // Verifica se ambos estão visíveis
    expect(screen.getByText('Ana Silva')).toBeInTheDocument();
    expect(screen.getByText('Bruno Costa')).toBeInTheDocument();

    // Filtra por "Bruno"
    const filterInput = screen.getByPlaceholderText(/Filtrar por nome/);
    await user.type(filterInput, 'Bruno');

    // Verifica se "Ana" sumiu e "Bruno" permaneceu
    expect(screen.queryByText('Ana Silva')).not.toBeInTheDocument();
    expect(screen.getByText('Bruno Costa')).toBeInTheDocument();

    // Limpa o filtro
    await user.clear(filterInput);

    // Verifica se "Ana" voltou
    expect(screen.getByText('Ana Silva')).toBeInTheDocument();
  });
});