// /packages/web/srcsrc/features/clients/hooks/useUpdateClientMutation.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { api } from '@/packages/web/src/lib/api';
import { toast } from 'sonner';
import { useUpdateClientMutation } from './useUpdateClientMutation';
import type { CreateClientSchema } from '@/packages/shared-types';

// Mockar dependências externas (DIP 2.9)
vi.mock('@/packages/web/src/lib/api');
vi.mock('sonner');

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
const createWrapper = ()_wrapper => {
  const queryClient = new QueryClient();
  // Espionar a função de invalidação (Plano 4.1.3)
  vi.spyOn(queryClient, 'invalidateQueries');

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return { wrapper, queryClient };
};

describe('useUpdateClientMutation', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should call api.put with correct data, invalidate queries, and show success toast on success', async () => {
    // Arrange
    const { wrapper, queryClient } = createWrapper();
    vi.mocked(api.put).mockResolvedValue({ data: mockClientResponse });
    const { result } = renderHook(() => useUpdateClientMutation(), { wrapper });

    // Act
    result.current.mutate(updatePayload);

    // Assert
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // (Plano 4.1.3): Testar se api.put é chamado com o id e data corretos
    expect(api.put).toHaveBeenCalledTimes(1);
    expect(api.put).toHaveBeenCalledWith(
      `/api/clients/${clientId}`,
      updatedClientData,
    );

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
    vi.mocked(api.put).mockRejectedValue(mockError);
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