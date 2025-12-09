import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDashboardKPIsQuery } from './useDashboardKPIsQuery';
// 1. Substituição da importação da API pelo hook autenticado
import { useAuthenticatedApi } from '@/hooks/useAuthenticatedApi';
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

describe('useDashboardKPIsQuery', () => {
  // Criamos o mock da função específica que será chamada
  const mockGetStats = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // 3. Configuração do mock para retornar a estrutura da API
    (useAuthenticatedApi as any).mockReturnValue({
      api: {
        dashboard: {
          stats: {
            $get: mockGetStats,
          },
        },
      },
    });
  });

  it('deve retornar os dados de KPI com sucesso', async () => {
    const mockData = {
      dailyEarnings: 1000,
      attendedAppointments: 5,
      averageTicket: 200,
    };

    // Mock da resposta de sucesso usando a função mockada
    mockGetStats.mockResolvedValue({
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

    // Verifica os dados e se a função foi chamada
    expect(result.current.data).toEqual(mockData);
    expect(mockGetStats).toHaveBeenCalledTimes(1);
  });

  it('deve lançar um erro quando a requisição falhar', async () => {
    // Mock da resposta de erro
    mockGetStats.mockResolvedValue({
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