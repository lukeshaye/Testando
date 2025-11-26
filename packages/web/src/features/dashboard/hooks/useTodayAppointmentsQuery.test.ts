import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useTodayAppointmentsQuery } from './useTodayAppointmentsQuery';
import { api } from '@/packages/web/src/lib/api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// Mock do cliente API com estrutura completa
vi.mock('@/packages/web/src/lib/api', () => ({
  api: {
    dashboard: {
      stats: { $get: vi.fn() },
      chart: { $get: vi.fn() },
    },
    appointments: { $get: vi.fn() },
  },
}));

// Wrapper para o React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useTodayAppointmentsQuery', () => {
  const mockDate = new Date('2023-10-25T10:00:00.000Z');

  beforeEach(() => {
    vi.clearAllMocks();
    // Congela o tempo para garantir que o new Date().toISOString() seja previsível
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('deve buscar os agendamentos do dia com sucesso', async () => {
    const mockAppointments = [
      { id: '1', clientName: 'Alice', status: 'CONFIRMED', time: '10:00' },
      { id: '2', clientName: 'Bob', status: 'PENDING', time: '11:00' },
    ];

    // Mock da resposta de sucesso
    (api.appointments.$get as any).mockResolvedValue({
      ok: true,
      json: async () => mockAppointments,
    });

    const { result } = renderHook(() => useTodayAppointmentsQuery(), {
      wrapper: createWrapper(),
    });

    // Verifica estado de loading
    expect(result.current.isLoading).toBe(true);

    // Aguarda sucesso
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Verifica os dados
    expect(result.current.data).toEqual(mockAppointments);

    // Verifica se a API foi chamada com a data correta (ISO string do mockDate)
    expect(api.appointments.$get).toHaveBeenCalledWith({
      query: {
        date: mockDate.toISOString(),
      },
    });
  });

  it('deve lançar erro ao falhar na busca', async () => {
    // Mock da resposta de erro
    (api.appointments.$get as any).mockResolvedValue({
      ok: false,
    });

    const { result } = renderHook(() => useTodayAppointmentsQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
    expect(result.current.error?.message).toBe("Failed to fetch today's appointments");
  });
});