import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDeleteFinancialEntryMutation } from './useDeleteFinancialEntryMutation';
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

describe('useDeleteFinancialEntryMutation', () => {
  const mockApi = {
    financial: {
      ':id': {
        $delete: vi.fn(),
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
    mockApi.financial[':id'].$delete.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    const { result } = renderHook(() => useDeleteFinancialEntryMutation());

    const entryId = 123;

    // Executa a mutação
    await result.current.mutateAsync(entryId);

    // Verifica se a API foi chamada com o parâmetro correto (ID como string)
    expect(mockApi.financial[':id'].$delete).toHaveBeenCalledWith({
      param: { id: '123' },
    });

    // Verifica se o cache foi invalidado
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['financialEntries'],
    });
  });

  it('deve lançar um erro se a resposta da API não for ok', async () => {
    // Configura o mock para simular erro
    mockApi.financial[':id'].$delete.mockResolvedValue({
      ok: false,
    });

    const { result } = renderHook(() => useDeleteFinancialEntryMutation());

    // Espera que a promessa seja rejeitada
    await expect(result.current.mutateAsync(999)).rejects.toThrow(
      'Falha ao excluir lançamento financeiro'
    );

    // Verifica que invalidateQueries NÃO foi chamado em caso de erro
    expect(mockInvalidateQueries).not.toHaveBeenCalled();
  });
});