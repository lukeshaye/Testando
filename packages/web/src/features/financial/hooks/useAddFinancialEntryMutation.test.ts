// packages/web/src/features/financial/hooks/useAddFinancialEntryMutation.test.ts

import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAddFinancialEntryMutation } from './useAddFinancialEntryMutation';
// Certifique-se que este caminho está correto no seu projeto. 
// Se o alias '@' já aponta para 'src', talvez seja apenas '@/hooks/useAuthenticatedApi'
import { useAuthenticatedApi } from '@/packages/web/src/hooks/useAuthenticatedApi';

// 1. Mock do Hook de API Autenticada (CORRIGIDO)
// A sintaxe correta do vi.mock exige o caminho entre aspas e uma função factory
vi.mock('@/packages/web/src/hooks/useAuthenticatedApi', () => ({
  useAuthenticatedApi: vi.fn(),
}));

describe('useAddFinancialEntryMutation', () => {
  let queryClient: QueryClient;
  
  // Setup do mock da função RPC
  const mockPost = vi.fn();

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();

    // 2. Configuração do Retorno do Mock
    // Recriamos a estrutura exata do Hono RPC: api.financial.$post
    (useAuthenticatedApi as any).mockReturnValue({
      api: {
        financial: {
          $post: mockPost,
        },
      },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('deve chamar a API com os dados corretos e invalidar a query de listagem', async () => {
    // Arrange
    const newEntryData = {
      description: 'Corte de Cabelo',
      amount: 50.00,
      type: 'INCOME',
      date: new Date().toISOString(),
      categoryId: 'some-uuid' // Adicionei campos comuns que costumam ser obrigatórios
    };

    const mockResponseData = { id: '1', ...newEntryData };

    // Simula resposta de sucesso do Hono
    mockPost.mockResolvedValue({
      ok: true,
      json: async () => mockResponseData,
    });

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    // Act
    const { result } = renderHook(() => useAddFinancialEntryMutation(), { wrapper });
    
    await result.current.mutateAsync(newEntryData as any);

    // Assert
    // Verifica se a função de API foi chamada com o JSON correto
    expect(mockPost).toHaveBeenCalledWith({ json: newEntryData });
    
    // Verifica se o cache foi invalidado (CQRS/PGEC)
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['financialEntries'] });
  });

  it('deve lançar um erro se a resposta da API não for ok', async () => {
    // Arrange
    const newEntryData = { description: 'Erro Teste', amount: 0, type: 'EXPENSE' };

    // Simula falha na API
    mockPost.mockResolvedValue({
      ok: false,
      status: 500,
    });

    // Act
    const { result } = renderHook(() => useAddFinancialEntryMutation(), { wrapper });

    // Assert
    await expect(result.current.mutateAsync(newEntryData as any)).rejects.toThrow(
      'Failed to create financial entry'
    );
  });
});