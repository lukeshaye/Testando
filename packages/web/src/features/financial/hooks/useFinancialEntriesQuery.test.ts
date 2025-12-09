// packages/web/src/features/financial/hooks/useFinancialEntriesQuery.test.ts

import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFinancialEntriesQuery } from './useFinancialEntriesQuery';
import { useAuthenticatedApi } from '@/hooks/useAuthenticatedApi';
import { createWrapper } from '@/test/utils';

// Mock do hook de autenticação conforme o novo padrão
vi.mock('@/hooks/useAuthenticatedApi');

describe('useFinancialEntriesQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch financial entries successfully', async () => {
    // 1. Dados de Mock
    const mockData = [
      { id: '1', amount: 100, type: 'receita', description: 'Venda A' },
      { id: '2', amount: 50, type: 'despesa', description: 'Compra B' },
    ];

    // 2. Configuração do Mock do RPC
    const mockRpcCall = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    // Configura a estrutura do mock para retornar api.financial.$get
    (useAuthenticatedApi as any).mockReturnValue({
      api: {
        financial: {
          $get: mockRpcCall,
        },
      },
    });

    // 3. Execução do Hook
    const { result } = renderHook(() => useFinancialEntriesQuery(), {
      wrapper: createWrapper(),
    });

    // 4. Asserções
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockData);
    expect(mockRpcCall).toHaveBeenCalledTimes(1);
    // Verifica se foi chamado sem filtros iniciais
    expect(mockRpcCall).toHaveBeenCalledWith({ query: undefined });
  });

  it('should apply filters correctly when provided', async () => {
    // 1. Configuração do Mock (retorno vazio para simplificar)
    const mockRpcCall = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    (useAuthenticatedApi as any).mockReturnValue({
      api: {
        financial: {
          $get: mockRpcCall,
        },
      },
    });

    // 2. Definição dos Filtros
    const filters = {
      type: 'receita' as const,
      startDate: '2023-01-01',
      endDate: '2023-01-31',
    };

    // 3. Execução
    const { result } = renderHook(() => useFinancialEntriesQuery(filters), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // 4. Asserção: Verifica se os filtros foram passados na query string do RPC
    expect(mockRpcCall).toHaveBeenCalledWith({
      query: filters,
    });
  });

  it('should handle API errors gracefully', async () => {
    // 1. Configuração do Mock para Erro
    const mockRpcCall = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    (useAuthenticatedApi as any).mockReturnValue({
      api: {
        financial: {
          $get: mockRpcCall,
        },
      },
    });

    // 2. Execução
    const { result } = renderHook(() => useFinancialEntriesQuery(), {
      wrapper: createWrapper(),
    });

    // 3. Asserção de Erro
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
    // A mensagem de erro depende da implementação do seu hook, ajustado para o padrão comum
    expect(result.current.error?.message).toMatch(/failed|error/i);
  });
});