// packages/web/src/features/clients/hooks/useUpdateClientMutation.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
// 1. Remover importação antiga
// import { api } from '@/packages/web/src/lib/api';
import { toast } from 'sonner';
import { useUpdateClientMutation } from './useUpdateClientMutation';
import type { CreateClientSchema } from '@/packages/shared-types';

// 2. Adicionar importação nova
import { useAuthenticatedApi } from '@/hooks/useAuthenticatedApi';

// 3. Mockar dependências externas
// vi.mock('@/packages/web/src/lib/api'); // Remover mock antigo
vi.mock('sonner');
vi.mock('@/hooks/useAuthenticatedApi'); // Adicionar mock novo

// Dados de teste
const clientId = '1';
const updatedClientData: CreateClientSchema = {
  name: 'Cliente Atualizado',
  email: 'atualizado@cliente.com',
  phone: '11222223333',
  birth_date: '1990-01-01',
  gender: 'Masculino',
};

const updatePayload = { id: clientId, data: updatedClientData };

const mockClientResponse = {
  id: clientId,
  ...updatedClientData,
};

// Wrapper helper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  vi.spyOn(queryClient, 'invalidateQueries');

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return { wrapper, queryClient };
};

describe('useUpdateClientMutation', () => {
  // Definir o mock da função RPC
  const mockPut = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();

    // 4. Configurar o retorno do hook useAuthenticatedApi
    (useAuthenticatedApi as any).mockReturnValue({
      api: {
        clients: {
          ':id': {
            $put: mockPut,
          },
        },
      },
    });
  });

  it('should call api.put with correct data, invalidate queries, and show success toast on success', async () => {
    // Arrange
    const { wrapper, queryClient } = createWrapper();

    // Configurar sucesso do mock RPC
    // O cliente Hono geralmente retorna um objeto que contém .json()
    mockPut.mockResolvedValue({
      ok: true,
      json: async () => mockClientResponse,
    });

    const { result } = renderHook(() => useUpdateClientMutation(), { wrapper });

    // Act
    result.current.mutate(updatePayload);

    // Assert
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Verificar se o mock foi chamado corretamente
    // Nota: Em RPC, os parâmetros de rota e body vão em um objeto
    expect(mockPut).toHaveBeenCalledTimes(1);
    expect(mockPut).toHaveBeenCalledWith({
      param: { id: clientId },
      json: updatedClientData,
    });

    // Testar se queryClient.invalidateQueries é chamado
    expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(1);
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['clients'],
    });

    // Testar se o toast de sucesso é chamado
    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith('Cliente atualizado com sucesso!');
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('should show error toast on failure', async () => {
    // Arrange
    const { wrapper } = createWrapper();
    const mockError = new Error('API Error');

    // Configurar erro do mock
    mockPut.mockRejectedValue(mockError);

    const { result } = renderHook(() => useUpdateClientMutation(), { wrapper });

    // Act
    result.current.mutate(updatePayload);

    // Assert
    await waitFor(() => expect(result.current.isError).toBe(true));

    // Testar se o toast de erro é chamado
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith('Falha ao atualizar cliente.');
    expect(toast.success).not.toHaveBeenCalled();
  });
});