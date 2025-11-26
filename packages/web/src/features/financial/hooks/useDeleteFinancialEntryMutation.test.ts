import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDeleteFinancialEntryMutation } from './useDeleteFinancialEntryMutation';
import { api } from '@/packages/web/src/lib/api';
import { useQueryClient } from '@tanstack/react-query';

// 1. Mock do módulo de API (Hono RPC)
// Simulamos a estrutura aninhada api.financial[':id'].$delete
vi.mock('@/packages/web/src/lib/api', () => ({
  api: {
    financial: {
      ':id': {
        $delete: vi.fn(),
      },
    },
  },
}));

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
  const mockInvalidateQueries = vi.fn();
  // Cast para acessar o mock da função delete
  const mockDelete = api.financial[':id'].$delete as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    (useQueryClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      invalidateQueries: mockInvalidateQueries,
    });
  });

  it('deve chamar a API corretamente e invalidar o cache em caso de sucesso', async () => {
    // Configura o mock para retornar sucesso
    mockDelete.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    const { result } = renderHook(() => useDeleteFinancialEntryMutation());

    const entryId = 123;

    // Executa a mutação
    await result.current.mutateAsync(entryId);

    // Verifica se a API foi chamada com o parâmetro correto (ID como string)
    expect(mockDelete).toHaveBeenCalledWith({
      param: { id: '123' },
    });

    // Verifica se o cache foi invalidado
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['financialEntries'],
    });
  });

  it('deve lançar um erro se a resposta da API não for ok', async () => {
    // Configura o mock para simular erro
    mockDelete.mockResolvedValue({
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