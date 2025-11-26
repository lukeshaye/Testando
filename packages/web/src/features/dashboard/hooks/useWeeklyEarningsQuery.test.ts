import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useWeeklyEarningsQuery } from './useWeeklyEarningsQuery';
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

describe('useWeeklyEarningsQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve retornar os dados do gráfico com sucesso', async () => {
    const mockChartData = [
      { date: '2023-10-01', amount: 500 },
      { date: '2023-10-02', amount: 750 },
    ];

    // Mock da resposta de sucesso
    (api.dashboard.chart.$get as any).mockResolvedValue({
      ok: true,
      json: async () => mockChartData,
    });

    const { result } = renderHook(() => useWeeklyEarningsQuery(), {
      wrapper: createWrapper(),
    });

    // Verifica estado de loading
    expect(result.current.isLoading).toBe(true);

    // Aguarda sucesso
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Verifica os dados
    expect(result.current.data).toEqual(mockChartData);
    expect(api.dashboard.chart.$get).toHaveBeenCalledTimes(1);
  });

  it('deve lançar erro ao falhar na busca', async () => {
    // Mock da resposta de erro
    (api.dashboard.chart.$get as any).mockResolvedValue({
      ok: false,
    });

    const { result } = renderHook(() => useWeeklyEarningsQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
    expect(result.current.error?.message).toBe('Failed to fetch dashboard chart data');
  });
});