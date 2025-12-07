// packages/web/src/features/clients/hooks/useClientsQuery.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
// 1. Remover importação antiga da api
// import { api } from '@/packages/web/src/lib/api';
import { useClientsQuery } from './useClientsQuery';
import type { ClientType } from '@/packages/shared-types';

// 2. Adicionar importação do hook autenticado e mockar
import { useAuthenticatedApi } from '@/hooks/useAuthenticatedApi';

vi.mock('@/hooks/useAuthenticatedApi');

// Wrapper helper para prover o QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// Dados mockados
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
  // Mock da função de fetch do RPC
  const mockGet = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();

    // 3. Configurar o mock do useAuthenticatedApi com a estrutura RPC
    (useAuthenticatedApi as any).mockReturnValue({
      api: {
        clients: {
          $get: mockGet,
        },
      },
    });
  });

  it('should be in loading state initially', () => {
    // Arrange
    // Simula uma promise pendente ou sucesso (o estado inicial do hook é loading independente da resposta imediata)
    mockGet.mockResolvedValue({
        ok: true,
        json: async () => mockClients
    });
    
    const wrapper = createWrapper();

    // Act
    const { result } = renderHook(() => useClientsQuery(), { wrapper });

    // Assert
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it('should fetch clients, call api.clients.$get, and return data on success', async () => {
    // Arrange
    // Simula resposta de sucesso do RPC (response.ok = true e .json() retorna os dados)
    mockGet.mockResolvedValue({
      ok: true,
      json: async () => mockClients,
    });

    const wrapper = createWrapper();

    // Act
    const { result } = renderHook(() => useClientsQuery(), { wrapper });

    // Assert
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockGet).toHaveBeenCalledTimes(1);
    // No RPC não testamos a URL string ('/api/clients'), pois é implícito na estrutura do objeto
    
    expect(result.current.data).toEqual(mockClients);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  it('should return an error state on fetch failure', async () => {
    // Arrange
    const mockError = new Error('Failed to fetch clients');
    
    // Simula falha na chamada (ex: erro de rede)
    mockGet.mockRejectedValue(mockError);
    
    const wrapper = createWrapper();

    // Act
    const { result } = renderHook(() => useClientsQuery(), { wrapper });

    // Assert
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBe(mockError);
    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isSuccess).toBe(false);
  });
});