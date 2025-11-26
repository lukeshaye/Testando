import { useContext, useEffect } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
  QueryKey,
} from '@tanstack/react-query';
import { AuthServiceContext } from '../contexts/AuthServiceProvider';
import type { LoginCredentials } from '../services/IAuthService';
import type { AuthResponse, Session, User } from '@supabase/supabase-js';

// Definindo a chave da query como uma constante
const authQueryKey: QueryKey = ['user'];

/**
 * Define a estrutura dos dados armazenados no cache do React Query para autenticação.
 */
type AuthCacheData = {
  user: User | null;
  session: Session | null;
};

/**
 * Hook para gerenciar o estado de autenticação (usuário, sessão) e
 * expor as ações de login/logout.
 *
 * Implementa PGEC (2.13):
 * - Nível 3 Query (useQuery) para `getSession` é a fonte da verdade.
 * - Listener (useEffect) para `onAuthStateChange` atualiza o cache da query.
 * - Nível 3 Mutations (useMutation) para `signIn` e `signOut` atualizam o cache.
 *
 * Implementa DIP (2.9):
 * - Depende da abstração IAuthService injetada via AuthServiceContext.
 *
 * Conforme $$PLANO_DE_FEATURE$$ (Revisão 2), Tarefa 3.
 */
export const useAuth = () => {
  const queryClient = useQueryClient();

  // 1. Injeção de Dependência (DIP)
  // Obtém o serviço de autenticação do contexto.
  const authService = useContext(AuthServiceContext);

  if (!authService) {
    throw new Error('useAuth must be used within an AuthServiceProvider');
  }

  // 3. PGEC Nível 3 (Query) - A Fonte da Verdade
  // Busca a sessão atual e a armazena no cache do React Query.
  const {
    data: sessionData,
    isLoading,
    isError,
    error,
  } = useQuery<AuthCacheData, Error>({
    queryKey: authQueryKey,
    queryFn: () => authService.getSession(),
    // Configurações para estado de autenticação:
    staleTime: Infinity, // A sessão só muda via listener ou mutação
    gcTime: Infinity, // Nunca limpar o cache
    refetchOnWindowFocus: false, // Evita refetch desnecessário
    retry: 1, // Tenta 1 vez em caso de falha inicial
  });

  // 4. PGEC (Listener)
  // Inscreve-se nas mudanças de estado do auth (login/logout em outra aba)
  // e atualiza o cache do React Query.
  useEffect(() => {
    // O authService.onAuthStateChange retorna a função de unsubscribe
    const unsubscribe = authService.onAuthStateChange((newSession: Session | null) => {
      // Atualiza o cache do React Query com os dados da nova sessão
      queryClient.setQueryData<AuthCacheData>(authQueryKey, {
        user: newSession?.user ?? null,
        session: newSession ?? null,
      });
    });

    // Limpa a inscrição quando o hook é desmontado
    return () => unsubscribe();
  }, [authService, queryClient]);

  // 5. PGEC Nível 3 (Mutation - Login)
  const loginMutation = useMutation<
    AuthResponse, // Tipo de retorno da mutação
    Error, // Tipo do erro
    LoginCredentials // Tipo dos argumentos (credentials)
  >({
    mutationFn: (credentials) => authService.signInWithPassword(credentials),
    onSuccess: (response) => {
      // O Supabase AuthResponse tem { data, error }
      // Se houver um erro na resposta (ex: senha errada), 'response.error' existirá.
      // Se for sucesso, 'response.data.session' existirá.
      if (response.data.session) {
        queryClient.setQueryData<AuthCacheData>(authQueryKey, {
          user: response.data.user,
          session: response.data.session,
        });
      }
      // Se response.error existir, a mutação ainda foi "bem-sucedida" (não
      // lançou um erro de rede), mas o componente (LoginForm) deve
      // tratar esse erro de login.
    },
    // onError lida com falhas de rede ou erros inesperados lançados pelo serviço
  });

  // 5. PGEC Nível 3 (Mutation - Logout)
  const logoutMutation = useMutation<void, Error, void>({
    mutationFn: () => authService.signOut(),
    onSuccess: () => {
      // Limpa o cache do usuário ao fazer logout
      queryClient.setQueryData<AuthCacheData>(authQueryKey, {
        user: null,
        session: null,
      });
      // Opcional: limpar todo o cache do queryClient se necessário
      // queryClient.clear();
    },
  });

  // 6. Retorno
  return {
    // Dados da sessão e usuário
    data: sessionData,
    user: sessionData?.user ?? null,
    session: sessionData?.session ?? null,
    // Estado da query principal
    isLoading,
    isError,
    error,
    // Mutações (Commands)
    loginMutation,
    logoutMutation,
  };
};