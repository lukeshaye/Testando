// /packages/web/src/features/appointments/hooks/useAvailableTimeSlots.test.ts

import { renderHook, waitFor } from '@testing-library/react';
import { useAvailableTimeSlots } from '../useAvailableTimeSlots';
import { useAppointmentsQuery } from '../useAppointmentsQuery';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { ProfessionalType, AppointmentType }S from '@/packages/shared-types';

/**
 * Zombar (mock) do hook `useAppointmentsQuery`.
 * Este é um componente central do teste, pois `useAvailableTimeSlots`
 * depende dele para buscar conflitos.
 */
vi.mock('../useAppointmentsQuery', () => ({
  useAppointmentsQuery: vi.fn(),
}));

// Tipagem do mock para facilitar o uso
const mockedUseAppointmentsQuery = vi.mocked(useAppointmentsQuery);

/**
 * Dados de teste
 * Em conformidade com o Princípio PTE (2.15), preparamos mocks
 * robustos para simular diferentes cenários.
 */

// A data para a qual estamos verificando a disponibilidade
const SELECTED_DATE = new Date('2025-11-14T12:00:00.000Z'); // Uma sexta-feira

// O profissional com horários de trabalho e almoço definidos
const MOCK_PROFESSIONAL: ProfessionalType = {
  id: 1,
  name: 'Dr. Teste',
  email: 'dr.teste@example.com',
  phone: '123456789',
  work_start_time: '09:00', // Começa às 9h
  work_end_time: '18:00', // Termina às 18h
  lunch_start_time: '12:00', // Almoço 12h
  lunch_end_time: '13:00', // Fim do almoço 13h
};

// Um agendamento existente que deve bloquear horários
const MOCK_APPOINTMENT: AppointmentType = {
  id: 101,
  client_id: 1,
  professional_id: 1,
  service_id: 1,
  appointment_date: '2025-11-14T14:00:00.000Z', // 14:00
  end_date: '2025-11-14T15:00:00.000Z', // 15:00 (assumindo duração de 60min)
  status: 'confirmed',
  // ...outros campos do tipo
};

// "Congelar" o tempo para testar o filtro "horário já passou"
// Vamos definir o "agora" como 10:30 da manhã do dia selecionado
const FAKE_NOW = new Date('2025-11-14T13:30:00.000Z'); // 10:30 no fuso -03:00

beforeEach(() => {
  // Limpa os mocks antes de cada teste
  mockedUseAppointmentsQuery.mockClear();
  
  // Define a hora do sistema (PTE 2.15)
  // Isso é crucial para testar o Filtro 1 (o slot já passou)
  vi.useFakeTimers();
  vi.setSystemTime(FAKE_NOW);
});

afterEach(() => {
  // Restaura os timers originais
  vi.useRealTimers();
});

// Helper para extrair apenas os 'labels' (ex: "09:30") do resultado do hook
const getLabels = (slots: { label: string; value: Date }[]) =>
  slots.map((s) => s.label);

describe('useAvailableTimeSlots (PTE 2.15)', () => {
  const serviceDuration = 60; // Duração de 1 hora para os testes

  it('deve retornar o estado de carregamento (isLoading) de useAppointmentsQuery', () => {
    // Cenário: A query interna está carregando
    mockedUseAppointmentsQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      // ...outros retornos do useQuery
    } as any);

    const { result } = renderHook(() =>
      useAvailableTimeSlots({
        selectedDate: SELECTED_DATE,
        professional: MOCK_PROFESSIONAL,
        serviceDuration: serviceDuration,
      }),
    );

    // Afirmação: O hook repassa o estado de isLoading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.availableTimeSlots).toEqual([]);
  });

  it('deve retornar um array vazio se nenhum profissional for selecionado', () => {
    // Cenário: Professional é null
    mockedUseAppointmentsQuery.mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    const { result } = renderHook(() =>
      useAvailableTimeSlots({
        selectedDate: SELECTED_DATE,
        professional: null, // Nenhum profissional
        serviceDuration: serviceDuration,
      }),
    );

    // Afirmação: Retorna arrays vazios e não está carregando
    expect(result.current.isLoading).toBe(false);
    expect(result.current.availableTimeSlots).toEqual([]);
    
    // Afirmação: A query interna não deve ser habilitada
    // (Verifica a chamada ao hook mockado)
    expect(mockedUseAppointmentsQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );
  });

  it('deve filtrar horários que já passaram (antes das 10:30)', () => {
    // Cenário: Dia Vazio, sem agendamentos. "Agora" são 10:30 (FAKE_NOW)
    mockedUseAppointmentsQuery.mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    const { result } = renderHook(() =>
      useAvailableTimeSlots({
        selectedDate: SELECTED_DATE,
        professional: MOCK_PROFESSIONAL,
        serviceDuration: 30, // Duração de 30 min para granularidade
      }),
    );
    
    // (Fuso -03:00)
    // "Agora" é 10:30.
    // Slots de 30min: 09:00, 09:30, 10:00 são < 10:30.
    const labels = getLabels(result.current.availableTimeSlots);
    
    expect(labels).not.toContain('09:00');
    expect(labels).not.toContain('09:30');
    expect(labels).not.toContain('10:00'); // 10:00 é antes de 10:30
    expect(labels).toContain('10:30'); // 10:30 é o primeiro slot válido
    expect(labels).toContain('11:00');
  });

  it('deve filtrar horários de almoço (12:00 - 13:00)', () => {
    // Cenário: Dia Vazio, "Agora" são 10:30
    mockedUseAppointmentsQuery.mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    const { result } = renderHook(() =>
      useAvailableTimeSlots({
        selectedDate: SELECTED_DATE,
        professional: MOCK_PROFESSIONAL,
        serviceDuration: 30, // Duração de 30 min
      }),
    );

    const labels = getLabels(result.current.availableTimeSlots);

    // Afirmação: Não deve conter slots que conflitam com 12:00-13:00
    expect(labels).toContain('11:30'); // O último antes do almoço
    expect(labels).not.toContain('12:00');
    expect(labels).not.toContain('12:30');
    expect(labels).toContain('13:00'); // O primeiro depois do almoço
  });

  it('deve filtrar slots que terminam após o fim do expediente (18:00)', () => {
    // Cenário: Dia Vazio, "Agora" são 10:30
    mockedUseAppointmentsQuery.mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    const { result } = renderHook(() =>
      useAvailableTimeSlots({
        selectedDate: SELECTED_DATE,
        professional: MOCK_PROFESSIONAL,
        serviceDuration: 60, // Duração de 1 hora
      }),
    );

    const labels = getLabels(result.current.availableTimeSlots);

    // Afirmação: Com duração de 60min, o último slot é 17:00 (termina 18:00)
    expect(labels).toContain('16:00');
    expect(labels).toContain('17:00'); // 17:00 + 60min = 18:00 (Válido)
    expect(labels).not.toContain('17:30'); // 17:30 + 60min = 18:30 (Inválido)
    expect(labels).not.toContain('18:00');
  });

  it('deve filtrar slots em conflito com agendamentos existentes (14:00 - 15:00)', () => {
    // Cenário: Há um agendamento das 14:00 às 15:00 (MOCK_APPOINTMENT)
    mockedUseAppointmentsQuery.mockReturnValue({
      data: [MOCK_APPOINTMENT],
      isLoading: false,
    } as any);

    const { result } = renderHook(() =>
      useAvailableTimeSlots({
        selectedDate: SELECTED_DATE,
        professional: MOCK_PROFESSIONAL,
        serviceDuration: 60, // Duração de 1 hora
      }),
    );

    const labels = getLabels(result.current.availableTimeSlots);

    // Afirmação: Slots que conflitam com 14:00-15:00 (com duração de 60min)
    expect(labels).toContain('13:00'); // Válido (termina 14:00)
    expect(labels).not.toContain('13:30'); // Inválido (começa 13:30, termina 14:30, conflita)
    expect(labels).not.toContain('14:00'); // Inválido (conflita)
    expect(labels).not.toContain('14:30'); // Inválido (começa 14:30, termina 15:30, conflita)
    expect(labels).toContain('15:00'); // Válido (começa 15:00)
    expect(labels).toContain('16:00');
  });

  it('deve retornar a lista completa de slots válidos (Teste de Integração da Lógica)', () => {
    // Cenário: Integração de todos os filtros.
    // "Agora" = 10:30
    // Almoço = 12:00-13:00
    // Conflito = 14:00-15:00
    // Fim = 18:00
    // Duração = 30 min
    
    mockedUseAppointmentsQuery.mockReturnValue({
      data: [MOCK_APPOINTMENT], // Conflito 14:00-15:00
      isLoading: false,
    } as any);

    const { result } = renderHook(() =>
      useAvailableTimeSlots({
        selectedDate: SELECTED_DATE,
        professional: MOCK_PROFESSIONAL,
        serviceDuration: 30, // Duração de 30 min
      }),
    );
    
    const labels = getLabels(result.current.availableTimeSlots);
    
    const expectedLabels = [
      // Slots da manhã (filtrados por FAKE_NOW às 10:30)
      '10:30', '11:00', '11:30',
      // (Almoço 12:00, 12:30 filtrado)
      // Slots da tarde (filtrados por MOCK_APPOINTMENT 14:00-15:00)
      '13:00', '13:30',
      // (Conflito 14:00, 14:30 filtrado)
      '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
      // (Fim do expediente filtra 18:00)
    ];

    expect(labels).toEqual(expectedLabels);
  });
});