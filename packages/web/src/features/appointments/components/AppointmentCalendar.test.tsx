/*
 * /packages/web/src/features/appointments/components/AppointmentCalendar.test.tsx
 *
 * TAREFA: 4.8 (Testes) - AppointmentCalendar.test.tsx
 * CORREÇÃO: Ajuste de Schema (CamelCase e Relacionamentos)
 */

import {
  render,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AppointmentCalendar } from './AppointmentCalendar';

// Mocks dos Hooks de Dados (Nível 3)
import { useAppointmentsQuery } from '../hooks/useAppointmentsQuery';
import { useDeleteAppointmentMutation } from '../hooks/useDeleteAppointmentMutation';
import { useProfessionalsQuery } from '@/features/professionals/hooks/useProfessionalsQuery';

// Mocks de UI (Nível 1)
import { useToast } from '@/packages/ui/use-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// --- Configuração dos Mocks ---

// 1. Mocks de Componentes de UI
vi.mock('@/packages/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('./AppointmentFormModal', () => ({
  AppointmentFormModal: ({
    isOpen,
    editingAppointment,
  }: {
    isOpen: boolean;
    editingAppointment?: any;
  }) =>
    isOpen ? (
      <div data-testid="mock-form-modal">
        {editingAppointment ? 'Editando' : 'Novo'}
      </div>
    ) : null,
}));

vi.mock('@/packages/ui/confirmation-modal', () => ({
  ConfirmationModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? (
      <div data-testid="mock-confirm-modal">Confirmar Exclusão</div>
    ) : null,
}));

vi.mock('@/packages/ui/loading-spinner', () => ({
  LoadingSpinner: () => (
    <div data-testid="loading-spinner" role="status">
      Carregando...
    </div>
  ),
}));

// 2. Mocks dos Hooks de Dados
vi.mock('../hooks/useAppointmentsQuery');
vi.mock('../hooks/useDeleteAppointmentMutation');
vi.mock('@/features/professionals/hooks/useProfessionalsQuery');

// Cast dos mocks para tipagem
const mockedUseAppointmentsQuery = vi.mocked(useAppointmentsQuery);
const mockedUseProfessionalsQuery = vi.mocked(useProfessionalsQuery);
const mockedUseDeleteAppointmentMutation = vi.mocked(
  useDeleteAppointmentMutation,
);

// --- Dados de Teste ---

const mockProfessionals = [
  {
    id: 1,
    name: 'Dr. Teste',
    color: '#ff0000',
    workStartTime: '09:00', // Atualizado para camelCase por precaução
    workEndTime: '18:00',
    lunchStartTime: '12:00',
    lunchEndTime: '13:00',
  },
];

// ATUALIZAÇÃO: Estrutura ajustada para camelCase e objetos aninhados
// conforme o novo padrão do backend (Drizzle ORM)
const mockAppointments = [
  {
    id: 101,
    appointmentDate: '2025-11-14T10:00:00Z', // CORRIGIDO: snake_case -> camelCase
    endDate: '2025-11-14T11:00:00Z',         // CORRIGIDO: snake_case -> camelCase
    client: {
      id: 1,
      name: 'Cliente A' // CORRIGIDO: objeto aninhado
    },
    service: {
      id: 1,
      name: 'Corte'     // CORRIGIDO: objeto aninhado
    },
    professional: {
      id: 1,
      name: 'Dr. Teste'
    },
    professionalId: 1, // CORRIGIDO
    notes: '',
    status: 'CONFIRMED',
  },
  {
    id: 102,
    appointmentDate: '2025-11-14T14:00:00Z',
    endDate: '2025-11-14T14:30:00Z',
    client: {
      id: 2,
      name: 'Cliente B'
    },
    service: {
      id: 2,
      name: 'Barba'
    },
    professional: {
      id: 1,
      name: 'Dr. Teste'
    },
    professionalId: 1,
    notes: '',
    status: 'CONFIRMED',
  },
];

// Helper para renderização com QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false, // Desabilita retries para testes
    },
  },
});
const renderComponent = () => {
  return render(
    <QueryClientProvider client={queryClient}>
      <AppointmentCalendar />
    </QueryClientProvider>,
  );
};

// --- Testes ---

describe('AppointmentCalendar', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock para data fixa (Hoje = 14/11/2025)
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-11-14T09:00:00Z')); // Uma sexta-feira

    // Configuração padrão (Happy Path, mas sem dados)
    mockedUseAppointmentsQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as any);
    mockedUseProfessionalsQuery.mockReturnValue({
      data: mockProfessionals,
      isLoading: false,
      isError: false,
    } as any);
    mockedUseDeleteAppointmentMutation.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Teste de Renderização (Requisito do Plano)
  it('deve renderizar o spinner de carregamento (loading state)', () => {
    mockedUseAppointmentsQuery.mockReturnValue({
      data: [],
      isLoading: true,
    } as any);
    renderComponent();

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  it('deve renderizar o estado vazio se não houver agendamentos', () => {
    // Os mocks padrão do beforeEach já retornam data: []
    renderComponent();

    // Verifica se o spinner sumiu
    expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    // Verifica o estado vazio
    expect(screen.getByText('Nenhum agendamento')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Não há agendamentos para este dia. Que tal criar um novo?',
      ),
    ).toBeInTheDocument();
  });

  it('deve renderizar os agendamentos quando houver dados (data state)', () => {
    mockedUseAppointmentsQuery.mockReturnValue({
      data: mockAppointments,
      isLoading: false,
    } as any);
    renderComponent();

    // Verifica se o estado vazio NÃO está presente
    expect(screen.queryByText('Nenhum agendamento')).not.toBeInTheDocument();

    // Verifica os dados usando as novas estruturas
    expect(screen.getByText('Cliente A')).toBeInTheDocument();
    expect(screen.getByText('Corte')).toBeInTheDocument();
    
    // O cálculo de tempo deve funcionar baseando-se em appointmentDate/endDate
    expect(screen.getByText('60 min')).toBeInTheDocument();

    expect(screen.getByText('Cliente B')).toBeInTheDocument();
    expect(screen.getByText('Barba')).toBeInTheDocument();
    expect(screen.getByText('30 min')).toBeInTheDocument();
  });

  // Testes de Interação (UI)
  it('deve abrir o modal de novo agendamento ao clicar em "Agendar" (desktop)', async () => {
    renderComponent();
    // Botão Desktop
    const newButton = screen.getByRole('button', { name: /Agendar/i });
    fireEvent.click(newButton);

    await waitFor(() => {
      expect(screen.getByTestId('mock-form-modal')).toBeInTheDocument();
      expect(screen.getByText('Novo')).toBeInTheDocument();
    });
  });

  it('deve abrir o modal de novo agendamento ao clicar no FAB (mobile)', async () => {
    renderComponent();
    // Botão FAB (Mobile)
    const fabButton = screen.getByRole('button', {
      name: /Novo Agendamento/i,
    });
    fireEvent.click(fabButton);

    await waitFor(() => {
      expect(screen.getByTestId('mock-form-modal')).toBeInTheDocument();
      expect(screen.getByText('Novo')).toBeInTheDocument();
    });
  });

  it('deve abrir o modal de edição ao clicar em um agendamento', async () => {
    mockedUseAppointmentsQuery.mockReturnValue({
      data: [mockAppointments[0]], // Apenas 1 agendamento
      isLoading: false,
    } as any);
    renderComponent();

    // Clica no card (pelo nome do cliente)
    const appointmentCard = screen.getByText('Cliente A');
    fireEvent.click(appointmentCard);

    await waitFor(() => {
      expect(screen.getByTestId('mock-form-modal')).toBeInTheDocument();
      expect(screen.getByText('Editando')).toBeInTheDocument();
    });
  });

  // Testes de Interação (Hooks)
  it('deve chamar useAppointmentsQuery com a data anterior ao clicar em "prev"', async () => {
    renderComponent();

    // Data atual: 'sexta-feira, 14 de novembro'
    expect(
      screen.getByText('sexta-feira, 14 de novembro'),
    ).toBeInTheDocument();

    // Encontra o botão "anterior" (o primeiro ChevronLeft)
    const prevButton = screen.getAllByRole('button')[1]; // Posição frágil, mas funciona
    fireEvent.click(prevButton);

    await waitFor(() => {
      // Verifica se a data do cabeçalho mudou
      expect(
        screen.getByText('quinta-feira, 13 de novembro'),
      ).toBeInTheDocument();
      // Verifica se o hook foi chamado com a nova data
      expect(mockedUseAppointmentsQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({
          date: '2025-11-13',
        }),
      );
    });
  });

  it('deve chamar useAppointmentsQuery com a próxima data ao clicar em "next"', async () => {
    renderComponent();
    expect(
      screen.getByText('sexta-feira, 14 de novembro'),
    ).toBeInTheDocument();

    // Encontra o botão "próximo" (último botão no header)
    const nextButton = screen.getAllByRole('button')[2];
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(
        screen.getByText('sábado, 15 de novembro'),
      ).toBeInTheDocument();
      expect(mockedUseAppointmentsQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({
          date: '2025-11-15',
        }),
      );
    });
  });

  it('deve chamar useAppointmentsQuery com o ID do profissional ao filtrar', async () => {
    renderComponent();

    // Encontra o gatilho do Select
    const selectTrigger = screen.getByRole('combobox');
    expect(screen.getByText('Todos os Profissionais')).toBeInTheDocument();
    fireEvent.mouseDown(selectTrigger); // Abre o select

    // Encontra e clica na opção (mockProfessional[0].name)
    const option = await screen.findByRole('option', { name: 'Dr. Teste' });
    fireEvent.click(option);

    await waitFor(() => {
      // Verifica se o valor do select mudou
      expect(screen.getByText('Dr. Teste')).toBeInTheDocument();
      // Verifica se o hook foi chamado com o ID
      expect(mockedUseAppointmentsQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({
          professionalId: 1, // CORRIGIDO: professional_id -> professionalId
        }),
      );
    });
  });
});