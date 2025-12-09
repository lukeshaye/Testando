// /packages/web/src/features/settings/hooks/useSettingsQuery.test.ts

import { renderHook, waitFor } from '@testing-library/react';
import { useSettingsQuery } from './useSettingsQuery';
// import { api } from '@/lib/api'; // REMOVIDO
import { useAuthenticatedApi } from '@/hooks/useAuthenticatedApi'; // ADICIONADO
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// --- Mocks ---

// Mock do novo hook de autenticação
jest.mock('@/hooks/useAuthenticatedApi');

// Helper: Wrapper para fornecer o QueryClient nos testes
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Importante: Desativa retentativas para que o teste de erro não faça timeout
      },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useSettingsQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --- Teste de Sucesso (Happy Path) ---
  it('deve retornar os dados de configurações quando a API responder com sucesso', async () => {
    // Dados de exemplo que a API retornaria
    const mockData = {
      profile: {
        name: 'Empresa Teste',
        phone: '(00) 1234-5678',
        address: 'Rua Teste, 100',
      },
      businessHours: [
        { day_of_week: 1, is_active: true, start_time: '08:00', end_time: '18:00' }
      ],
      businessExceptions: [],
    };

    // Cria o mock da função de chamada ($get)
    const mockGet = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    // Configura o hook useAuthenticatedApi para retornar a estrutura correta
    (useAuthenticatedApi as jest.Mock).mockReturnValue({
      api: {
        settings: {
          $get: mockGet
        }
      }
    });

    // Renderiza o hook dentro do wrapper
    const { result } = renderHook(() => useSettingsQuery(), {
      wrapper: createWrapper(),
    });

    // 1. Verifica estado inicial de loading
    expect(result.current.isLoading).toBe(true);

    // 2. Aguarda até que a query tenha sucesso
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // 3. Verifica se os dados batem com o mock
    expect(result.current.data).toEqual(mockData);
    
    // 4. Verifica se a API foi chamada
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  // --- Teste de Erro (Error Handling) ---
  it('deve retornar erro quando a chamada da API falhar', async () => {
    const error = new Error('Falha no servidor');
    
    // Configura o mock para rejeitar a promessa (erro de rede ou exceção)
    const mockGet = jest.fn().mockRejectedValue(error);

    (useAuthenticatedApi as jest.Mock).mockReturnValue({
      api: {
        settings: {
          $get: mockGet
        }
      }
    });

    const { result } = renderHook(() => useSettingsQuery(), {
      wrapper: createWrapper(),
    });

    // 1. Verifica estado inicial
    expect(result.current.isLoading).toBe(true);

    // 2. Aguarda até que a query entre em estado de erro
    await waitFor(() => expect(result.current.isError).toBe(true));

    // 3. Verifica se o erro foi capturado
    expect(result.current.error).toBeDefined();
    expect(mockGet).toHaveBeenCalledTimes(1);
  });
});