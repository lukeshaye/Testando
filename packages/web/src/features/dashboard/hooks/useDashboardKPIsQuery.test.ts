import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDashboardKPIsQuery } from './useDashboardKPIsQuery';
// Correção: Importamos a api real para que o vi.mock a substitua corretamente
import { api } from '@/lib/api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// Correção: Definimos a função de mock fora do escopo para ser acessível nos testes
const mockGetStats = vi.fn();

// Correção: Mock do módulo @/lib/api (Princípio 2.9 - Inversão de Dependência aplicada a testes)
vi.mock('@/lib/api', () => ({
  api: {
    dashboard: {
      stats: {
        $get: mockGetStats,
      },
    },
  },
}));

// Wrapper para o React Query (Princípio 2.12/2.13 - Suporte a Server State)
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Importante para testes falharem rápido
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

    // Mock da resposta de sucesso simulando a estrutura do Hono/RPC
    mockGetStats.mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    const { result } = renderHook(() => useDashboardKPIsQuery(), {
      wrapper: createWrapper(),
    });

    // Verifica estado de loading inicial
    expect(result.current.isLoading).toBe(true);

    // Aguarda o sucesso (Princípio 2.15 - Provar a corretude)
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