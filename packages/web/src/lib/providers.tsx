/**
 * /packages/web/src/lib/store.ts
 *
 * (Executor: LLM 2)
 *
 * OBJETIVO:
 * Conforme a Tarefa 4.6, Item 2 do PLANO_DE_FEATURE_Parte_2_Core.
 * Este arquivo cria a store global (Zustand) e adere estritamente ao
 * Princípio de Gerenciamento de Estado (PGEC).
 *
 * LÓGICA (do plano):
 * [cite_start]1. REMOVER[cite: 125, 126, 127]: Todos os estados do servidor (clients, products,
 * loading, fetchClients, addClient, etc.) foram removidos.
 * 2. MANTER/ADICIONAR (Estado de UI - Nível 4):
 * - [cite_start]isSidebarOpen: (boolean) Controla a visibilidade da sidebar [cite: 122]
 * [cite_start](migrado do Layout.tsx legado [cite: 94, 95]).
 * - [cite_start]theme: (string) Controla o tema atual [cite: 123] (ex: 'dark', 'light').
 *
 * PRINCÍPIOS APLICADOS (do plano):
 * - [cite_start]PGEC (2.13): [cite: 129] Esta store adere estritamente ao Nível 4 (Estado Global de UI),
 * em contraste com o store.ts legado que misturava Nível 3 e 4.
 * - [cite_start]SoC (2.5): [cite: 131] A responsabilidade da store agora é *apenas*
 * gerenciar o estado da UI.
 */

import { create } from 'zustand';

/**
 * Define a interface para o Estado Global de UI (Nível 4)
 [cite_start]* [cite: 94, 104, 121]
 */
interface UiState {
  isSidebarOpen: boolean;
  theme: string;
  toggleSidebar: () => void;
  setTheme: (theme: string) => void;
  // Ação para alternar temas (para o ThemeToggle.tsx)
  toggleTheme: () => void;
}

/**
 * Cria a store Zustand 'useStore' para gerenciar o Estado Global de UI.
 */
export const useStore = create<UiState>((set) => ({
  // --- ESTADO INICIAL ---

  /**
   * Controla se a sidebar está aberta ou fechada.
   [cite_start]* [cite: 122]
   */
  isSidebarOpen: false,

  /**
   * Controla o tema ativo (ex: 'dark', 'light', 'theme-yellow-dark').
   * O padrão é 'dark' (sem classe aplicada, conforme index.css).
   [cite_start]* [cite: 123]
   */
  theme: 'dark',

  // --- AÇÕES ---

  /**
   * Ação para alternar a visibilidade da sidebar (abrir/fechar).
   [cite_start]* [cite: 96]
   */
  toggleSidebar: () =>
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

  /**
   * Ação para definir um tema específico.
   [cite_start]* [cite: 105] (Relacionado)
   */
  setTheme: (newTheme: string) => set({ theme: newTheme }),

  /**
   * Ação simples para alternar entre 'dark' e 'light'.
   [cite_start]* [cite: 105]
   */
  toggleTheme: () =>
    set((state) => ({
      theme: state.theme === 'dark' ? 'theme-light' : 'dark',
    })),
}));