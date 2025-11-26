import { renderHook, waitFor } from '@testing-library/react';
import { useDeleteAppointmentMutation } from '../useDeleteAppointmentMutation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

/**
 * Zombar (mock) do fetch global
 */
const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

/**
 * Zombar (mock) do useToast, pois o hook o utiliza para feedback.
 */
const mockToast = vi.fn();
vi.mock('@/packages/ui/components/ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

/**
 * Wrapper customizado para fornecer o QueryClientProvider ao hook durante os testes.
 * Conforme o Princípio PTE (2.15), testes de hooks que dependem de
 * contexto (como o React Query) precisam ser encapsulados.
 */
const createWrapper = () => {
  // Cria uma nova instância do QueryClient para cada teste, garantindo isolamento
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Desabilita retentativas em testes para falhas mais rápidas
      },
    },
  });

  // O wrapper que será usado pelo renderHook
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return { wrapper, queryClient };
};

/**
 * Limpa os mocks antes de cada teste para garantir que um teste não afete o outro.
 */
beforeEach(() => {
  fetchMock.mockClear();
  mockToast.mockClear();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('useDeleteAppointmentMutation (PTE 2.15)', () => {
  /**
   * Teste de Sucesso:
   * Verifica se a mutação chama o fetch corretamente (DELETE),
   * invalida o cache (PGEC 2.13) e exibe o toast de sucesso.
   */
  it('deve excluir um agendamento, invalidar o cache e mostrar toast de sucesso', async () => {
    const { wrapper, queryClient } = createWrapper();

    // Espiona o método invalidateQueries para verificar a conformidade com PGEC (2.13)
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    // Configura o mock do fetch para simular uma resposta de sucesso (DELETE 204)
    fetchMock.mockResolvedValue({
      ok: true,
      // Resposta 204 (No Content) não precisa de .json()
    });

    // Renderiza o hook com o wrapper
    const { result } = renderHook(() => useDeleteAppointmentMutation(), {
      wrapper,
    });

    // Executa a mutação
    const appointmentId = 123;
    result.current.mutate(appointmentId);

    // Aguarda a mutação ser concluída (isSuccess === true)
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // 1. Verifica se o fetch foi chamado com os parâmetros corretos
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/appointments/${appointmentId}`,
      {
        method: 'DELETE',
      },
    );

    // 2. Verifica Princípio PGEC (2.13): O cache de 'appointments' foi invalidado?
    expect(invalidateQueriesSpy).toHaveBeenCalledTimes(1);
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['appointments'],
    });

    // 3. Verifica se o toast de sucesso foi exibido
    expect(mockToast).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Sucesso',
        description: 'Agendamento excluído com sucesso.',
      }),
    );
  });

  /**
   * Teste de Falha (Erro de API):
   * Verifica se, em caso de falha da API (response.ok === false),
   * a mutação trata o erro, não invalida o cache e exibe o toast de erro.
   */
  it('deve falhar ao excluir, não invalidar o cache e mostrar toast de erro (Erro API)', async () => {
    const { wrapper, queryClient } = createWrapper();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const errorMessage = 'Ocorreu um erro na API.';

    // Configura o mock do fetch para simular uma resposta de erro da API
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ message: errorMessage }),
    });

    const { result } = renderHook(() => useDeleteAppointmentMutation(), {
      wrapper,
    });

    // Executa a mutação
    result.current.mutate(456);

    // Aguarda a mutação falhar (isError === true)
    await waitFor(() => expect(result.current.isError).toBe(true));

    // 1. Verifica se o estado de erro do hook contém a mensagem correta
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe(errorMessage);

    // 2. Verifica se o cache NÃO foi invalidado
    expect(invalidateQueriesSpy).not.toHaveBeenCalled();

    // 3. Verifica se o toast de erro foi exibido com a mensagem da API
    expect(mockToast).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      }),
    );
  });

  /**
   * Teste de Falha (Erro de Rede):
   * Verifica o comportamento quando o fetch em si falha (ex: rede offline).
   */
  it('deve falhar ao excluir e mostrar toast de erro (Erro de Rede)', async () => {
    const { wrapper } = createWrapper();
    const networkErrorMessage = 'Falha na rede';

    // Configura o mock do fetch para rejeitar (simulando falha de rede)
    fetchMock.mockRejectedValue(new Error(networkErrorMessage));

    const { result } = renderHook(() => useDeleteAppointmentMutation(), {
      wrapper,
    });

    result.current.mutate(789);

    // Aguarda a mutação falhar
    await waitFor(() => expect(result.current.isError).toBe(true));

    // 1. Verifica o estado de erro
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe(networkErrorMessage);

    // 2. Verifica o toast de erro
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Erro',
        description: networkErrorMessage,
        variant: 'destructive',
      }),
    );
  });
});