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
 *
 * Conforme o PLANO_DE_FEATURE (Tarefa 4.6):
 * [cite_start]- [cite: 80, 81] Esta store adere estritamente ao PGEC (2.13) e SoC (2.5).
 * [cite_start]- [cite: 75, 76, 77] Ela *remove* intencionalmente todo o Estado do Servidor (Nível 3),
 * como 'clients', 'products', funções de fetch (ex: 'fetchClients'), e estados de 'loading'.
 * Essa lógica agora é gerenciada pelo React Query (Nível 3) e pela camada de API (lib/api.ts).
 * [cite_start]- [cite: 72, 73] Ela gerencia *apenas* o estado da UI, como 'isSidebarOpen' (para o layout)
 * e 'theme' (para alternância de tema).
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
      
      // Definir quais partes do estado devem ser persistidas
      partialize: (state) => ({
        theme: state.theme,
        isSidebarOpen: state.isSidebarOpen,
      }),
    }
  )
);