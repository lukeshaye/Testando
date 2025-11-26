// /packages/web/src/features/clients/hooks/useClientsQuery.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { api } from '@/packages/web/src/lib/api';
import { useClientsQuery } from './useClientsQuery';
import type { ClientType } from '@/packages/shared-types';

// Mockar o módulo da API conforme Princípio DIP (2.9)
vi.mock('@/packages/web/src/lib/api');

// Wrapper helper para prover o QueryClient (padrão para testes com React Query)
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Desabilitar retentativas nos testes
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// Dados mockados para os testes
const mockClients: ClientType[] = [
  {
    id: '1',
    name: 'Cliente Teste 1',
    email: 'teste1@example.com',
    phone: '123456789',
    birth_date: '1990-01-01',
    gender: 'Masculino',
  },
  {
    id: '2',
    name: 'Cliente Teste 2',
    email: 'teste2@example.com',
    phone: '987654321',
    birth_date: '1995-05-05',
    gender: 'Feminino',
  },
];

describe('useClientsQuery', () => {
  beforeEach(() => {
    // Resetar mocks antes de cada teste
    vi.resetAllMocks();
  });

  it('should be in loading state initially', () => {
    // Arrange
    vi.mocked(api.get).mockResolvedValue({ data: mockClients });
    const wrapper = createWrapper();

    // Act
    const { result } = renderHook(() => useClientsQuery(), { wrapper });

    // Assert (Plano 4.1.1: Testar estado isLoading)
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it('should fetch clients, call api.get, and return data on success', async () => {
    // Arrange
    vi.mocked(api.get).mockResolvedValue({ data: mockClients });
    const wrapper = createWrapper();

    // Act
    const { result } = renderHook(() => useClientsQuery(), { wrapper });

    // Assert (Plano 4.1.1: Testar estados data, isLoading)
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Assert (Plano 4.1.1: Testar se o hook chama api.get('/api/clients'))
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith('/api/clients');

    expect(result.current.data).toEqual(mockClients);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  it('should return an error state on fetch failure', async () => {
    // Arrange
    const mockError = new Error('Failed to fetch clients');
    vi.mocked(api.get).mockRejectedValue(mockError);
    const wrapper = createWrapper();

    // Act
    const { result } = renderHook(() => useClientsQuery(), { wrapper });

    // Assert (Plano 4.1.1: Testar estado isError)
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBe(mockError);
    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isSuccess).toBe(false);
  });
});