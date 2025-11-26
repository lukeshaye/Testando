// /packages/web/src/features/clients/components/ClientFormModal.test.tsx

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClientFormModal } from './ClientFormModal';
import { useAddClientMutation } from '../hooks/useAddClientMutation';
import { useUpdateClientMutation } from '../hooks/useUpdateClientMutation';
import { ClientType } from '@/packages/shared-types';

// Mock dos hooks de mutação (Plano 4.2.1)
vi.mock('../hooks/useAddClientMutation');
vi.mock('../hooks/useUpdateClientMutation');

// Mock das dependências de UI (Popover/Calendar)
vi.mock('@/packages/web/src/components/ui/popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => children,
  PopoverContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="popover-content">{children}</div>
  ),
}));

vi.mock('@/packages/web/src/components/ui/calendar', () => ({
  Calendar: ({
    selected,
    onSelect,
  }: {
    selected: Date;
    onSelect: (date: Date) => void;
  }) => (
    <div
      data-testid="calendar"
      onClick={() => onSelect(new Date('2023-10-10T00:00:00.000Z'))}
    >
      Mock Calendar (Selected: {selected ? selected.toISOString() : 'None'})
    </div>
  ),
}));

// Mock da localidade para consistência nos testes
vi.mock('date-fns/locale', () => ({
  ptBR: {},
}));

// Mocks das funções de mutação
const mockAddMutate = vi.fn();
const mockUpdateMutate = vi.fn();
const mockOnClose = vi.fn();
const mockOnClientCreated = vi.fn();

// Dados de mock
const mockEditingClient: ClientType = {
  id: 'client-1',
  name: 'Cliente Antigo',
  email: 'antigo@email.com',
  phone: '11988887777',
  birth_date: '1990-05-15T00:00:00.000Z',
  gender: 'masculino',
  notes: 'Notas antigas',
  organization_id: 'org-1',
  created_at: '',
  updated_at: '',
};

const defaultProps = {
  isOpen: true,
  onClose: mockOnClose,
  onClientCreated: mockOnClientCreated,
  editingClient: null,
};

// Helper para renderizar o componente
const renderModal = (props = {}) => {
  const user = userEvent.setup();
  render(<ClientFormModal {...defaultProps} {...props} />);
  return { user };
};

describe('ClientFormModal', () => {
  beforeEach(() => {
    // Limpa os mocks antes de cada teste
    vi.resetAllMocks();

    // Configuração padrão dos mocks (Plano 4.2.1)
    (useAddClientMutation as vi.Mock).mockReturnValue({
      mutate: mockAddMutate,
      isPending: false,
    });
    (useUpdateClientMutation as vi.Mock).mockReturnValue({
      mutate: mockUpdateMutate,
      isPending: false,
    });
  });

  it('deve renderizar o modal em modo de criação e submeter um novo cliente (Plano 4.2.1)', async () => {
    // Simula o onSuccess da mutação (Plano 3.1.5, 3.1.7)
    mockAddMutate.mockImplementation((data, options) => {
      const newClient = { id: 'new-client-id', ...data };
      options.onSuccess?.(newClient);
    });

    const { user } = renderModal();

    // 1. Verifica o título
    expect(screen.getByText('Novo Cliente')).toBeInTheDocument();

    // 2. Preenche o formulário
    await user.type(screen.getByLabelText(/Nome/), 'Novo Cliente Teste');
    await user.type(screen.getByLabelText(/Telefone/), '11999998888');
    await user.type(screen.getByLabelText(/Email/), 'novo@email.com');
    await user.type(screen.getByLabelText(/Notas/), 'Alguma observação');

    // 3. Submete o formulário
    await user.click(screen.getByRole('button', { name: /Salvar Cliente/ }));

    // 4. Verifica se a mutação de *adicionar* foi chamada (Plano 4.2.1)
    await waitFor(() => {
      expect(mockAddMutate).toHaveBeenCalledTimes(1);
      expect(mockAddMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Novo Cliente Teste',
          phone: '11999998888',
          email: 'novo@email.com',
          notes: 'Alguma observação',
        }),
        expect.any(Object) // Opções do onSuccess/onError
      );
    });

    // 5. Verifica se os callbacks de sucesso foram chamados
    expect(mockOnClientCreated).toHaveBeenCalledTimes(1);
    expect(mockOnClientCreated).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'new-client-id' })
    );
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('deve renderizar o modal em modo de edição, popular o formulário e submeter uma atualização (Plano 4.2.1)', async () => {
    // Simula o onSuccess da mutação
    mockUpdateMutate.mockImplementation((data, options) => {
      options.onSuccess?.();
    });

    const { user } = renderModal({ editingClient: mockEditingClient });

    // 1. Verifica o título
    expect(screen.getByText('Editar Cliente')).toBeInTheDocument();

    // 2. Verifica se o formulário foi populado (Plano 3.1.8)
    expect(screen.getByLabelText(/Nome/)).toHaveValue('Cliente Antigo');
    expect(screen.getByLabelText(/Telefone/)).toHaveValue('11988887777');
    expect(screen.getByLabelText(/Email/)).toHaveValue('antigo@email.com');
    expect(screen.getByLabelText(/Notas/)).toHaveValue('Notas antigas');
    expect(screen.getByText('15/05/1990')).toBeInTheDocument();

    // 3. Altera um campo
    await user.clear(screen.getByLabelText(/Nome/));
    await user.type(screen.getByLabelText(/Nome/), 'Cliente Atualizado');

    // 4. Submete o formulário
    await user.click(screen.getByRole('button', { name: /Salvar Cliente/ }));

    // 5. Verifica se a mutação de *atualizar* foi chamada (Plano 4.2.1)
    await waitFor(() => {
      expect(mockUpdateMutate).toHaveBeenCalledTimes(1);
      expect(mockUpdateMutate).toHaveBeenCalledWith(
        {
          id: 'client-1',
          data: expect.objectContaining({
            name: 'Cliente Atualizado',
            phone: '11988887777', // Mantido
          }),
        },
        expect.any(Object)
      );
    });

    // 6. Verifica se o modal foi fechado
    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockOnClientCreated).not.toHaveBeenCalled();
  });

  it('deve exibir erros de validação do Zod se o nome (obrigatório) não for preenchido (Plano 4.2.1)', async () => {
    const { user } = renderModal();

    // 1. Tenta submeter o formulário vazio
    await user.click(screen.getByRole('button', { name: /Salvar Cliente/ }));

    // 2. Verifica se a mensagem de erro do Zod (para o campo 'name') aparece
    // (A mensagem exata depende da implementação do CreateClientSchema)
    await waitFor(() => {
      // Procurando por uma mensagem de erro genérica associada ao campo 'name'
      const nameField = screen.getByLabelText(/Nome/).closest('div.relative');
      const formItem = nameField?.closest('div.space-y-2');
      expect(
        within(formItem as HTMLElement).getByText(/obrigatório/i)
      ).toBeInTheDocument();
    });

    // 3. Verifica se nenhuma mutação foi disparada
    expect(mockAddMutate).not.toHaveBeenCalled();
    expect(mockUpdateMutate).not.toHaveBeenCalled();
  });

  it('deve desabilitar os botões e mostrar o loader durante a mutação (Plano 3.1.6)', () => {
    // Seta o estado de pending para true
    (useAddClientMutation as vi.Mock).mockReturnValue({
      mutate: mockAddMutate,
      isPending: true,
    });

    renderModal();

    const saveButton = screen.getByRole('button', { name: /Salvar Cliente/ });
    const cancelButton = screen.getByRole('button', { name: /Cancelar/ });

    // 1. Verifica se os botões estão desabilitados
    expect(saveButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();

    // 2. Verifica se o ícone de loader (Loader2) está visível
    // (O Loader2 tem 'animate-spin' que lhe dá role 'status')
    expect(within(saveButton).getByRole('status')).toBeInTheDocument();
  });
});