"use client";

import { Menu } from 'lucide-react';
import { useAppStore } from '../lib/store';

/**
 * Componente Header
 * Aborda as violações 1 (SoC) e 2 (PGEC).
 * - SoC (2.5): Tem a responsabilidade única de exibir o cabeçalho móvel.
 * - PGEC (2.13): Interage com o Zustand store (Nível 4) para controlar a sidebar.
 */
export default function Header() {
  // Abordando Violação 2 (PGEC): Estado de UI global (Nível 4) lido do Zustand.
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen);

  return (
    // Este é o header "sticky" que só aparece em telas lg:hidden (mobile/tablet)
    // Conforme o plano [90], este componente contém o botão "hamburger".
    <div className="sticky top-0 z-10 bg-card pl-1 pt-1 sm:pl-3 sm:pt-3 lg:hidden">
      <button
        type="button"
        className="-ml-0.5 -mt-0.5 inline-flex h-12 w-12 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-inset focus:ring-ring"
        // Abordando Violação 2 (PGEC): Chama a ação do Zustand [96].
        onClick={() => setSidebarOpen(true)}
      >
        <span className="sr-only">Abrir sidebar</span>
        <Menu className="h-6 w-6" />
      </button>
    </div>
  );
}