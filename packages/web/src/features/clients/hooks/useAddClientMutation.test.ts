// /packages/web/src/features/clients/hooks/useAddClientMutation.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
// REMOVIDO: import { api } from '@/packages/web/src/lib/api';
// ADICIONADO:
import { useAuthenticatedApi } from '@/hooks/useAuthenticatedApi';
import { toast } from 'sonner';
import { useAddClientMutation } from './useAddClientMutation';
import type { CreateClientSchema } from '@/packages/shared-types';

// Mockar dependências externas (DIP 2.9)
// REMOVIDO: vi.mock('@/packages/web/src/lib/api');
// ADICIONADO:
vi.mock('@/hooks/useAuthenticatedApi');
vi.mock('sonner');

// Dados de teste
const newClientData: CreateClientSchema = {
  name: 'Novo Cliente',
  email: 'novo@cliente.com',
  phone: '11999998888',
  birth_date: '2000-10-10',
  gender: 'Outro',
};

const mockClientResponse = {
  id: '3',
  ...newClientData,
};

// Wrapper helper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  // Espionar a função de invalidação (Plano 4.1.2)
  vi.spyOn(queryClient, 'invalidateQueries');

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return { wrapper, queryClient };
};

describe('useAddClientMutation', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should call api.clients.index.$post with correct data, invalidate queries, and show success toast on success', async () => {
    // Arrange
    const { wrapper, queryClient } = createWrapper();
    
    // Configurar o Mock do RPC
    const mockPost = vi.fn().mockResolvedValue({
      // Simula o retorno de um fetch/RPC que precisa de .json()
      // Ajuste conforme a implementação real do seu hook (se ele já retorna os dados direto ou o response)
      json: async () => mockClientResponse
    });

    (useAuthenticatedApi as any).mockReturnValue({
      api: {
        clients: {
          index: {
            $post: mockPost
          }
        }
      }
    });

    const { result } = renderHook(() => useAddClientMutation(), { wrapper });

    // Act
    result.current.mutate(newClientData);

    // Assert
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // (Plano 4.1.2): Testar se a função RPC foi chamada corretamente
    expect(mockPost).toHaveBeenCalledTimes(1);
    // Em clientes RPC tipados (Hono/tRPC), geralmente envia-se um objeto { json: data }
    expect(mockPost).toHaveBeenCalledWith({ json: newClientData });

    // (Plano 4.1.2): Testar se queryClient.invalidateQueries é chamado no onSuccess
    expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(1);
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['clients'],
    });

    // Testar se o toast de sucesso é chamado
    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith('Cliente adicionado com sucesso!');
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('should show error toast on failure', async () => {
    // Arrange
    const { wrapper } = createWrapper();
    const mockError = new Error('API Error');
    
    // Configurar o Mock do RPC para erro
    const mockPost = vi.fn().mockRejectedValue(mockError);

    (useAuthenticatedApi as any).mockReturnValue({
      api: {
        clients: {
          index: {
            $post: mockPost
          }
        }
      }
    });

    const { result } = renderHook(() => useAddClientMutation(), { wrapper });

    // Act
    result.current.mutate(newClientData);

    // Assert
    await waitFor(() => expect(result.current.isError).toBe(true));

    // Testar se o toast de erro é chamado
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith('Falha ao adicionar cliente.');
    expect(toast.success).not.toHaveBeenCalled();
  });
});