import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ServicesDataTable } from './ServicesDataTable';
import * as useServicesQueryHook from '../hooks/useServicesQuery';
import * as useDeleteServiceMutationHook from '../hooks/useDeleteServiceMutation';
import * as utils from '@/packages/web/src/lib/utils';

// Mock dos componentes filhos para simplificar o teste e focar na tabela
vi.mock('./ServiceFormModal', () => ({
  ServiceFormModal: ({ isOpen, editingService, onClose }: any) => (
    isOpen ? (
      <div role="dialog" data-testid="service-form-modal">
        {editingService ? `Editando: ${editingService.name}` : 'Novo Serviço Modal'}
        <button onClick={onClose}>Fechar</button>
      </div>
    ) : null
  ),
}));

// Mock do utils para evitar problemas de locale/Intl nos testes
vi.spyOn(utils, 'formatCurrency').mockImplementation((val) => `R$ ${(val / 100).toFixed(2).replace('.', ',')}`);

// Mocks dos Hooks
const mockUseServicesQuery = vi.spyOn(useServicesQueryHook, 'useServicesQuery');
const mockUseDeleteServiceMutation = vi.spyOn(useDeleteServiceMutationHook, 'useDeleteServiceMutation');

const mockDeleteMutate = vi.fn();

describe('ServicesDataTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup padrão do hook de mutação
    mockUseDeleteServiceMutation.mockReturnValue({
      mutate: mockDeleteMutate,
      isPending: false,
      mutateAsync: vi.fn(),
      variables: undefined,
      reset: vi.fn(),
      context: undefined,
      failureCount: 0,
      failureReason: null,
      isError: false,
      isIdle: true,
      isPaused: false,
      isSuccess: false,
      status: 'idle',
      error: null,
      data: undefined,
      submittedAt: 0
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('deve renderizar o estado de loading (Skeleton)', () => {
    mockUseServicesQuery.mockReturnValue({
      data: [],
      isLoading: true,
      isError: false,
    } as any);

    const { container } = render(<ServicesDataTable />);
    
    // Verifica se não renderiza o botão de novo serviço (que só aparece quando carregado)
    expect(screen.queryByText('Novo Serviço')).not.toBeInTheDocument();
    expect(container.querySelector('.space-y-4.p-8')).toBeInTheDocument();
  });

  it('deve renderizar o estado de erro', () => {
    mockUseServicesQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: true,
    } as any);

    render(<ServicesDataTable />);

    expect(screen.getByText('Erro ao carregar serviços.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeInTheDocument();
  });

  it('deve renderizar o estado vazio quando não houver dados', () => {
    mockUseServicesQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as any);

    render(<ServicesDataTable />);

    expect(screen.getByText('Nenhum serviço encontrado')).toBeInTheDocument();
    expect(screen.getByText('Comece adicionando serviços ao seu catálogo ou ajuste os filtros.')).toBeInTheDocument();
    expect(screen.getAllByText('Adicionar Serviço')[0]).toBeInTheDocument(); 
  });

  it('deve renderizar a lista de serviços corretamente', () => {
    // ATUALIZAÇÃO PADRÃO OURO: Propriedades em camelCase para alinhar com o contrato da API
    const mockData = [
      {
        id: 1,
        userId: 'user-1', // user_id -> userId
        name: 'Corte Masculino',
        description: 'Corte com tesoura',
        price: 5000, 
        duration: 30,
        color: '#000000',
        imageUrl: null, // image_url -> imageUrl
        createdAt: '2023-01-01', // created_at -> createdAt
        updatedAt: '2023-01-01', // updated_at -> updatedAt
      },
      {
        id: 2,
        userId: 'user-1', // user_id -> userId
        name: 'Barba',
        description: null,
        price: 3500, 
        duration: 20,
        color: '#FF0000',
        imageUrl: 'http://example.com/img.jpg', // image_url -> imageUrl
        createdAt: '2023-01-01', // created_at -> createdAt
        updatedAt: '2023-01-01', // updated_at -> updatedAt
      },
    ];

    mockUseServicesQuery.mockReturnValue({
      data: mockData,
      isLoading: false,
      isError: false,
    } as any);

    render(<ServicesDataTable />);

    // Verifica cabeçalhos
    expect(screen.getByText('Nome')).toBeInTheDocument();
    expect(screen.getByText('Preço')).toBeInTheDocument();
    expect(screen.getByText('Duração')).toBeInTheDocument();

    // Verifica dados da linha 1
    expect(screen.getByText('Corte Masculino')).toBeInTheDocument();
    expect(screen.getByText('Corte com tesoura')).toBeInTheDocument();
    expect(screen.getByText('R$ 50,00')).toBeInTheDocument();
    expect(screen.getByText('30 min')).toBeInTheDocument();
    expect(screen.getByText('#000000')).toBeInTheDocument();

    // Verifica dados da linha 2
    expect(screen.getByText('Barba')).toBeInTheDocument();
    expect(screen.getByText('R$ 35,00')).toBeInTheDocument();
    expect(screen.getByText('20 min')).toBeInTheDocument();
    expect(screen.getByAltText('Barba')).toBeInTheDocument();
  });

  it('deve abrir o modal de criação ao clicar em "Novo Serviço"', async () => {
    mockUseServicesQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as any);

    render(<ServicesDataTable />);

    const newServiceBtn = screen.getByRole('button', { name: /novo serviço/i });
    fireEvent.click(newServiceBtn);

    await waitFor(() => {
      expect(screen.getByTestId('service-form-modal')).toBeInTheDocument();
      expect(screen.getByText('Novo Serviço Modal')).toBeInTheDocument();
    });
  });

  it('deve abrir o modal de edição ao clicar em "Editar" no menu de ações', async () => {
    // ATUALIZAÇÃO PADRÃO OURO: Mock em camelCase
    const mockService = {
      id: 10,
      userId: '123', // user_id -> userId
      name: 'Serviço Teste',
      price: 1000,
      duration: 15,
      createdAt: '', // created_at -> createdAt
      updatedAt: ''  // updated_at -> updatedAt
    };

    mockUseServicesQuery.mockReturnValue({
      data: [mockService],
      isLoading: false,
      isError: false,
    } as any);

    render(<ServicesDataTable />);

    const actionsTrigger = screen.getByRole('button', { name: /abrir menu/i });
    fireEvent.click(actionsTrigger);

    const editButton = await screen.findByText('Editar');
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByTestId('service-form-modal')).toBeInTheDocument();
      expect(screen.getByText(`Editando: ${mockService.name}`)).toBeInTheDocument();
    });
  });

  it('deve chamar a mutação de exclusão ao confirmar no dialog', async () => {
    // ATUALIZAÇÃO PADRÃO OURO: Mock em camelCase
    const mockService = {
      id: 99,
      userId: '123', // user_id -> userId
      name: 'Serviço Para Deletar',
      price: 1000,
      duration: 15,
      createdAt: '', // created_at -> createdAt
      updatedAt: ''  // updated_at -> updatedAt
    };

    mockUseServicesQuery.mockReturnValue({
      data: [mockService],
      isLoading: false,
      isError: false,
    } as any);

    render(<ServicesDataTable />);

    // 1. Abre Dropdown
    const actionsTrigger = screen.getByRole('button', { name: /abrir menu/i });
    fireEvent.click(actionsTrigger);

    // 2. Clica em Excluir no menu
    const deleteOption = await screen.findByText('Excluir');
    fireEvent.click(deleteOption);

    // 3. Verifica se o AlertDialog abriu
    expect(screen.getByText('Excluir Serviço')).toBeInTheDocument();
    expect(screen.getByText(/Tem certeza que deseja excluir o serviço/)).toBeInTheDocument();

    // 4. Clica em Confirmar
    const confirmButton = screen.getByRole('button', { name: 'Excluir' });
    fireEvent.click(confirmButton);

    // 5. Verifica chamada da mutação
    await waitFor(() => {
      expect(mockDeleteMutate).toHaveBeenCalledWith(99);
    });
  });
});