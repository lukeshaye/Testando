/*
 * /packages/web/src/features/appointments/components/AppointmentFormModal.test.tsx
 *
 * TAREFA: 4.8 (Testes) - AppointmentFormModal.test.tsx
 * REFATORAÇÃO: Adaptação para CamelCase (Code) vs SnakeCase (DB)
 *
 * PLANO:
 * - Zombar (mock) todos os hooks que o componente consome.
 * - Testar renderização em modo "Criação" e "Edição".
 * - Testar a lógica de 'useAvailableTimeSlots'.
 * - Testar a submissão do formulário (agora enviando payloads em camelCase).
 * - Testar a falha de validação (DSpP 2.16).
 */

import {
  render,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppointmentFormModal } from './AppointmentFormModal';

// Mocks dos Hooks (CQRS / Lógica / UI)
import { useAddAppointmentMutation } from '../hooks/useAddAppointmentMutation';
import { useUpdateAppointmentMutation } from '../hooks/useUpdateAppointmentMutation';
import { useAvailableTimeSlots } from '../hooks/useAvailableTimeSlots';
import { useClientsQuery } from '@/features/clients/hooks/useClientsQuery';
import { useProfessionalsQuery } from '@/features/professionals/hooks/useProfessionalsQuery';
import { useServicesQuery } from '@/features/services/hooks/useServicesQuery';
import { useToast } from '@/packages/ui/components/ui/use-toast';

// --- Configuração dos Mocks ---

// 1. Mocks de Hooks
vi.mock('../hooks/useAddAppointmentMutation');
vi.mock('../hooks/useUpdateAppointmentMutation');
vi.mock('../hooks/useAvailableTimeSlots');
vi.mock('@/features/clients/hooks/useClientsQuery');
vi.mock('@/features/professionals/hooks/useProfessionalsQuery');
vi.mock('@/features/services/hooks/useServicesQuery');
vi.mock('@/packages/ui/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Cast dos mocks para tipagem
const mockedUseAddAppointmentMutation = vi.mocked(useAddAppointmentMutation);
const mockedUseUpdateAppointmentMutation = vi.mocked(
  useUpdateAppointmentMutation,
);
const mockedUseAvailableTimeSlots = vi.mocked(useAvailableTimeSlots);
const mockedUseClientsQuery = vi.mocked(useClientsQuery);
const mockedUseProfessionalsQuery = vi.mocked(useProfessionalsQuery);
const mockedUseServicesQuery = vi.mocked(useServicesQuery);

// Mock de Funções (para espionar chamadas)
const mockAddMutate = vi.fn();
const mockUpdateMutate = vi.fn();
const mockOnClose = vi.fn();

// --- Dados de Teste (Atualizados para camelCase) ---

const mockClients = [
  { id: 1, name: 'Cliente A' },
  { id: 2, name: 'Cliente B' },
];

const mockProfessionals = [
  {
    id: 1,
    name: 'Dr. Teste',
    color: '#ff0000',
    workStartTime: '09:00', // camelCase
    workEndTime: '18:00',   // camelCase
    lunchStartTime: '12:00', // camelCase
    lunchEndTime: '13:00',   // camelCase
  },
];

const mockServices = [
  { id: 1, name: 'Corte', duration: 60, price: 5000 }, // 5000 centavos = R$ 50
  { id: 2, name: 'Barba', duration: 30, price: 3000 }, // 3000 centavos = R$ 30
];

const mockAvailableSlots = [
  { label: '10:00', value: new Date('2025-11-15T10:00:00Z') },
  { label: '10:30', value: new Date('2025-11-15T10:30:00Z') },
];

// Objeto de edição atualizado para camelCase
const mockEditingAppointment = {
  id: 101,
  appointmentDate: '2025-11-15T10:00:00Z', // camelCase
  endDate: '2025-11-15T11:00:00Z',         // camelCase
  clientName: 'Cliente A',                 // camelCase
  serviceName: 'Corte',                    // camelCase (opcional, dependendo do DTO)
  professionalName: 'Dr. Teste',           // camelCase (opcional)
  clientId: 1,                             // camelCase
  serviceId: 1,                            // camelCase
  professionalId: 1,                       // camelCase
  price: 5000,
  notes: '',
  status: 'CONFIRMED',
  attended: false,
};

// Helper de Renderização
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const renderComponent = (props: Partial<Parameters<typeof AppointmentFormModal>[0]>) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <AppointmentFormModal
        isOpen={true}
        onClose={mockOnClose}
        editingAppointment={null}
        {...props}
      />
    </QueryClientProvider>,
  );
};

// --- Testes ---

describe('AppointmentFormModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Configuração padrão (Happy Path, dados carregados)
    mockedUseClientsQuery.mockReturnValue({
      data: mockClients,
      isLoading: false,
    } as any);
    mockedUseProfessionalsQuery.mockReturnValue({
      data: mockProfessionals,
      isLoading: false,
    } as any);
    mockedUseServicesQuery.mockReturnValue({
      data: mockServices,
      isLoading: false,
    } as any);
    mockedUseAvailableTimeSlots.mockReturnValue({
      availableTimeSlots: [],
      isLoading: false,
    });
    mockedUseAddAppointmentMutation.mockReturnValue({
      mutate: mockAddMutate,
      isPending: false,
      isSuccess: false,
    } as any);
    mockedUseUpdateAppointmentMutation.mockReturnValue({
      mutate: mockUpdateMutate,
      isPending: false,
      isSuccess: false,
    } as any);

    // Fixar data para testes
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-11-15T09:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // --- Testes de Renderização ---

  it('deve renderizar em modo "Criação"', () => {
    renderComponent({ editingAppointment: null });

    expect(screen.getByText('Novo Agendamento')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Criar Agendamento' }),
    ).toBeInTheDocument();
    
    expect(screen.getByText('Selecione um cliente')).toBeInTheDocument();
    expect(screen.getByText('Selecione um profissional')).toBeInTheDocument();
    expect(screen.getByText('Selecione um serviço')).toBeInTheDocument();
  });

  it('deve renderizar em modo "Edição" e preencher o formulário', async () => {
    // @ts-ignore - ignorando erro de tipagem parcial no mock para teste
    renderComponent({ editingAppointment: mockEditingAppointment });

    expect(screen.getByText('Editar Agendamento')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Salvar Alterações' }),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(mockClients[0].name)).toBeInTheDocument();
      expect(screen.getByText(mockProfessionals[0].name)).toBeInTheDocument();
      expect(
        screen.getByText(
          `${mockServices[0].name} (${mockServices[0].duration} min)`,
        ),
      ).toBeInTheDocument();

      expect(screen.getByLabelText(/Preço/)).toHaveValue(50);
    });
  });

  // --- Teste de Lógica ---

  it('deve mostrar "loading" e "estado vazio" para os slots de horário', async () => {
    mockedUseAvailableTimeSlots.mockReturnValue({
      availableTimeSlots: [],
      isLoading: true,
    });
    const { rerender } = renderComponent({ editingAppointment: null });

    fireEvent.mouseDown(screen.getByText('Selecione um profissional'));
    fireEvent.click(await screen.findByText('Dr. Teste'));
    fireEvent.mouseDown(screen.getByText('Selecione um serviço'));
    fireEvent.click(await screen.findByText('Corte (60 min)'));

    await waitFor(() => {
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    mockedUseAvailableTimeSlots.mockReturnValue({
      availableTimeSlots: [],
      isLoading: false,
    });
    rerender(
      <QueryClientProvider client={queryClient}>
        <AppointmentFormModal
          isOpen={true}
          onClose={mockOnClose}
          editingAppointment={null}
        />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Nenhum horário disponível/),
      ).toBeInTheDocument();
    });
  });

  it('deve renderizar os slots de horário (useAvailableTimeSlots)', async () => {
    mockedUseAvailableTimeSlots.mockReturnValue({
      availableTimeSlots: mockAvailableSlots,
      isLoading: false,
    });
    renderComponent({ editingAppointment: null });

    fireEvent.mouseDown(screen.getByText('Selecione um profissional'));
    fireEvent.click(await screen.findByText('Dr. Teste'));
    fireEvent.mouseDown(screen.getByText('Selecione um serviço'));
    fireEvent.click(await screen.findByText('Corte (60 min)'));

    await waitFor(() => {
      expect(screen.getByLabelText('10:00')).toBeInTheDocument();
      expect(screen.getByLabelText('10:30')).toBeInTheDocument();
    });
  });

  // --- Teste de Submissão ---

  it('deve chamar "updateMutation" com os dados corretos ao salvar (Modo Edição)', async () => {
    // @ts-ignore
    renderComponent({ editingAppointment: mockEditingAppointment });

    await waitFor(() => {
      expect(screen.getByText('Cliente A')).toBeInTheDocument();
    });

    const submitButton = screen.getByRole('button', {
      name: 'Salvar Alterações',
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockUpdateMutate).toHaveBeenCalledTimes(1);
    });

    // Verifica o payload com propriedades em camelCase
    const expectedPayload = {
      ...mockEditingAppointment,
      appointmentDate: new Date(mockEditingAppointment.appointmentDate),
      endDate: new Date(mockEditingAppointment.endDate),
      price: 5000,
    };
    expect(mockUpdateMutate).toHaveBeenCalledWith(expectedPayload);
  });

  it('deve chamar "addMutation" com os dados corretos (Modo Criação)', async () => {
    mockedUseAvailableTimeSlots.mockReturnValue({
      availableTimeSlots: mockAvailableSlots,
      isLoading: false,
    });
    renderComponent({ editingAppointment: null });

    // 1. Cliente
    fireEvent.mouseDown(screen.getByText('Selecione um cliente'));
    fireEvent.click(await screen.findByText('Cliente A'));

    // 2. Profissional
    fireEvent.mouseDown(screen.getByText('Selecione um profissional'));
    fireEvent.click(await screen.findByText('Dr. Teste'));

    // 3. Serviço
    fireEvent.mouseDown(screen.getByText('Selecione um serviço'));
    fireEvent.click(await screen.findByText('Corte (60 min)'));

    await waitFor(() => {
      expect(screen.getByLabelText(/Preço/)).toHaveValue(50);
    });

    // 4. Horário
    const slotRadio = await screen.findByLabelText('10:00');
    fireEvent.click(slotRadio);

    // 5. Submete
    const submitButton = screen.getByRole('button', {
      name: 'Criar Agendamento',
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockAddMutate).toHaveBeenCalledTimes(1);
    });

    const expectedDate = mockAvailableSlots[0].value;
    const expectedEndDate = new Date('2025-11-15T11:00:00Z');

    // Verifica o payload com propriedades em camelCase
    expect(mockAddMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 1,         // camelCase
        professionalId: 1,   // camelCase
        serviceId: 1,        // camelCase
        price: 5000,
        appointmentDate: expectedDate, // camelCase
        endDate: expectedEndDate,      // camelCase
        attended: false,
      }),
    );
  });

  it('deve fechar o modal no sucesso da mutação', async () => {
    mockedUseAddAppointmentMutation.mockReturnValue({
      mutate: mockAddMutate,
      isPending: false,
      isSuccess: false,
    } as any);
    const { rerender } = renderComponent({ editingAppointment: null });

    expect(mockOnClose).not.toHaveBeenCalled();

    mockedUseAddAppointmentMutation.mockReturnValue({
      mutate: mockAddMutate,
      isPending: false,
      isSuccess: true,
    } as any);

    rerender(
      <QueryClientProvider client={queryClient}>
        <AppointmentFormModal
          isOpen={true}
          onClose={mockOnClose}
          editingAppointment={null}
        />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  // --- [CORREÇÃO] Teste de Validação (DSpP 2.16) ---

  it('deve mostrar mensagens de erro de validação (DSpP 2.16) ao submeter vazio', async () => {
    renderComponent({ editingAppointment: null });

    const submitButton = screen.getByRole('button', {
      name: 'Criar Agendamento',
    });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockAddMutate).not.toHaveBeenCalled();

      // Agora a validação Zod ocorre nos campos camelCase (clientId, professionalId, serviceId)
      // O erro 'Required' deve aparecer 3 vezes.
      const errorMessages = screen.getAllByText('Required');
      expect(errorMessages).toHaveLength(3);
    });
  });
});