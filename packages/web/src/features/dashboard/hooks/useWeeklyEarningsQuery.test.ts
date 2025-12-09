import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useWeeklyEarningsQuery } from './useWeeklyEarningsQuery';
import { useAuthenticatedApi } from '@/hooks/useAuthenticatedApi'; // 1. Nova importação
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// 2. Mock do hook de autenticação
vi.mock('@/hooks/useAuthenticatedApi');

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
  // Criamos uma função mockada para controlar o método específico que o hook chama
  const mockGet = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // 3. Configuramos o retorno do useAuthenticatedApi para corresponder à estrutura
    // que o useWeeklyEarningsQuery espera (api.dashboard.chart.$get)
    (useAuthenticatedApi as any).mockReturnValue({
      api: {
        dashboard: {
          chart: { $get: mockGet },
        },
      },
    });
  });

  it('deve retornar os dados do gráfico com sucesso', async () => {
    const mockChartData = [
      { date: '2023-10-01', amount: 500 },
      { date: '2023-10-02', amount: 750 },
    ];

    // Mock da resposta de sucesso usando nossa função local
    mockGet.mockResolvedValue({
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
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it('deve lançar erro ao falhar na busca', async () => {
    // Mock da resposta de erro
    mockGet.mockResolvedValue({
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