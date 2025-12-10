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
      // Nota: A lógica interna do mock não muda, pois recebe strings/datas
      if (dateRight.toISOString().startsWith('1990-01-01')) return 35;
      if (dateRight.toISOString().startsWith('1985-05-10')) return 40;
      return 25;
    }),
  };
});

// Dados de Mock (ATUALIZADO PARA CAMELCASE - Passo 4)
[cite_start]// [cite: 16] DRY: A estrutura de dados aqui deve espelhar a "fonte da verdade" definida nos schemas do Passo 2.
const mockClients: ClientType[] = [
  {
    id: '1',
    name: 'Ana Silva',
    email: 'ana@teste.com',
    phone: '11999991111',
    birthDate: '1990-01-01T00:00:00.000Z', // Refatorado: birth_date -> birthDate
    gender: 'feminino',
    notes: '',
    organizationId: 'org1', // Refatorado: organization_id -> organizationId
    createdAt: '', // Refatorado: created_at -> createdAt
    updatedAt: '', // Refatorado: updated_at -> updatedAt
  },
  {
    id: '2',
    name: 'Bruno Costa',
    email: 'bruno@teste.com',
    phone: '11999992222',
    birthDate: '1985-05-10T00:00:00.000Z', // Refatorado: birth_date -> birthDate
    gender: 'masculino',
    notes: '',
    organizationId: 'org1', // Refatorado: organization_id -> organizationId
    createdAt: '', // Refatorado: created_at -> createdAt
    updatedAt: '', // Refatorado: updated_at -> updatedAt
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
    (useClientsQuery as vi.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    renderTable();

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('deve exibir o estado vazio (Plano 4.2.2)', () => {
    (useClientsQuery as vi.Mock).mockReturnValue({
      data: [],
      isLoading: false,
    });

    renderTable();

    expect(
      screen.getByText('Nenhum cliente cadastrado')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Adicionar Cliente/ })
    ).toBeInTheDocument();
  });

  it('deve renderizar a tabela com dados mockados (Plano 4.2.2)', () => {
    (useClientsQuery as vi.Mock).mockReturnValue({
      data: mockClients,
      isLoading: false,
    });

    renderTable();

    expect(
      screen.getByPlaceholderText(/Filtrar por nome/)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Novo Cliente/ })
    ).toBeInTheDocument();

    expect(screen.getByText('Ana Silva')).toBeInTheDocument();
    expect(screen.getByText('bruno@teste.com')).toBeInTheDocument();

    expect(screen.getByText('35 anos')).toBeInTheDocument();
    expect(screen.getByText('40 anos')).toBeInTheDocument();
  });

  it('deve abrir o modal de "Novo Cliente" (Plano 3.2.7)', async () => {
    (useClientsQuery as vi.Mock).mockReturnValue({
      data: mockClients,
      isLoading: false,
    });
    const { user } = renderTable();

    await user.click(screen.getByRole('button', { name: /Novo Cliente/ }));

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

    const row = screen.getByText('Ana Silva').closest('tr');
    const actionsButton = within(row as HTMLElement).getByRole('button', {
      name: /Abrir menu/,
    });

    await user.click(actionsButton);
    await user.click(screen.getByRole('menuitem', { name: /Editar/ }));

    const modal = screen.getByTestId('client-form-modal');
    expect(modal).toBeInTheDocument();
    expect(within(modal).getByText('Editar Cliente')).toBeInTheDocument();
    expect(within(modal).getByText('Editing ID: 1')).toBeInTheDocument();
  });

  it('deve abrir o modal de exclusão e chamar a mutação ao confirmar (Plano 4.2.2)', async () => {
    mockDeleteMutate.mockImplementation((id, options) => {
      options.onSuccess?.();
    });

    (useClientsQuery as vi.Mock).mockReturnValue({
      data: mockClients,
      isLoading: false,
    });
    const { user } = renderTable();

    const row = screen.getByText('Bruno Costa').closest('tr');
    const actionsButton = within(row as HTMLElement).getByRole('button', {
      name: /Abrir menu/,
    });

    await user.click(actionsButton);
    await user.click(screen.getByRole('menuitem', { name: /Excluir/ }));

    const modal = screen.getByTestId('confirmation-modal');
    expect(modal).toBeInTheDocument();
    expect(
      within(modal).getByText('Excluir Cliente')
    ).toBeInTheDocument();

    await user.click(within(modal).getByText('Confirmar Exclusão'));

    await waitFor(() => {
      expect(mockDeleteMutate).toHaveBeenCalledTimes(1);
      expect(mockDeleteMutate).toHaveBeenCalledWith(
        '2',
        expect.any(Object)
      );
    });

    expect(screen.queryByTestId('confirmation-modal')).not.toBeInTheDocument();
  });

  it('deve filtrar a tabela com base no input global (Plano 3.2.4)', async () => {
    (useClientsQuery as vi.Mock).mockReturnValue({
      data: mockClients,
      isLoading: false,
    });
    const { user } = renderTable();

    expect(screen.getByText('Ana Silva')).toBeInTheDocument();
    expect(screen.getByText('Bruno Costa')).toBeInTheDocument();

    const filterInput = screen.getByPlaceholderText(/Filtrar por nome/);
    await user.type(filterInput, 'Bruno');

    expect(screen.queryByText('Ana Silva')).not.toBeInTheDocument();
    expect(screen.getByText('Bruno Costa')).toBeInTheDocument();

    await user.clear(filterInput);

    expect(screen.getByText('Ana Silva')).toBeInTheDocument();
  });
});