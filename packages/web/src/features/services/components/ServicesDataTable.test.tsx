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
    // Verifica se renderiza elementos com classe de skeleton (verificação estrutural básica)
    // Como o componente retorna um bloco específico para loading, verificamos se ele está presente
    // A div pai do loading tem a classe "space-y-4 p-8"
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
    // Verifica se o botão de adicionar serviço dentro da tabela vazia existe
    expect(screen.getAllByText('Adicionar Serviço')[0]).toBeInTheDocument(); // Pode haver outro no header dependendo da implementação
  });

  it('deve renderizar a lista de serviços corretamente', () => {
    const mockData = [
      {
        id: 1,
        user_id: 'user-1',
        name: 'Corte Masculino',
        description: 'Corte com tesoura',
        price: 5000, // R$ 50,00
        duration: 30,
        color: '#000000',
        image_url: null,
        created_at: '2023-01-01',
        updated_at: '2023-01-01',
      },
      {
        id: 2,
        user_id: 'user-1',
        name: 'Barba',
        description: null,
        price: 3500, // R$ 35,00
        duration: 20,
        color: '#FF0000',
        image_url: 'http://example.com/img.jpg',
        created_at: '2023-01-01',
        updated_at: '2023-01-01',
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
    // Verifica se a imagem renderizou (pela prop alt)
    expect(screen.getByAltText('Barba')).toBeInTheDocument();
  });

  it('deve abrir o modal de criação ao clicar em "Novo Serviço"', async () => {
    mockUseServicesQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as any);

    render(<ServicesDataTable />);

    // O botão está no header
    const newServiceBtn = screen.getByRole('button', { name: /novo serviço/i });
    fireEvent.click(newServiceBtn);

    await waitFor(() => {
      expect(screen.getByTestId('service-form-modal')).toBeInTheDocument();
      expect(screen.getByText('Novo Serviço Modal')).toBeInTheDocument();
    });
  });

  it('deve abrir o modal de edição ao clicar em "Editar" no menu de ações', async () => {
    const mockService = {
      id: 10,
      user_id: '123',
      name: 'Serviço Teste',
      price: 1000,
      duration: 15,
      created_at: '',
      updated_at: ''
    };

    mockUseServicesQuery.mockReturnValue({
      data: [mockService],
      isLoading: false,
      isError: false,
    } as any);

    render(<ServicesDataTable />);

    // Abre o dropdown de ações
    const actionsTrigger = screen.getByRole('button', { name: /abrir menu/i });
    fireEvent.click(actionsTrigger);

    // Clica em Editar
    const editButton = await screen.findByText('Editar');
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByTestId('service-form-modal')).toBeInTheDocument();
      expect(screen.getByText(`Editando: ${mockService.name}`)).toBeInTheDocument();
    });
  });

  it('deve chamar a mutação de exclusão ao confirmar no dialog', async () => {
    const mockService = {
      id: 99,
      user_id: '123',
      name: 'Serviço Para Deletar',
      price: 1000,
      duration: 15,
      created_at: '',
      updated_at: ''
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

    // 4. Clica em Confirmar (Botão "Excluir" do Dialog)
    // Nota: Existem dois botões "Excluir" agora (um do menu que fechou, um do dialog).
    // O do dialog geralmente é o último ou buscamos por role dentro do dialog,
    // mas como o menu fecha, deve sobrar o do dialog visível ou podemos buscar pelo container do portal.
    // Vamos buscar pelo texto exato dentro do footer do dialog.
    const confirmButton = screen.getByRole('button', { name: 'Excluir' });
    fireEvent.click(confirmButton);

    // 5. Verifica chamada da mutação
    await waitFor(() => {
      expect(mockDeleteMutate).toHaveBeenCalledWith(99);
    });
  });
});