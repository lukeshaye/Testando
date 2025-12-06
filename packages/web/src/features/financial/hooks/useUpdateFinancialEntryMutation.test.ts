import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useUpdateFinancialEntryMutation } from './useUpdateFinancialEntryMutation';
import { useAuthenticatedApi } from '@/hooks/useAuthenticatedApi';
import { useQueryClient } from '@tanstack/react-query';

// 1. Mock do hook de autenticação
vi.mock('@/hooks/useAuthenticatedApi');

// 2. Mock do React Query
// Zombamos o useQueryClient para verificar a invalidação de cache
vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useQueryClient: vi.fn(),
    useMutation: (await importOriginal()).useMutation,
  };
});

describe('useUpdateFinancialEntryMutation', () => {
  const mockApi = {
    financial: {
      ':id': {
        $put: vi.fn(),
      },
    },
  };
  const mockInvalidateQueries = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Configurar o mock do hook de autenticação
    (useAuthenticatedApi as any).mockReturnValue(mockApi);
    (useQueryClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      invalidateQueries: mockInvalidateQueries,
    });
  });

  it('deve chamar a API corretamente e invalidar o cache em caso de sucesso', async () => {
    // Configura o mock para retornar sucesso
    mockApi.financial[':id'].$put.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    const { result } = renderHook(() => useUpdateFinancialEntryMutation());

    const updateData = {
      description: 'Updated Entry',
      amount: 2000,
      type: 'despesa' as const,
      entry_type: 'pontual' as const,
      entry_date: new Date('2023-10-25'),
    };

    // Executa a mutação
    await result.current.mutateAsync({ id: 123, data: updateData });

    // Verifica se a API foi chamada com os parâmetros corretos
    expect(mockApi.financial[':id'].$put).toHaveBeenCalledWith({
      param: { id: '123' }, // O ID deve ser convertido para string
      json: updateData,
    });

    // Verifica se o cache foi invalidado
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['financialEntries'],
    });
  });

  it('deve lançar um erro se a resposta da API não for ok', async () => {
    // Configura o mock para simular erro
    mockApi.financial[':id'].$put.mockResolvedValue({
      ok: false,
    });

    const { result } = renderHook(() => useUpdateFinancialEntryMutation());

    const updateData = {
      description: 'Fail Entry',
      amount: 100,
      type: 'receita' as const,
      entry_type: 'pontual' as const,
      entry_date: new Date(),
    };

    // Espera que a promessa seja rejeitada
    await expect(
      result.current.mutateAsync({ id: 999, data: updateData })
    ).rejects.toThrow('Falha ao atualizar lançamento financeiro');

    // Verifica que invalidateQueries NÃO foi chamado em caso de erro
    expect(mockInvalidateQueries).not.toHaveBeenCalled();
  });
});