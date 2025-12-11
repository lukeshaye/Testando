/**
 * ARQUIVO: /packages/web/src/features/appointments/hooks/useAppointmentsQuery.test.ts
 *
 * $$PLANO_DE_FEATURE$$
 * (REVISADO) - Tarefa 4.8: Feature - Appointments (CRUD Padrão)
 *
 * Testes para o hook useAppointmentsQuery.
 *
 * CORREÇÕES APLICADAS (Plano de Resgate):
 * 1. Atualização do mockAppointments para refletir o schema real do Drizzle (appointmentDate, endDate)[cite: 7].
 * 2. Inclusão de dados relacionais (client, service) no mock para alinhar com a correção do Backend (Joins)[cite: 12].
 * 3. Manutenção do PTE 2.15: O teste agora prova a corretude baseada no contrato real da API[cite: 101].
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAppointmentsQuery } from './useAppointmentsQuery';
import type { AppointmentType } from '@/packages/shared-types';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';

// 1. Mock de Dados (ATUALIZADO conforme novo Schema e Plano de Correção)
// Nota: Assumindo que AppointmentType em shared-types também será atualizado para refletir estas mudanças.
const mockAppointments = [
  {
    id: 1,
    // CORREÇÃO: 'start' alterado para 'appointmentDate' para coincidir com o Schema Drizzle
    appointmentDate: new Date('2025-10-10T09:00:00Z').toISOString(),
    // CORREÇÃO: 'end' alterado para 'endDate'
    endDate: new Date('2025-10-10T10:00:00Z').toISOString(),
    clientId: 1,
    professionalId: 1,
    serviceId: 1,
    // CORREÇÃO: Adicionados objetos aninhados pois o Backend agora fará LeftJoin (Erro #4 do plano)
    client: { id: 1, name: 'Cliente Teste 1' },
    service: { id: 1, name: 'Serviço Teste 1' },
    notes: 'Teste 1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    appointmentDate: new Date('2025-10-10T11:00:00Z').toISOString(),
    endDate: new Date('2025-10-10T12:00:00Z').toISOString(),
    clientId: 2,
    professionalId: 1,
    serviceId: 2,
    client: { id: 2, name: 'Cliente Teste 2' },
    service: { id: 2, name: 'Serviço Teste 2' },
    notes: 'Teste 2',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// 2. Helper para criar o wrapper do React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// 3. Mock global do fetch
global.fetch = vi.fn();

describe('useAppointmentsQuery (PTE 2.15)', () => {
  beforeEach(() => {
    vi.mocked(global.fetch).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Teste de estado de loading inicial
  it('should return loading state initially', () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => mockAppointments,
    } as Response);

    const filters = {
      startDate: new Date('2025-10-10T00:00:00Z'),
      endDate: new Date('2025-10-10T23:59:59Z'),
      professionalId: 1,
    };

    const wrapper = createWrapper();
    const { result } = renderHook(() => useAppointmentsQuery(filters), {
      wrapper,
    });

    expect(result.current.isLoading).toBe(true);
  });

  // Teste de sucesso (fetch)
  it('should fetch appointments and return data on success', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => mockAppointments,
    } as Response);

    const filters = {
      startDate: new Date('2025-10-10T00:00:00Z'),
      endDate: new Date('2025-10-10T23:59:59Z'),
      professionalId: 1,
    };
    const wrapper = createWrapper();
    const { result } = renderHook(() => useAppointmentsQuery(filters), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockAppointments);
    expect(result.current.isLoading).toBe(false);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    
    // A URL Query String continua usando startDate/endDate para filtros de intervalo (padrão de API),
    // mesmo que o retorno do objeto use appointmentDate/endDate.
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/appointments?startDate=2025-10-10T00%3A00%3A00.000Z&endDate=2025-10-10T23%3A59%3A59.000Z&professionalId=1',
    );
  });

  // Teste de filtro (professionalId nulo)
  it('should format URL correctly when professionalId is null', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => mockAppointments,
    } as Response);

    const filters = {
      startDate: new Date('2025-10-10T00:00:00Z'),
      endDate: new Date('2025-10-10T23:59:59Z'),
      professionalId: null,
    };
    const wrapper = createWrapper();
    const { result } = renderHook(() => useAppointmentsQuery(filters), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const expectedUrl =
      '/api/appointments?startDate=2025-10-10T00%3A00%3A00.000Z&endDate=2025-10-10T23%3A59%3A59.000Z';
    expect(global.fetch).toHaveBeenCalledWith(expectedUrl);
  });

  // Teste de estado de erro
  it('should return an error if the fetch call fails', async () => {
    const errorResponse = { message: 'Falha na API simulada' };
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: async () => errorResponse,
      status: 500,
    } as Response);

    const filters = {
      startDate: new Date('2025-10-10T00:00:00Z'),
      endDate: new Date('2025-10-10T23:59:59Z'),
      professionalId: 1,
    };
    const wrapper = createWrapper();
    const { result } = renderHook(() => useAppointmentsQuery(filters), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error.message).toBe(errorResponse.message);
  });

  // Teste de estado de erro (JSON corrompido)
  it('should return default error message if error response parsing fails', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: async () => {
        throw new Error('JSON parse error');
      },
      status: 500,
    } as Response);

    const filters = {
      startDate: new Date('2025-10-10T00:00:00Z'),
      endDate: new Date('2025-10-10T23:59:59Z'),
      professionalId: 1,
    };
    const wrapper = createWrapper();
    const { result } = renderHook(() => useAppointmentsQuery(filters), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error.message).toBe('Falha ao buscar agendamentos');
  });

  // Teste da lógica 'enabled: false' (sem startDate)
  it('should not fetch if startDate is missing', () => {
    const filters = {
      startDate: null as any,
      endDate: new Date('2025-10-10T23:59:59Z'),
      professionalId: 1,
    };
    const wrapper = createWrapper();
    const { result } = renderHook(() => useAppointmentsQuery(filters), {
      wrapper,
    });

    expect(result.current.isPending).toBe(true);
    expect(result.current.fetchStatus).toBe('idle');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  // Teste da lógica 'enabled: false' (sem endDate)
  it('should not fetch if endDate is missing', () => {
    const filters = {
      startDate: new Date('2025-10-10T00:00:00Z'),
      endDate: null as any,
      professionalId: 1,
    };
    const wrapper = createWrapper();
    const { result } = renderHook(() => useAppointmentsQuery(filters), {
      wrapper,
    });

    expect(result.current.isPending).toBe(true);
    expect(result.current.fetchStatus).toBe('idle');
    expect(global.fetch).not.toHaveBeenCalled();
  });
});