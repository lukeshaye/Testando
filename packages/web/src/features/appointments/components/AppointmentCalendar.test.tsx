/*
 * /packages/web/src/features/appointments/components/AppointmentCalendar.test.tsx
 *
 * Princípios Aplicados:
 * - 2.15 (PTE): Mocks refletem estritamente o contrato real da API.
 * - 2.3 (KISS): Estrutura de dados simplificada e legível.
 */

import {
  render,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AppointmentCalendar } from './AppointmentCalendar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mocks dos Hooks de Dados (Nível 3 - PGEC)
import { useAppointmentsQuery } from '../hooks/useAppointmentsQuery';
import { useDeleteAppointmentMutation } from '../hooks/useDeleteAppointmentMutation';
import { useProfessionalsQuery } from '@/features/professionals/hooks/useProfessionalsQuery';

// Mocks de UI
import { useToast } from '@/packages/ui/use-toast';

// --- Configuração dos Mocks ---

// 1. Mocks de Componentes de UI e Hooks Utilitários
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

// Cast dos mocks para tipagem correta
const mockedUseAppointmentsQuery = vi.mocked(useAppointmentsQuery);
const mockedUseProfessionalsQuery = vi.mocked(useProfessionalsQuery);
const mockedUseDeleteAppointmentMutation = vi.mocked(
  useDeleteAppointmentMutation,
);

// --- Dados de Teste (Alinhados com o Backend Drizzle) ---

const mockProfessionals = [
  {
    id: 1,
    name: 'Dr. Teste',
    color: '#ff0000',
    workStartTime: '09:00',
    workEndTime: '18:00',
    lunchStartTime: '12:00',
    lunchEndTime: '13:00',
  },
];

const mockAppointments = [
  {
    id: 101,
    appointmentDate: '2025-11-14T10:00:00Z', // CamelCase (Princípio 2.17)
    endDate: '2025-11-14T11:00:00Z',         // CamelCase
    client: {
      id: 1,
      name: 'Cliente A', // Objeto Aninhado (KISS/Drizzle)
    },
    service: {
      id: 1,
      name: 'Corte',     // Objeto Aninhado
    },
    professional: {
      id: 1,
      name: 'Dr. Teste',
      color: '#ff0000', // Campo retornado pela query do backend
    },
    professionalId: 1, // Mantido na raiz para filtragem rápida
    notes: '',
    status: 'CONFIRMED',
  },
  {
    id: 102,
    appointmentDate: '2025-11-14T14:00:00Z',
    endDate: '2025-11-14T14:30:00Z',
    client: {
      id: 2,
      name: 'Cliente B',
    },
    service: {
      id: 2,
      name: 'Barba',
    },
    professional: {
      id: 1,
      name: 'Dr. Teste',
      color: '#ff0000',
    },
    professionalId: 1,
    notes: '',
    status: 'CONFIRMED',
  },
];

// Helper para renderização com QueryClient (Necessário para React Query)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
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

    // Mock para data fixa (Hoje = 14/11/2025 - Sexta-feira)
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-11-14T09:00:00Z'));

    // Configuração padrão (Happy Path)
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

  // Teste de Renderização e Estados
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
    renderComponent();

    expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    expect(screen.getByText('Nenhum agendamento')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Não há agendamentos para este dia. Que tal criar um novo?',
      ),
    ).toBeInTheDocument();
  });

  it('deve renderizar os agendamentos corretamente quando houver dados (data state)', () => {
    mockedUseAppointmentsQuery.mockReturnValue({
      data: mockAppointments,
      isLoading: false,
    } as any);
    renderComponent();

    expect(screen.queryByText('Nenhum agendamento')).not.toBeInTheDocument();

    // Valida renderização usando dados aninhados
    expect(screen.getByText('Cliente A')).toBeInTheDocument(); // client.name
    expect(screen.getByText('Corte')).toBeInTheDocument();     // service.name
    
    // Valida cálculo de duração baseado nas datas CamelCase
    expect(screen.getByText('60 min')).toBeInTheDocument();

    expect(screen.getByText('Cliente B')).toBeInTheDocument();
    expect(screen.getByText('Barba')).toBeInTheDocument();
    expect(screen.getByText('30 min')).toBeInTheDocument();
  });

  // Testes de Interação (UI)
  it('deve abrir o modal de novo agendamento ao clicar em "Agendar" (desktop)', async () => {
    renderComponent();
    const newButton = screen.getByRole('button', { name: /Agendar/i });
    fireEvent.click(newButton);

    await waitFor(() => {
      expect(screen.getByTestId('mock-form-modal')).toBeInTheDocument();
      expect(screen.getByText('Novo')).toBeInTheDocument();
    });
  });

  it('deve abrir o modal de novo agendamento ao clicar no FAB (mobile)', async () => {
    renderComponent();
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
      data: [mockAppointments[0]], 
      isLoading: false,
    } as any);
    renderComponent();

    const appointmentCard = screen.getByText('Cliente A');
    fireEvent.click(appointmentCard);

    await waitFor(() => {
      expect(screen.getByTestId('mock-form-modal')).toBeInTheDocument();
      expect(screen.getByText('Editando')).toBeInTheDocument();
    });
  });

  // Testes de Interação (Hooks & Filtros)
  it('deve chamar useAppointmentsQuery com a data anterior ao clicar em "prev"', async () => {
    renderComponent();

    expect(
      screen.getByText('sexta-feira, 14 de novembro'),
    ).toBeInTheDocument();

    const prevButton = screen.getAllByRole('button')[1];
    fireEvent.click(prevButton);

    await waitFor(() => {
      expect(
        screen.getByText('quinta-feira, 13 de novembro'),
      ).toBeInTheDocument();
      
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

    const selectTrigger = screen.getByRole('combobox');
    expect(screen.getByText('Todos os Profissionais')).toBeInTheDocument();
    fireEvent.mouseDown(selectTrigger);

    const option = await screen.findByRole('option', { name: 'Dr. Teste' });
    fireEvent.click(option);

    await waitFor(() => {
      expect(screen.getByText('Dr. Teste')).toBeInTheDocument();
      
      expect(mockedUseAppointmentsQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({
          professionalId: 1, // Filtro por CamelCase
        }),
      );
    });
  });
});