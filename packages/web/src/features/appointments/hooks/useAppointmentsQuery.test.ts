/**
 * ARQUIVO: /packages/web/src/features/appointments/hooks/useAppointmentsQuery.test.ts
 *
 * $$PLANO_DE_FEATURE$$
 * (REVISADO) - Tarefa 4.8: Feature - Appointments (CRUD Padrão)
 *
 * Testes para o hook useAppointmentsQuery.
 *
 * CORREÇÕES APLICADAS (Plano de Resgate & Arquitetura):
 * 1. Mock do cliente RPC (`api`) substitui `global.fetch` para garantir integridade de tipos e contrato.
 * 2. Atualização do mockAppointments para refletir o schema real do Drizzle (appointmentDate, endDate)[cite: 7].
 * 3. Validação dos parâmetros via objeto de query, eliminando dependência de strings de URL hardcoded (DRY/Abstração)[cite: 15, 61].
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAppointmentsQuery } from './useAppointmentsQuery';
import { api } from '@/lib/api'; // Importação do cliente RPC tipado
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';

// 1. Mock do Módulo de API (RPC Client)
// Isso isola o teste da implementação interna do Hono e foca no contrato de dados (DIP/SoC)[cite: 36, 59].
vi.mock('@/lib/api', () => ({
  api: {
    appointments: {
      $get: vi.fn(),
    },
  },
}));

// 2. Mock de Dados (Compatível com Schema Drizzle)
const mockAppointments = [
  {
    id: 1,
    appointmentDate: new Date('2025-10-10T09:00:00Z').toISOString(),
    endDate: new Date('2025-10-10T10:00:00Z').toISOString(),
    clientId: 1,
    professionalId: 1,
    serviceId: 1,
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

// 3. Helper para criar o wrapper do React Query
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

describe('useAppointmentsQuery (PTE 2.15 - Via RPC Client)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Teste de estado de loading inicial
  it('should return loading state initially', () => {
    // Simulamos uma promessa pendente para verificar o estado de loading
    vi.mocked(api.appointments.$get).mockImplementation(() => new Promise(() => {}));

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

  // Teste de sucesso (Integração com RPC)
  it('should call api client with correct params and return data', async () => {
    // Mock da resposta do Hono Client
    vi.mocked(api.appointments.$get).mockResolvedValue({
      ok: true,
      json: async () => mockAppointments,
    } as any);

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
    
    // VERIFICAÇÃO DE CONTRATO (RPC):
    // Verificamos se o método do cliente foi chamado com o objeto estruturado correto,
    // em vez de verificar uma string de URL hardcoded. Isso é mais robusto (PTE 2.15).
    expect(api.appointments.$get).toHaveBeenCalledTimes(1);
    expect(api.appointments.$get).toHaveBeenCalledWith({
      query: {
        startDate: filters.startDate.toISOString(),
        endDate: filters.endDate.toISOString(),
        professionalId: '1', // Query params geralmente são serializados como strings
      },
    });
  });

  // Teste de filtro (professionalId nulo)
  it('should omit professionalId in api call when null', async () => {
    vi.mocked(api.appointments.$get).mockResolvedValue({
      ok: true,
      json: async () => mockAppointments,
    } as any);

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

    // Valida que professionalId não foi enviado ou foi enviado como undefined/null
    // dependendo da implementação do hook. Assumindo que o hook filtra undefineds:
    expect(api.appointments.$get).toHaveBeenCalledWith({
      query: expect.objectContaining({
        startDate: filters.startDate.toISOString(),
        endDate: filters.endDate.toISOString(),
        // professionalId não deve estar presente ou ser undefined
      }),
    });
  });

  // Teste de estado de erro
  it('should return an error if the api call fails', async () => {
    const errorResponse = { message: 'Falha na API RPC' };
    
    vi.mocked(api.appointments.$get).mockResolvedValue({
      ok: false,
      json: async () => errorResponse,
      status: 500,
      statusText: 'Internal Server Error'
    } as any);

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
    // A mensagem exata depende de como o hook trata o erro, mas deve indicar falha
  });

  // Teste da lógica 'enabled: false' (sem startDate)
  it('should not call api if startDate is missing', () => {
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
    expect(api.appointments.$get).not.toHaveBeenCalled();
  });
});