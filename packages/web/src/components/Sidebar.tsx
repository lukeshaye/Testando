"use client";

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import {
  LayoutDashboard,
  Calendar,
  DollarSign,
  Package,
  Users,
  Briefcase,
  Settings,
  X,
  LogOut,
  Scissors
} from 'lucide-react';
import { useAppStore } from '../lib/store';

// --- Dados de Navegação ---
// Conforme o plano [89], o Sidebar.tsx contém a lógica de navegação.
const navigation = [
  { name: 'Visão Geral', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Agendamentos', href: '/appointments', icon: Calendar },
  { name: 'Financeiro', href: '/financial', icon: DollarSign },
  { name: 'Produtos', href: '/products', icon: Package },
  { name: 'Serviços', href: '/services', icon: Scissors },
  { name: 'Clientes', href: '/clients', icon: Users },
  { name: 'Profissionais', href: '/professionals', icon: Briefcase },
  { name: 'Configurações', href: '/settings', icon: Settings },
];

/**
 * Componente de conteúdo interno da Sidebar, reutilizado para Mobile e Desktop.
 * Abordando Violação 1 (SoC): Este componente foca apenas na navegação e perfil.
 */
const SidebarContent = () => {
  const pathname = usePathname();
  // Abordando Violação 3 (DIP): Usa a abstração do NextAuth, não o Supabase.
  const { data: session } = useSession();

  // Abordando Violação 2 (PGEC): Estado de UI global (Nível 4) lido do Zustand.
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen);

  const userName = useMemo(() => session?.user?.name || session?.user?.email, [session]);
  const userAvatar = useMemo(() => session?.user?.image, [session]);

  return (
    <>
      <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
        <div className="flex flex-shrink-0 items-center px-4">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-primary to-secondary rounded-xl p-2">
              <Scissors className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold text-foreground">SalonFlow</h1>
          </div>
        </div>
        <nav className="mt-5 flex-1 space-y-1 px-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              // Abordando Violação 4 (Arquitetura): Usa Link do Next.js.
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? 'bg-gradient-to-r from-primary to-secondary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
                onClick={() => setSidebarOpen(false)} // Fecha o modal no mobile ao navegar
              >
                <item.icon className={`mr-3 h-6 w-6 flex-shrink-0 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
      {/* Lógica de avatar na base, conforme plano [89] */}
      <div className="flex flex-shrink-0 border-t border-border p-4">
        <div className="group block w-full flex-shrink-0">
          <div className="flex items-center">
            <div>
              <img
                className="inline-block h-9 w-9 rounded-full"
                src={userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName || '')}&background=6366f1&color=fff`}
                alt="Avatar do usuário"
              />
            </div>
            <div className="ml-3 min-w-0">
              <p className="truncate text-sm font-medium text-foreground" title={userName}>
                {userName}
              </p>
              {/* Abordando Violação 3 (DIP): Usa signOut do NextAuth */}
              <button
                onClick={() => signOut()}
                className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center"
              >
                <LogOut className="w-3 h-3 mr-1" />
                Sair
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

/**
 * Componente Sidebar
 * Aborda as violações 1 (SoC), 2 (PGEC), 3 (DIP) e 4 (Arquitetura).
 * - SoC: Renderiza apenas a Sidebar (móvel e desktop), sem o <main> ou Header.
 * - PGEC: Lê o estado 'isSidebarOpen' do store Zustand.
 * - DIP/Auth: Usa NextAuth (via SidebarContent) para dados do usuário e logout.
 * - Arquitetura: Usa hooks e componentes do Next.js (via SidebarContent).
 */
export default function Sidebar() {
  // Abordando Violação 2 (PGEC): Estado de UI global (Nível 4) lido do Zustand.
  const isSidebarOpen = useAppStore((state) => state.isSidebarOpen);
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen);

  return (
    <>
      {/* Sidebar Móvel */}
      <div className={`lg:hidden ${isSidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-overlay/75" onClick={() => setSidebarOpen(false)} />
          
          <div className="relative flex w-full max-w-xs flex-1 flex-col bg-card">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                type="button"
                className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-ring"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-6 w-6 text-primary-foreground" />
              </button>
            </div>
            <SidebarContent />
          </div>
        </div>
      </div>

      {/* Sidebar Desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex min-h-0 flex-1 flex-col border-r border-border bg-card">
          <SidebarContent />
        </div>
      </div>
    </>
  );
}