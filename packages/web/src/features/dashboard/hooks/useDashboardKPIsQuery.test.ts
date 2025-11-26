import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDashboardKPIsQuery } from './useDashboardKPIsQuery';
import { api } from '@/packages/web/src/lib/api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// Mock do cliente API com estrutura completa conforme Módulo 5.1
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

describe('useDashboardKPIsQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve retornar os dados de KPI com sucesso', async () => {
    const mockData = {
      dailyEarnings: 1000,
      attendedAppointments: 5,
      averageTicket: 200,
    };

    // Mock da resposta de sucesso
    (api.dashboard.stats.$get as any).mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    const { result } = renderHook(() => useDashboardKPIsQuery(), {
      wrapper: createWrapper(),
    });

    // Verifica estado de loading inicial
    expect(result.current.isLoading).toBe(true);

    // Aguarda o sucesso
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Verifica os dados
    expect(result.current.data).toEqual(mockData);
    expect(api.dashboard.stats.$get).toHaveBeenCalledTimes(1);
  });

  it('deve lançar um erro quando a requisição falhar', async () => {
    // Mock da resposta de erro
    (api.dashboard.stats.$get as any).mockResolvedValue({
      ok: false,
    });

    const { result } = renderHook(() => useDashboardKPIsQuery(), {
      wrapper: createWrapper(),
    });

    // Aguarda o erro
    await waitFor(() => expect(result.current.isError).toBe(true));

    // Verifica a mensagem de erro
    expect(result.current.error).toBeDefined();
    expect(result.current.error?.message).toBe('Failed to fetch dashboard KPIs');
  });
});