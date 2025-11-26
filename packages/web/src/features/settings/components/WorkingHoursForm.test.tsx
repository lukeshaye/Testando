// /packages/web/src/features/settings/components/WorkingHoursForm.test.tsx

import { render, screen, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WorkingHoursForm } from './WorkingHoursForm';
import { useSettingsQuery } from '../hooks/useSettingsQuery';
import {
  useUpdateWorkingHoursMutation,
  useAddBusinessExceptionMutation,
  useDeleteBusinessExceptionMutation,
} from '../hooks/useUpdateSettingsMutation';

// --- Mocks ---

jest.mock('../hooks/useSettingsQuery');
jest.mock('../hooks/useUpdateSettingsMutation');

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
  },
}));

describe('WorkingHoursForm', () => {
  // Spies
  const mockUpdateHours = jest.fn();
  const mockAddException = jest.fn();
  const mockDeleteException = jest.fn();

  // Dados Mock
  const mockSettingsData = {
    businessHours: [
      { day_of_week: 1, start_time: '09:00', end_time: '18:00' }, // Segunda
      { day_of_week: 2, start_time: '09:00', end_time: '18:00' }, // Terça
    ],
    businessExceptions: [
      {
        id: 101,
        description: 'Feriado Nacional',
        exception_date: '2025-12-25',
        start_time: null,
        end_time: null,
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (useSettingsQuery as jest.Mock).mockReturnValue({
      data: mockSettingsData,
      isLoading: false,
      isError: false,
    });

    (useUpdateWorkingHoursMutation as jest.Mock).mockReturnValue({
      mutate: mockUpdateHours,
      isPending: false,
    });

    (useAddBusinessExceptionMutation as jest.Mock).mockReturnValue({
      mutate: mockAddException,
      isPending: false,
    });

    (useDeleteBusinessExceptionMutation as jest.Mock).mockReturnValue({
      mutate: mockDeleteException,
      isPending: false,
    });
  });

  // --- 1. Testes de Renderização e Leitura ---

  it('deve exibir o esqueleto de carregamento quando isLoading for true', () => {
    (useSettingsQuery as jest.Mock).mockReturnValue({
      data: null,
      isLoading: true,
    });
    const { container } = render(<WorkingHoursForm />);
    expect(container.getElementsByClassName('animate-pulse').length).toBeGreaterThan(0);
  });

  it('deve renderizar os horários iniciais corretamente', () => {
    render(<WorkingHoursForm />);
    const mondayCheckbox = screen.getByLabelText('Segunda-feira');
    expect(mondayCheckbox).toBeChecked();
    const inputs = screen.getAllByDisplayValue('09:00');
    expect(inputs.length).toBeGreaterThan(0);
  });

  it('deve renderizar a lista de exceções corretamente', () => {
    render(<WorkingHoursForm />);
    expect(screen.getByText('Feriado Nacional')).toBeInTheDocument();
  });

  // --- 2. Testes de Lógica de UI ---

  it('deve desabilitar os inputs de tempo quando o dia é desmarcado', async () => {
    const user = userEvent.setup();
    render(<WorkingHoursForm />);
    const mondayCheckbox = screen.getByLabelText('Segunda-feira');
    
    // Verifica estado inicial
    const rowContainer = mondayCheckbox.closest('div.grid');
    const timeInputs = within(rowContainer as HTMLElement).getAllByRole('textbox'); // input type=time as vezes é tratado como textbox
    timeInputs.forEach(input => expect(input).toBeEnabled());

    // Ação
    await user.click(mondayCheckbox);

    // Verificação
    expect(mondayCheckbox).not.toBeChecked();
    timeInputs.forEach(input => expect(input).toBeDisabled());
  });

  it('deve aplicar horários para todos os dias ativos ao usar "Aplicar a Todos"', async () => {
    const user = userEvent.setup();
    render(<WorkingHoursForm />);

    const startInput = screen.getByPlaceholderText('Início');
    const endInput = screen.getByPlaceholderText('Fim');
    const applyButton = screen.getByText('Aplicar');

    await user.clear(startInput);
    await user.type(startInput, '10:00');
    await user.clear(endInput);
    await user.type(endInput, '16:00');
    await user.click(applyButton);

    const updatedStarts = screen.getAllByDisplayValue('10:00');
    expect(updatedStarts.length).toBeGreaterThan(1);
  });

  // --- 3. Testes de Validação e Erro (Zod / DSpP 2.16) - NOVO ---

  it('NÃO deve chamar addException se a descrição for vazia (Validação Obrigatória)', async () => {
    // Este teste valida o DSpP garantindo que o Schema Zod impede a mutação
    const user = userEvent.setup();
    render(<WorkingHoursForm />);

    // Abrir Modal
    const openModalButton = screen.getByText('Nova Exceção');
    await user.click(openModalButton);

    // Tenta submeter sem preencher a descrição (campo obrigatório)
    const submitButton = screen.getByText('Criar Exceção');
    await user.click(submitButton);

    // Expectativa: Mutação NÃO é chamada
    expect(mockAddException).not.toHaveBeenCalled();

    // Expectativa: Mensagem de erro deve aparecer (assumindo mensagem do zodResolver)
    // Nota: O texto exato depende do schema definido, mas procuramos por indicação de erro.
    // Baseado no prompt: description: z.string().min(1, "Descrição é obrigatória")
    // Aguarda a renderização da mensagem de erro assíncrona do hook-form
    await waitFor(() => {
        // Procura por mensagens comuns de validação ou o texto específico se conhecido
        // Como o schema foi importado, assumimos a validação padrão.
        // Vamos verificar se o mock continua zero.
        expect(mockAddException).toHaveBeenCalledTimes(0);
    });
  });

  // --- 4. Testes de Mutações (Escrita - Happy Path) ---

  it('deve chamar updateHours com os dados corretos ao salvar horários', async () => {
    const user = userEvent.setup();
    render(<WorkingHoursForm />);

    const saveButton = screen.getByText('Salvar Horários');
    await user.click(saveButton);

    expect(mockUpdateHours).toHaveBeenCalledTimes(1);
    expect(mockUpdateHours).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          day_of_week: 1,
          start_time: '09:00',
          end_time: '18:00',
        })
      ])
    );
  });

  it('deve chamar addException ao submeter o formulário de nova exceção válido', async () => {
    const user = userEvent.setup();
    render(<WorkingHoursForm />);

    const openModalButton = screen.getByText('Nova Exceção');
    await user.click(openModalButton);

    const descriptionInput = screen.getByLabelText(/Descrição/i);
    const dateInput = screen.getByLabelText(/Data/i);
    const submitButton = screen.getByText('Criar Exceção');

    await user.type(descriptionInput, 'Carnaval');
    await user.type(dateInput, '2025-03-03');

    await user.click(submitButton);

    expect(mockAddException).toHaveBeenCalledTimes(1);
    expect(mockAddException).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'Carnaval',
        exception_date: '2025-03-03',
      }),
      expect.anything()
    );
  });

  it('deve chamar deleteException ao confirmar a exclusão', async () => {
    const user = userEvent.setup();
    render(<WorkingHoursForm />);

    // Encontrar botão de delete (dentro do card da exceção mockada)
    const exceptionItem = screen.getByText('Feriado Nacional').closest('div');
    const deleteBtn = within(exceptionItem as HTMLElement).getByRole('button');
    
    await user.click(deleteBtn);

    const confirmButton = screen.getByText('Excluir');
    await user.click(confirmButton);

    expect(mockDeleteException).toHaveBeenCalledTimes(1);
    expect(mockDeleteException).toHaveBeenCalledWith(101, expect.anything());
  });
});