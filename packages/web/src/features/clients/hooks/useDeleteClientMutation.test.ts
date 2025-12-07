// /packages/web/src/features/clients/hooks/useDeleteClientMutation.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
// REFATORADO: Nova importação
import { useAuthenticatedApi } from '@/packages/web/src/hooks/useAuthenticatedApi';
import { toast } from 'sonner';
import { useDeleteClientMutation } from './useDeleteClientMutation';

// REFATORADO: Mock do novo hook
vi.mock('@/packages/web/src/hooks/useAuthenticatedApi');
vi.mock('sonner');

// Dados de teste
const clientId = '123';

// Wrapper helper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  // Espionar a função de invalidação (Plano 4.1.4)
  vi.spyOn(queryClient, 'invalidateQueries');

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return { wrapper, queryClient };
};

describe('useDeleteClientMutation', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should call api.delete with correct id, invalidate queries, and show success toast on success', async () => {
    // Arrange
    const { wrapper, queryClient } = createWrapper();
    
    // REFATORADO: Configuração do Mock RPC para Sucesso
    const mockDelete = vi.fn();
    (useAuthenticatedApi as any).mockReturnValue({
      api: {
        clients: {
          ':id': {
            $delete: mockDelete,
          },
        },
      },
    });

    // Simulando resposta de sucesso do Hono/RPC
    mockDelete.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    const { result } = renderHook(() => useDeleteClientMutation(), { wrapper });

    // Act
    result.current.mutate(clientId);

    // Assert
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // (Plano 4.1.4): Testar se o endpoint correto foi chamado via RPC
    expect(mockDelete).toHaveBeenCalledTimes(1);
    // Verifica se passou o parametro no formato RPC { param: { id: ... } }
    expect(mockDelete).toHaveBeenCalledWith({ param: { id: clientId } });

    // (Plano 4.1.4): Testar se queryClient.invalidateQueries é chamado no onSuccess
    expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(1);
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['clients'],
    });

    // Testar se o toast de sucesso é chamado
    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith('Cliente removido com sucesso!');
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('should show error toast on failure', async () => {
    // Arrange
    const { wrapper, queryClient } = createWrapper();
    
    // REFATORADO: Configuração do Mock RPC para Erro
    const mockDelete = vi.fn();
    (useAuthenticatedApi as any).mockReturnValue({
      api: {
        clients: {
          ':id': {
            $delete: mockDelete,
          },
        },
      },
    });

    const mockError = new Error('API Error');
    mockDelete.mockRejectedValue(mockError);

    const { result } = renderHook(() => useDeleteClientMutation(), { wrapper });

    // Act
    result.current.mutate(clientId);

    // Assert
    await waitFor(() => expect(result.current.isError).toBe(true));

    // Testar se o toast de erro é chamado
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith('Falha ao remover cliente.');

    // Garantir que os side effects de sucesso não ocorreram
    expect(toast.success).not.toHaveBeenCalled();
    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
  });
});