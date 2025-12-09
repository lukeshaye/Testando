import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useTodayAppointmentsQuery } from './useTodayAppointmentsQuery';
// 1. Troca da importação estática pelo hook autenticado
import { useAuthenticatedApi } from '@/hooks/useAuthenticatedApi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// 2. Mock do novo hook
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

describe('useTodayAppointmentsQuery', () => {
  const mockDate = new Date('2023-10-25T10:00:00.000Z');
  // Criamos uma função mock para interceptar as chamadas do método $get
  const mockGet = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Congela o tempo para garantir que o new Date().toISOString() seja previsível
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);

    // 3. Configuração do mock do useAuthenticatedApi para retornar a estrutura correta
    (useAuthenticatedApi as any).mockReturnValue({
      api: {
        appointments: {
          $get: mockGet,
        },
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('deve buscar os agendamentos do dia com sucesso', async () => {
    const mockAppointments = [
      { id: '1', clientName: 'Alice', status: 'CONFIRMED', time: '10:00' },
      { id: '2', clientName: 'Bob', status: 'PENDING', time: '11:00' },
    ];

    // Configura o retorno da função mockada ($get)
    mockGet.mockResolvedValue({
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

    // Verifica se a função mockada foi chamada com a data correta
    expect(mockGet).toHaveBeenCalledWith({
      query: {
        date: mockDate.toISOString(),
      },
    });
  });

  it('deve lançar erro ao falhar na busca', async () => {
    // Configura o retorno de erro
    mockGet.mockResolvedValue({
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