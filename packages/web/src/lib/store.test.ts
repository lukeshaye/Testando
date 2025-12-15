// packages/web/src/lib/store.test.ts

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from '@testing-library/react';
import { useAppStore } from './store';

// Mock do localStorage para garantir um ambiente limpo e controlado.
// Isso alinha-se ao Princípio 2.15 (PTE) e 2.9 (DIP), isolando dependências externas.
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    },
    removeItem: (key: string) => {
      delete store[key];
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Define o estado inicial padrão para resetar a store
const initialState = useAppStore.getState();

/**
 * Testes para a store global (Zustand) - lib/store.ts
 *
 * Conforme o PLANO_DE_FEATURE e o Princípio 2.13 (PGEC):
 * Estes testes focam apenas no Nível 4 (Estado Global de UI),
 * garantindo que temas e sidebar funcionem sem efeitos colaterais.
 */
describe('useAppStore (Zustand)', () => {
  // Garante que a store e o localStorage sejam resetados antes de CADA teste
  // Isso satisfaz a necessidade de provas de corretude isoladas (Princípio 2.15).
  beforeEach(() => {
    act(() => {
      // Reseta a store para seu estado inicial
      useAppStore.setState(initialState);
    });
    // Limpa o mock do localStorage
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('deve ter o estado inicial correto', () => {
    const state = useAppStore.getState();
    expect(state.theme).toBe('dark');
    expect(state.isSidebarOpen).toBe(true);
  });

  test('deve alternar o tema (toggleTheme)', () => {
    const stateV1 = useAppStore.getState();
    expect(stateV1.theme).toBe('dark');

    // Executa a ação
    act(() => {
      useAppStore.getState().toggleTheme();
    });

    const stateV2 = useAppStore.getState();
    expect(stateV2.theme).toBe('light');

    // Executa a ação novamente
    act(() => {
      useAppStore.getState().toggleTheme();
    });

    const stateV3 = useAppStore.getState();
    expect(stateV3.theme).toBe('dark');
  });

  test('deve definir o estado da sidebar (setSidebarOpen)', () => {
    const stateV1 = useAppStore.getState();
    expect(stateV1.isSidebarOpen).toBe(true);

    // Executa a ação para fechar
    act(() => {
      useAppStore.getState().setSidebarOpen(false);
    });

    const stateV2 = useAppStore.getState();
    expect(stateV2.isSidebarOpen).toBe(false);

    // Executa a ação para abrir
    act(() => {
      useAppStore.getState().setSidebarOpen(true);
    });

    const stateV3 = useAppStore.getState();
    expect(stateV3.isSidebarOpen).toBe(true);
  });

  test('deve alternar o estado da sidebar (toggleSidebar)', () => {
    const stateV1 = useAppStore.getState();
    expect(stateV1.isSidebarOpen).toBe(true);

    // Executa a ação (true -> false)
    act(() => {
      useAppStore.getState().toggleSidebar();
    });

    const stateV2 = useAppStore.getState();
    expect(stateV2.isSidebarOpen).toBe(false);

    // Executa a ação (false -> true)
    act(() => {
      useAppStore.getState().toggleSidebar();
    });

    const stateV3 = useAppStore.getState();
    expect(stateV3.isSidebarOpen).toBe(true);
  });

  test('deve persistir o estado no localStorage (via middleware "persist")', () => {
    const storageKey = 'app-ui-storage';
    vi.spyOn(localStorage, 'setItem');

    // Estado inicial (não deve ter chamado setItem ainda na inicialização do teste)
    expect(localStorage.getItem(storageKey)).toBeNull();

    // Ação 1: Mudar o tema
    act(() => {
      useAppStore.getState().toggleTheme(); // dark -> light
    });

    // Verifica se o localStorage foi atualizado
    expect(localStorage.setItem).toHaveBeenCalledTimes(1);
    let storedData = JSON.parse(localStorage.getItem(storageKey) || '{}');
    expect(storedData.state.theme).toBe('light');
    expect(storedData.state.isSidebarOpen).toBe(true); // Permanece o inicial

    // Ação 2: Mudar a sidebar
    act(() => {
      useAppStore.getState().setSidebarOpen(false); // true -> false
    });

    // Verifica se o localStorage foi atualizado novamente
    expect(localStorage.setItem).toHaveBeenCalledTimes(2);
    storedData = JSON.parse(localStorage.getItem(storageKey) || '{}');
    expect(storedData.state.theme).toBe('light');
    
    // CORREÇÃO: Removido o caractere 'V' que causava erro de sintaxe
    expect(storedData.state.isSidebarOpen).toBe(false);

    // Verifica se as ações (funções) não estão sendo persistidas
    expect(storedData.state.toggleTheme).toBeUndefined();
    expect(storedData.state.setSidebarOpen).toBeUndefined();
  });
});