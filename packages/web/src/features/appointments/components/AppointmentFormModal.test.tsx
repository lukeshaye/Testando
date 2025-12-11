/*
 * /packages/web/src/features/appointments/components/AppointmentFormModal.test.tsx
 *
 * TAREFA: 4.8 (Testes) - AppointmentFormModal.test.tsx
 * REFATORAÇÃO: Simplificação Radical (Opção B) - Uso de Objetos Date Nativos
 *
 * MUDANÇAS REALIZADAS:
 * - [X] Validar envio de 'appointmentDate' e 'endDate' como objetos Date completos.
 * - [X] Remover verificações de strings manuais (startTime/endTime/date).
 * - [X] Garantir que o cálculo de duração (endDate) esteja correto no payload.
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

// Mocks dos Hooks
import { useAddAppointmentMutation } from '../hooks/useAddAppointmentMutation';
import { useUpdateAppointmentMutation } from '../hooks/useUpdateAppointmentMutation';
import { useAvailableTimeSlots } from '../hooks/useAvailableTimeSlots';
import { useClientsQuery } from '@/features/clients/hooks/useClientsQuery';
import { useProfessionalsQuery } from '@/features/professionals/hooks/useProfessionalsQuery';
import { useServicesQuery } from '@/features/services/hooks/useServicesQuery';
import { useToast } from '@/packages/ui/components/ui/use-toast';

// --- Configuração dos Mocks ---

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

const mockedUseAddAppointmentMutation = vi.mocked(useAddAppointmentMutation);
const mockedUseUpdateAppointmentMutation = vi.mocked(useUpdateAppointmentMutation);
const mockedUseAvailableTimeSlots = vi.mocked(useAvailableTimeSlots);
const mockedUseClientsQuery = vi.mocked(useClientsQuery);
const mockedUseProfessionalsQuery = vi.mocked(useProfessionalsQuery);
const mockedUseServicesQuery = vi.mocked(useServicesQuery);

const mockAddMutate = vi.fn();
const mockUpdateMutate = vi.fn();
const mockOnClose = vi.fn();

// --- Dados de Teste ---

const mockClients = [
  { id: 1, name: 'Cliente A' },
  { id: 2, name: 'Cliente B' },
];

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

const mockServices = [
  { id: 1, name: 'Corte', duration: 60, price: 5000 },
  { id: 2, name: 'Barba', duration: 30, price: 3000 },
];

// Datas em UTC para consistência nos testes
const mockAvailableSlots = [
  { label: '10:00', value: new Date('2025-11-15T10:00:00Z') },
  { label: '10:30', value: new Date('2025-11-15T10:30:00Z') },
];

const mockEditingAppointment = {
  id: 101,
  appointmentDate: '2025-11-15T10:00:00Z', // UTC
  endDate: '2025-11-15T11:00:00Z',         // UTC (1 hora depois)
  clientName: 'Cliente A',
  serviceName: 'Corte',
  professionalName: 'Dr. Teste',
  clientId: 1,
  serviceId: 1,
  professionalId: 1,
  price: 5000,
  notes: '',
  status: 'CONFIRMED',
  attended: false,
};

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

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-11-15T09:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // --- Testes de Renderização (Mantidos) ---

  it('deve renderizar em modo "Criação"', () => {
    renderComponent({ editingAppointment: null });

    expect(screen.getByText('Novo Agendamento')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Criar Agendamento' })).toBeInTheDocument();
  });

  it('deve renderizar em modo "Edição" e preencher o formulário', async () => {
    // @ts-ignore
    renderComponent({ editingAppointment: mockEditingAppointment });

    expect(screen.getByText('Editar Agendamento')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(mockClients[0].name)).toBeInTheDocument();
      expect(screen.getByText(mockProfessionals[0].name)).toBeInTheDocument();
    });
  });

  // --- Teste de Lógica de Horários (Mantidos) ---

  it('deve mostrar "estado vazio" se não houver slots', async () => {
    mockedUseAvailableTimeSlots.mockReturnValue({
      availableTimeSlots: [],
      isLoading: false,
    });
    renderComponent({ editingAppointment: null });

    // Simula seleção para disparar busca de slots
    fireEvent.mouseDown(screen.getByText('Selecione um profissional'));
    fireEvent.click(await screen.findByText('Dr. Teste'));
    fireEvent.mouseDown(screen.getByText('Selecione um serviço'));
    fireEvent.click(await screen.findByText('Corte (60 min)'));

    await waitFor(() => {
      expect(screen.getByText(/Nenhum horário disponível/)).toBeInTheDocument();
    });
  });

  // --- Teste de Submissão (ATUALIZADO PARA OPÇÃO B) ---

  it('deve chamar "updateMutation" com objetos Date corretos (Modo Edição)', async () => {
    // @ts-ignore
    renderComponent({ editingAppointment: mockEditingAppointment });

    await waitFor(() => {
      expect(screen.getByText('Cliente A')).toBeInTheDocument();
    });

    const submitButton = screen.getByRole('button', { name: 'Salvar Alterações' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockUpdateMutate).toHaveBeenCalledTimes(1);
    });

    // CORREÇÃO (Opção B):
    // Esperamos objetos Date puros, sem manipulação de strings HH:MM.
    // O backend agora recebe appointmentDate e endDate diretamente.
    
    const expectedStartDate = new Date(mockEditingAppointment.appointmentDate);
    const expectedEndDate = new Date(mockEditingAppointment.endDate);

    expect(mockUpdateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: mockEditingAppointment.id,
        price: 5000,
        // Verifica se são instâncias de Date e se o valor bate
        appointmentDate: expectedStartDate,
        endDate: expectedEndDate,
      })
    );
    
    // Garante que NÃO estamos enviando as strings antigas que causavam erro
    expect(mockUpdateMutate).not.toHaveBeenCalledWith(
        expect.objectContaining({
            startTime: expect.anything(),
            endTime: expect.anything()
        })
    );
  });

  it('deve chamar "addMutation" com objetos Date (Modo Criação)', async () => {
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

    // 3. Serviço (60 min)
    fireEvent.mouseDown(screen.getByText('Selecione um serviço'));
    fireEvent.click(await screen.findByText('Corte (60 min)'));

    // 4. Horário (10:00)
    const slotRadio = await screen.findByLabelText('10:00');
    fireEvent.click(slotRadio);

    // 5. Submete
    const submitButton = screen.getByRole('button', { name: 'Criar Agendamento' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockAddMutate).toHaveBeenCalledTimes(1);
    });

    // Cálculo do esperado para a Opção B
    const expectedStartDate = mockAvailableSlots[0].value; // 10:00 UTC
    // Duração é 60 min, então deve adicionar 1 hora
    const expectedEndDate = new Date(expectedStartDate.getTime() + 60 * 60 * 1000);

    expect(mockAddMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 1,
        professionalId: 1,
        serviceId: 1,
        price: 5000,
        // Payload limpo: apenas Datas
        appointmentDate: expectedStartDate,
        endDate: expectedEndDate, 
        attended: false,
      }),
    );

    // Garante que campos legados não são enviados
    expect(mockAddMutate).not.toHaveBeenCalledWith(
        expect.objectContaining({
            startTime: expect.anything(),
            endTime: expect.anything(),
            date: expect.anything()
        })
    );
  });

  // --- Teste de Validação ---

  it('deve mostrar mensagens de erro de validação ao submeter vazio', async () => {
    renderComponent({ editingAppointment: null });

    const submitButton = screen.getByRole('button', { name: 'Criar Agendamento' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockAddMutate).not.toHaveBeenCalled();
      const errorMessages = screen.getAllByText('Required');
      expect(errorMessages.length).toBeGreaterThan(0);
    });
  });

  it('deve fechar o modal no sucesso da mutação', async () => {
    mockedUseAddAppointmentMutation.mockReturnValue({
      mutate: mockAddMutate,
      isPending: false,
      isSuccess: true, // Simula sucesso
    } as any);

    renderComponent({ editingAppointment: null });

    // Como já renderiza com success=true, deve tentar fechar imediatamente ou após um ciclo
    await waitFor(() => {
        // Verifica se onClose foi chamado (depende da implementação do useEffect no componente)
        // Se o componente fecha apenas após o clique do botão que dispara o sucesso, 
        // o teste precisaria disparar o evento. 
        // Assumindo que o componente reage a isSuccess:
        expect(mockOnClose).toHaveBeenCalled(); 
    });
  });
});