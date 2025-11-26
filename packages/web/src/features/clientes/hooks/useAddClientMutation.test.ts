// /packages/web/src/features/clients/hooks/useAddClientMutation.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { api } from '@/packages/web/src/lib/api';
import { toast } from 'sonner';
import { useAddClientMutation } from './useAddClientMutation';
import type { CreateClientSchema } from '@/packages/shared-types';

// Mockar dependências externas (DIP 2.9)
vi.mock('@/packages/web/src/lib/api');
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
const createWrapper = ()_wrapper => {
  const queryClient = new QueryClient();
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

  it('should call api.post with correct data, invalidate queries, and show success toast on success', async () => {
    // Arrange
    const { wrapper, queryClient } = createWrapper();
    vi.mocked(api.post).mockResolvedValue({ data: mockClientResponse });
    const { result } = renderHook(() => useAddClientMutation(), { wrapper });

    // Act
    result.current.mutate(newClientData);

    // Assert
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // (Plano 4.1.2): Testar se api.post é chamado com os dados corretos
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith('/api/clients', newClientData);

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
    vi.mocked(api.post).mockRejectedValue(mockError);
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