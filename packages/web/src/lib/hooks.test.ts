// packages/web/src/lib/hooks.test.ts

import { renderHook, act } from '@testing-library/react';
import { vi, describe, test, expect, beforeAll, afterEach } from 'vitest';
import { useMediaQuery } from './hooks';

// Armazenamento global para os listeners do mock
const listeners: Record<string, (event: { matches: boolean }) => void> = {};

// Mock do 'matchMedia'
const mockMatchMedia = (query: string) => ({
  matches: false, // O valor padrão, pode ser sobrescrito por teste
  media: query,
  // Moderno
  addEventListener: (
    event: string,
    listener: (event: { matches: boolean }) => void,
  ) => {
    listeners[query] = listener;
  },
  removeEventListener: () => {
    delete listeners[query];
  },
  // Legado (fallback usado no hook)
  addListener: (listener: (event: { matches: boolean }) => void) => {
    listeners[query] = listener;
  },
  removeListener: () => {
    delete listeners[query];
  },
});

// Helper para disparar uma mudança na media query
const triggerMediaQueryChange = (query: string, matches: boolean) => {
  if (listeners[query]) {
    listeners[query]({ matches });
  }
};

describe('useMediaQuery', () => {
  // Aplicar o mock antes de todos os testes
  beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(mockMatchMedia),
    });
  });

  // Limpar os listeners e mocks após cada teste
  afterEach(() => {
    for (const key in listeners) {
      delete listeners[key];
    }
    (window.matchMedia as vi.Mock).mockClear();
  });

  test('deve retornar false quando a query não corresponde inicialmente', () => {
    // Configura o mock para este teste específico
    (window.matchMedia as vi.Mock).mockImplementation((query) => ({
      ...mockMatchMedia(query),
      matches: false,
    }));

    const query = '(max-width: 600px)';
    const { result } = renderHook(() => useMediaQuery(query));

    expect(result.current).toBe(false);
    expect(window.matchMedia).toHaveBeenCalledWith(query);
  });

  test('deve retornar true quando a query corresponde inicialmente', () => {
    // Configura o mock para este teste específico
    (window.matchMedia as vi.Mock).mockImplementation((query) => ({
      ...mockMatchMedia(query),
      matches: true,
    }));

    const query = '(min-width: 1024px)';
    const { result } = renderHook(() => useMediaQuery(query));

    expect(result.current).toBe(true);
    expect(window.matchMedia).toHaveBeenCalledWith(query);
  });

  test('deve atualizar o estado quando a media query mudar', () => {
    const query = '(min-width: 768px)';

    // 1. Inicia com 'false'
    (window.matchMedia as vi.Mock).mockImplementation((q) => ({
      ...mockMatchMedia(q),
      matches: false,
    }));

    const { result } = renderHook(() => useMediaQuery(query));
    expect(result.current).toBe(false);

    // 2. Simula a mudança para 'true'
    act(() => {
      triggerMediaQueryChange(query, true);
    });
    expect(result.current).toBe(true);

    // 3. Simula a mudança de volta para 'false'
    act(() => {
      triggerMediaQueryChange(query, false);
    });
    expect(result.current).toBe(false);
  });

  test('deve limpar o listener ao desmontar (usando removeEventListener)', () => {
    const query = '(prefers-color-scheme: dark)';
    const mockRemoveEventListener = vi.fn();

    (window.matchMedia as vi.Mock).mockImplementation((q) => ({
      ...mockMatchMedia(q),
      matches: true,
      // Sobrescreve o mock para espionar a função de remoção
      removeEventListener: mockRemoveEventListener,
      // Garante que o addEventListener exista para o hook preferi-lo
      addEventListener: (
        event: string,
        listener: (event: { matches: boolean }) => void,
      ) => {
        listeners[q] = listener;
      },
      // Zera o listener legado para forçar o uso do moderno
      removeListener: undefined,
      addListener: undefined,
    }));

    const { unmount } = renderHook(() => useMediaQuery(query));

    // Desmonta o componente
    unmount();

    // Verifica se a limpeza foi chamada
    expect(mockRemoveEventListener).toHaveBeenCalledTimes(1);
    expect(mockRemoveEventListener).toHaveBeenCalledWith(
      'change',
      listeners[query],
    );
  });

  test('deve limpar o listener ao desmontar (usando removeListener - fallback)', () => {
    const query = '(prefers-color-scheme: light)';
    const mockRemoveListener = vi.fn();

    (window.matchMedia as vi.Mock).mockImplementation((q) => ({
      ...mockMatchMedia(q),
      matches: false,
      // Zera os listeners modernos para forçar o fallback
      addEventListener: undefined,
      removeEventListener: undefined,
      // Sobrescreve o mock legado para espionar
      removeListener: mockRemoveListener,
      addListener: (listener: (event: { matches: boolean }) => void) => {
        listeners[q] = listener;
      },
    }));

    const { unmount } = renderHook(() => useMediaQuery(query));

    // Desmonta o componente
    unmount();

    // Verifica se a limpeza (legada) foi chamada
    expect(mockRemoveListener).toHaveBeenCalledTimes(1);
    expect(mockRemoveListener).toHaveBeenCalledWith(listeners[query]);
  });
});