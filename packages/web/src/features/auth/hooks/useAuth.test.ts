import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import React, { ReactNode } from 'react';
import { useAuth } from './useAuth';
import { AuthServiceContext } from '../contexts/AuthServiceProvider';
import type { IAuthService, LoginCredentials } from '../services/IAuthService';
import type { Session, User, AuthResponse } from '@supabase/supabase-js';

// --- Mocks ---

// Mock de dados da sessão
const mockUser = { id: '123', email: 'test@example.com' } as User;
const mockSession = {
  access_token: 'abc',
  user: mockUser,
} as Session;
const mockAuthCacheData = { user: mockUser, session: mockSession };

// Mock da implementação do IAuthService (Conforme DIP)
const mockAuthService: IAuthService = {
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
};

// --- Wrapper de Teste ---

// Cria um QueryClient novo para cada teste
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Desabilita retries para testes
      },
    },
  });

// Wrapper que provê o QueryClient e o Serviço mockado
const createWrapper = (
  client: QueryClient,
  service: IAuthService,
) => {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <AuthServiceContext.Provider value={service}>
        {children}
      </AuthServiceContext.Provider>
    </QueryClientProvider>
  );
};

// --- Testes ---

describe('useAuth Hook', () => {
  let queryClient: QueryClient;

  // Reseta os mocks e o queryClient antes de cada teste
  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.resetAllMocks();
  });

  /**
   * Teste 1: Conforme Plano - Testar se o useQuery é chamado.
   * Verifica se o hook busca a sessão inicial (getSession) ao montar.
   */
  it('should fetch the initial session using useQuery on mount', async () => {
    // Configuração: getSession retorna dados mockados
    mockAuthService.getSession.mockResolvedValue(mockAuthCacheData);

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(queryClient, mockAuthService),
    });

    // Estado inicial de loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();

    // Aguarda a query resolver
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Verificação:
    expect(mockAuthService.getSession).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual(mockAuthCacheData);
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.session).toEqual(mockSession);
  });

  /**
   * Teste 2: Conforme Plano - Testar se o onAuthStateChange atualiza o queryClient.
   * Verifica se o listener de auth está configurado e atualiza o cache.
   */
  it('should update query cache when onAuthStateChange fires', async () => {
    // Configuração inicial (sem sessão)
    mockAuthService.getSession.mockResolvedValue({ user: null, session: null });
    
    // Captura o callback passado para o listener
    let authStateCallback: (session: Session | null) => void = () => {};
    mockAuthService.onAuthStateChange.mockImplementation((callback) => {
      authStateCallback = callback;
      return () => {}; // Retorna função de unsubscribe
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(queryClient, mockAuthService),
    });

    // Aguarda a query inicial (usuário deslogado)
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.user).toBeNull();
    expect(mockAuthService.onAuthStateChange).toHaveBeenCalledTimes(1);

    // Simulação: O authService dispara um evento de login
    act(() => {
      authStateCallback(mockSession);
    });

    // Verificação: O cache (e o hook) devem ser atualizados
    await waitFor(() => {
      expect(result.current.data).toEqual(mockAuthCacheData);
      expect(result.current.user).toEqual(mockUser);
    });
  });

  /**
   * Teste 3: Conforme Plano - Testar se loginMutation.mutate chama authService.signInWithPassword.
   * Verifica se a mutação de login chama o serviço e atualiza o cache.
   */
  it('should call signInWithPassword and update cache on loginMutation success', async () => {
    // Configuração inicial (sem sessão)
    mockAuthService.getSession.mockResolvedValue({ user: null, session: null });

    // Configuração da mutação
    const loginCredentials: LoginCredentials = {
      email: 'test@example.com',
      password: 'password123',
    };
    const mockAuthResponse = {
      data: { user: mockUser, session: mockSession },
      error: null,
    } as AuthResponse;
    mockAuthService.signInWithPassword.mockResolvedValue(mockAuthResponse);

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(queryClient, mockAuthService),
    });

    // Aguarda a query inicial
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user).toBeNull();

    // Execução: Chama a mutação de login
    act(() => {
      result.current.loginMutation.mutate(loginCredentials);
    });

    // Verificação:
    await waitFor(() => {
      expect(result.current.loginMutation.isSuccess).toBe(true);
    });
    
    // 1. Chamou o serviço com os dados corretos
    expect(mockAuthService.signInWithPassword).toHaveBeenCalledWith(loginCredentials);
    
    // 2. Atualizou o cache do queryClient
    expect(result.current.data).toEqual(mockAuthCacheData);
    expect(result.current.user).toEqual(mockUser);
  });

  /**
   * Teste 4: (Complementar ao Plano)
   * Verifica se a mutação de logout chama o serviço e limpa o cache.
   */
  it('should call signOut and clear cache on logoutMutation success', async () => {
    // Configuração inicial (COM sessão)
    mockAuthService.getSession.mockResolvedValue(mockAuthCacheData);
    mockAuthService.signOut.mockResolvedValue(undefined); // signOut retorna void

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(queryClient, mockAuthService),
    });

    // Aguarda a query inicial (usuário logado)
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user).toEqual(mockUser);

    // Execução: Chama a mutação de logout
    act(() => {
      result.current.logoutMutation.mutate();
    });

    // Verificação:
    await waitFor(() => {
      expect(result.current.logoutMutation.isSuccess).toBe(true);
    });

    // 1. Chamou o serviço
    expect(mockAuthService.signOut).toHaveBeenCalledTimes(1);
    
    // 2. Limpou o cache do queryClient
    expect(result.current.data).toEqual({ user: null, session: null });
    expect(result.current.user).toBeNull();
  });
});