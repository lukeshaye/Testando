/*
 * /packages/web/src/features/appointments/components/AppointmentFormModal.test.tsx
 *
 * TAREFA: 4.8 (Testes) - AppointmentFormModal.test.tsx
 * PLANO:
 * - Zombar (mock) todos os hooks que o componente consome:
 * - useAddAppointmentMutation, useUpdateAppointmentMutation (Commands)
 * - useAvailableTimeSlots (Lógica de Negócios)
 * - useClientsQuery, useProfessionalsQuery, useServicesQuery (Queries de outras features)
 * - useToast (UI)
 * - Testar renderização em modo "Criação" (título, botão).
 * - Testar renderização em modo "Edição" (título, botão, preenchimento do formulário).
 * - Testar a lógica de 'useAvailableTimeSlots' (loading, estado vazio, renderização de slots). (Requisito do Plano)
 * - Testar a submissão do formulário (chamada ao 'mutate'). (Requisito do Plano)
 * - [CORREÇÃO] Testar a falha de validação (DSpP 2.16) ao submeter vazio. (Requisito do Plano)
 */

import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
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
    work_start_time: '09:00',
    work_end_time: '18:00',
    lunch_start_time: '12:00',
    lunch_end_time: '13:00',
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
const mockEditingAppointment = {
  id: 101,
  appointment_date: '2025-11-15T10:00:00Z',
  end_date: '2025-11-15T11:00:00Z',
  client_name: 'Cliente A',
  service: 'Corte',
  professional: 'Dr. Teste',
  client_id: 1,
  service_id: 1,
  professional_id: 1,
  price: 5000, // 5000 centavos
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

    // Fixar data para testes (necessário para o Calendar)
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
    // Campos devem estar vazios
    expect(screen.getByText('Selecione um cliente')).toBeInTheDocument();
    expect(screen.getByText('Selecione um profissional')).toBeInTheDocument();
    expect(screen.getByText('Selecione um serviço')).toBeInTheDocument();
  });

  it('deve renderizar em modo "Edição" e preencher o formulário', async () => {
    renderComponent({ editingAppointment: mockEditingAppointment });

    expect(screen.getByText('Editar Agendamento')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Salvar Alterações' }),
    ).toBeInTheDocument();

    // Aguarda o useEffect/reset do react-hook-form popular os campos
    // Nota: O combobox (shadcn) mostra o 'name' do valor selecionado.
    await waitFor(() => {
      // Verifica os comboboxes
      expect(screen.getByText(mockClients[0].name)).toBeInTheDocument(); // Cliente A
      expect(screen.getByText(mockProfessionals[0].name)).toBeInTheDocument(); // Dr. Teste
      expect(
        screen.getByText(
          `${mockServices[0].name} (${mockServices[0].duration} min)`,
        ),
      ).toBeInTheDocument(); // Corte (60 min)

      // Verifica o preço (convertido de centavos 5000 para reais 50)
      expect(screen.getByLabelText(/Preço/)).toHaveValue(50);
    });
  });

  // --- Teste de Lógica (Requisito do Plano) ---

  it('deve mostrar "loading" e "estado vazio" para os slots de horário', async () => {
    // 1. Configura o hook para `isLoading: true`
    mockedUseAvailableTimeSlots.mockReturnValue({
      availableTimeSlots: [],
      isLoading: true,
    });
    const { rerender } = renderComponent({ editingAppointment: null });

    // Simula a seleção de profissional e serviço para mostrar o campo de horário
    fireEvent.mouseDown(screen.getByText('Selecione um profissional'));
    fireEvent.click(await screen.findByText('Dr. Teste'));
    fireEvent.mouseDown(screen.getByText('Selecione um serviço'));
    fireEvent.click(await screen.findByText('Corte (60 min)'));

    // Aguarda o spinner aparecer
    await waitFor(() => {
      // O <Loader2 /> está presente
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    // 2. Configura o hook para `isLoading: false` e `data: []` (Estado Vazio)
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

    // Aguarda a mensagem de estado vazio
    await waitFor(() => {
      expect(
        screen.getByText(/Nenhum horário disponível/),
      ).toBeInTheDocument();
    });
  });

  it('deve renderizar os slots de horário (useAvailableTimeSlots)', async () => {
    // Configura o hook para retornar os slots
    mockedUseAvailableTimeSlots.mockReturnValue({
      availableTimeSlots: mockAvailableSlots,
      isLoading: false,
    });
    renderComponent({ editingAppointment: null });

    // Simula a seleção de profissional e serviço
    fireEvent.mouseDown(screen.getByText('Selecione um profissional'));
    fireEvent.click(await screen.findByText('Dr. Teste'));
    fireEvent.mouseDown(screen.getByText('Selecione um serviço'));
    fireEvent.click(await screen.findByText('Corte (60 min)'));

    // Aguarda os slots aparecerem (RadioGroupItems rotulados)
    await waitFor(() => {
      expect(screen.getByLabelText('10:00')).toBeInTheDocument();
      expect(screen.getByLabelText('10:30')).toBeInTheDocument();
    });
  });

  // --- Teste de Submissão (Requisito do Plano) ---

  it('deve chamar "updateMutation" com os dados corretos ao salvar (Modo Edição)', async () => {
    renderComponent({ editingAppointment: mockEditingAppointment });

    // Aguarda o formulário ser preenchido
    await waitFor(() => {
      expect(screen.getByText('Cliente A')).toBeInTheDocument();
    });

    // Clica em "Salvar Alterações"
    const submitButton = screen.getByRole('button', {
      name: 'Salvar Alterações',
    });
    fireEvent.click(submitButton);

    // Aguarda a submissão (que é assíncrona)
    await waitFor(() => {
      expect(mockUpdateMutate).toHaveBeenCalledTimes(1);
    });

    // Verifica o payload enviado para a mutação
    const expectedPayload = {
      ...mockEditingAppointment,
      // Converte data de string para Date (como o react-hook-form faz)
      appointment_date: new Date(mockEditingAppointment.appointment_date),
      end_date: new Date(mockEditingAppointment.end_date),
      // Converte preço de centavos (BD) para reais (Form) e de volta para centavos (Submit)
      price: 5000, // 50 (form) * 100 = 5000 (payload)
    };
    expect(mockUpdateMutate).toHaveBeenCalledWith(expectedPayload);
  });

  it('deve chamar "addMutation" com os dados corretos (Modo Criação)', async () => {
    // Este teste é mais complexo pois requer o preenchimento de todo o formulário
    mockedUseAvailableTimeSlots.mockReturnValue({
      availableTimeSlots: mockAvailableSlots, // Fornece horários
      isLoading: false,
    });
    renderComponent({ editingAppointment: null });

    // 1. Seleciona Cliente
    fireEvent.mouseDown(screen.getByText('Selecione um cliente'));
    fireEvent.click(await screen.findByText('Cliente A'));

    // 2. Seleciona Profissional
    fireEvent.mouseDown(screen.getByText('Selecione um profissional'));
    fireEvent.click(await screen.findByText('Dr. Teste'));

    // 3. Seleciona Serviço (Corte, 60min, R$ 50,00)
    fireEvent.mouseDown(screen.getByText('Selecione um serviço'));
    fireEvent.click(await screen.findByText('Corte (60 min)'));

    // Aguarda o preço ser preenchido (Efeito do serviço)
    await waitFor(() => {
      expect(screen.getByLabelText(/Preço/)).toHaveValue(50);
    });

    // 4. Seleciona Horário (10:00)
    const slotRadio = await screen.findByLabelText('10:00');
    fireEvent.click(slotRadio);

    // 5. Submete
    const submitButton = screen.getByRole('button', {
      name: 'Criar Agendamento',
    });
    fireEvent.click(submitButton);

    // Aguarda a submissão
    await waitFor(() => {
      expect(mockAddMutate).toHaveBeenCalledTimes(1);
    });

    // 6. Verifica o Payload
    const expectedDate = mockAvailableSlots[0].value; // 2025-11-15T10:00:00Z
    const expectedEndDate = new Date('2025-11-15T11:00:00Z'); // 10:00 + 60 min

    expect(mockAddMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: 1, // Cliente A
        professional_id: 1, // Dr. Teste
        service_id: 1, // Corte
        price: 5000, // R$ 50 -> 5000 centavos
        appointment_date: expectedDate,
        end_date: expectedEndDate,
        attended: false,
      }),
    );
  });

  it('deve fechar o modal no sucesso da mutação', async () => {
    // 1. Começa com a mutação NÃO sucedida
    mockedUseAddAppointmentMutation.mockReturnValue({
      mutate: mockAddMutate,
      isPending: false,
      isSuccess: false,
    } as any);
    const { rerender } = renderComponent({ editingAppointment: null });

    expect(mockOnClose).not.toHaveBeenCalled();

    // 2. Simula o sucesso da mutação (rerender com novo estado do hook)
    mockedUseAddAppointmentMutation.mockReturnValue({
      mutate: mockAddMutate,
      isPending: false,
      isSuccess: true, // SUCESSO
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

    // O useEffect [isSuccess] deve chamar onClose
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  // --- [CORREÇÃO] Teste de Validação (DSpP 2.16) ---

  it('deve mostrar mensagens de erro de validação (DSpP 2.16) ao submeter vazio', async () => {
    renderComponent({ editingAppointment: null });

    // Encontra o botão de submissão
    const submitButton = screen.getByRole('button', {
      name: 'Criar Agendamento',
    });

    // Clica sem preencher nada
    fireEvent.click(submitButton);

    // Aguarda as mensagens de erro aparecerem (zodResolver é assíncrono)
    await waitFor(() => {
      // Verifica se a mutação NÃO foi chamada
      expect(mockAddMutate).not.toHaveBeenCalled();

      // Os campos client_id, professional_id, e service_id são `undefined`
      // por padrão (conforme `defaultFormValues`), e o schema Zod (z.number())
      // irá falhar com a mensagem padrão "Required".
      const errorMessages = screen.getAllByText('Required');

      // Esperamos 3 mensagens "Required":
      // 1. client_id
      // 2. professional_id
      // 3. service_id
      // (price e appointment_date têm valores padrão válidos que passam na validação inicial)
      expect(errorMessages).toHaveLength(3);
    });
  });
});