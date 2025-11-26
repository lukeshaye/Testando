"use client";

import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";

/**
 * Componente de botão para alternar o tema da aplicação (light/dark).
 * Este componente lê e atualiza o estado de tema da store global (Zustand).
 *
 * Conforme o plano:
 * - Usa o Button de components/ui/button com variant="ghost".
 * - Lê o 'theme' e chama a ação 'toggleTheme' da store Zustand (lib/store.ts).
 * - O tema é um Estado Global de UI (Nível 4).
 */
export function ThemeToggle() {
  const theme = useAppStore((state) => state.theme);
  const toggleTheme = useAppStore((state) => state.toggleTheme);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label="Alternar tema"
    >
      {theme === 'dark' ? (
        <Sun className="h-[1.2rem] w-[1.2rem]" />
      ) : (
        <Moon className="h-[1.2rem] w-[1.2rem]" />
      )}
    </Button>
  );
}