import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDeleteFinancialEntryMutation } from './useDeleteFinancialEntryMutation';
// 1. Nova importação do hook de autenticação
import { useAuthenticatedApi } from '@/hooks/useAuthenticatedApi';
import { useQueryClient } from '@tanstack/react-query';

// 2. Mock do hook useAuthenticatedApi
vi.mock('@/hooks/useAuthenticatedApi');

// 3. Mock do React Query (Mantido igual)
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
  // Criamos o mock da função $delete isoladamente para poder verificar chamadas
  const mockDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Configura o mock do useQueryClient
    (useQueryClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      invalidateQueries: mockInvalidateQueries,
    });

    // 4. Configura o retorno do useAuthenticatedApi
    (useAuthenticatedApi as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      api: {
        financial: {
          ':id': {
            $delete: mockDelete,
          },
        },
      },
    });
  });

  it('deve chamar a API corretamente e invalidar o cache em caso de sucesso', async () => {
    // Configura o retorno de sucesso na função mockada
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
    // Configura o retorno de erro na função mockada
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