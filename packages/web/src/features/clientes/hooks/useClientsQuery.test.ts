// /packages/web/src/features/clients/hooks/useClientsQuery.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useAuthenticatedApi } from '@/hooks/useAuthenticatedApi';
import { useClientsQuery } from './useClientsQuery';
import type { ClientType } from '@/packages/shared-types';

// Mockar o hook de autenticação conforme Princípio PTE (2.15)
vi.mock('@/hooks/useAuthenticatedApi');

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
  const mockApi = {
    get: vi.fn(),
  };

  beforeEach(() => {
    // Resetar mocks antes de cada teste
    vi.resetAllMocks();
    // Configurar o mock do hook de autenticação
    (useAuthenticatedApi as any).mockReturnValue(mockApi);
  });

  it('should be in loading state initially', () => {
    // Arrange
    vi.mocked(mockApi.get).mockResolvedValue({ data: mockClients });
    const wrapper = createWrapper();

    // Act
    const { result } = renderHook(() => useClientsQuery(), { wrapper });

    // Assert (Plano 4.1.1: Testar estado isLoading)
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it('should fetch clients, call api.get, and return data on success', async () => {
    // Arrange
    vi.mocked(mockApi.get).mockResolvedValue({ data: mockClients });
    const wrapper = createWrapper();

    // Act
    const { result } = renderHook(() => useClientsQuery(), { wrapper });

    // Assert (Plano 4.1.1: Testar estados data, isLoading)
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Assert (Plano 4.1.1: Testar se o hook chama api.get('/api/clients'))
    expect(mockApi.get).toHaveBeenCalledTimes(1);
    expect(mockApi.get).toHaveBeenCalledWith('/api/clients');

    expect(result.current.data).toEqual(mockClients);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  it('should return an error state on fetch failure', async () => {
    // Arrange
    const mockError = new Error('Failed to fetch clients');
    vi.mocked(mockApi.get).mockRejectedValue(mockError);
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