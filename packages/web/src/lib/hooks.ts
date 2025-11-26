// packages/web/src/lib/hooks.ts

import { useState, useEffect } from 'react';

/**
 * Hook customizado para monitorar uma media query CSS.
 * Retorna 'true' se a query corresponder e 'false' caso contrário.
 *
 */
export function useMediaQuery(query: string): boolean {
  // Inicializa o estado com o valor atual da media query
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false; // Valor padrão para SSR (Server-Side Rendering)
  });

  useEffect(() => {
    // Garante que o código só execute no cliente
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQueryList = window.matchMedia(query);
    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);

    // Adiciona o listener
    // Usando o método moderno addEventListener, se disponível
    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener('change', listener);
    } else {
      // Fallback para addListener (depreciado)
      mediaQueryList.addListener(listener);
    }

    // Atualiza o estado caso a query tenha mudado entre a renderização inicial e o useEffect
    setMatches(mediaQueryList.matches);

    // Limpa o listener ao desmontar o componente
    return () => {
      if (mediaQueryList.removeEventListener) {
        mediaQueryList.removeEventListener('change', listener);
      } else {
        mediaQueryList.removeListener(listener);
      }
    };
  }, [query]);

  return matches;
}