// packages/web/src/lib/store.ts

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Definindo o tipo para o tema
type Theme = "light" | "dark";

// Interface para o estado da store
interface AppState {
  theme: Theme;
  isSidebarOpen: boolean;
  toggleTheme: () => void;
  setSidebarOpen: (isOpen: boolean) => void;
  toggleSidebar: () => void;
}

/**
 * Store global (Zustand) para gerenciar o Estado Global da UI (Nível 4).
 * * Princípios aplicados:
 * - PGEC (2.13): Gerencia apenas estado de UI global (Tema, Sidebar).
 * - SoC (2.5): Separa responsabilidade de UI da lógica de dados (API).
 * - Imutabilidade (2.14): O Zustand garante atualizações imutáveis do estado[cite: 93, 97].
 */
export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Estado inicial
      theme: "dark", // Tema padrão
      isSidebarOpen: true, // Sidebar padrão (desktop)

      /**
       * Ação para alternar o tema da aplicação.
       */
      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === "dark" ? "light" : "dark",
        })),

      /**
       * Ação para definir explicitamente o estado da sidebar.
       * @param isOpen O novo estado (aberta/fechada).
       */
      setSidebarOpen: (isOpen: boolean) =>
        set({ isSidebarOpen: isOpen }),

      /**
       * Ação para alternar o estado da sidebar (aberta/fechada).
       */
      toggleSidebar: () =>
        set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
    }),
    {
      name: 'app-ui-storage', // Nome da chave no localStorage
      storage: createJSONStorage(() => localStorage), // Usar localStorage
      
      // Definir quais partes do estado devem ser persistidas (Whitelist)
      partialize: (state) => ({
        theme: state.theme,
        isSidebarOpen: state.isSidebarOpen,
      }),
    }
  )
);