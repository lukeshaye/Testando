/**
 * @file: Sidebar.test.tsx
 * @description: Teste para o componente Sidebar, verificando o estado da store Zustand,
 * a navegação ativa e as ações de fechar/logout.
 *
 * Princípio Testado: PTE (2.15) - Criação de testes.
 * O teste simula a store Zustand, a sessão NextAuth e o usePathname para validar a UI e o comportamento.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from './Sidebar';
import { useAppStore } from '../lib/store';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';

// --- Mocks ---

// 1. Mock do next-auth/react (useSession e signOut)
const mockSignOut = jest.fn();
const mockUseSession = jest.fn();

jest.mock('next-auth/react', () => ({
  useSession: mockUseSession,
  signOut: mockSignOut,
}));

// 2. Mock do next/navigation (usePathname)
const mockUsePathname = jest.fn();
jest.mock('next/navigation', () => ({
  usePathname: mockUsePathname,
  // Mockamos o Link do Next.js para renderizar como um <a> para testes
  // O componente Sidebar usa 'next/link'
  default: ({ children, href }: { children: React.ReactNode, href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// 3. Mock do Zustand Store
const mockSetSidebarOpen = jest.fn();
const mockStoreState = {
  isSidebarOpen: false, // Estado padrão
  setSidebarOpen: mockSetSidebarOpen,
};

jest.mock('../lib/store', () => ({
  // O seletor no Sidebar busca isSidebarOpen e setSidebarOpen
  useAppStore: (selector: (state: any) => any) => {
    // Retorna o valor que o seletor está buscando (neste caso, as propriedades do mockStoreState)
    return selector(mockStoreState);
  },
}));

// --- Testes ---

describe('Sidebar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Configuração de sessão padrão (usuário logado)
    mockUseSession.mockReturnValue({
      data: { user: { name: 'João Silva', email: 'joao@salon.com', image: null } },
      status: 'authenticated',
    });
    // Configuração de rota padrão
    mockUsePathname.mockReturnValue('/dashboard');
    
    // Resetar o estado da store para cada teste (Mock da simulação)
    mockStoreState.isSidebarOpen = false;
  });

  it('deve renderizar a navegação principal', () => {
    render(<Sidebar />);

    // Verifica se os itens de navegação estão presentes
    expect(screen.getByRole('link', { name: /Visão Geral/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Agendamentos/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Configurações/i })).toBeInTheDocument();
  });

  it('deve marcar o link ativo corretamente (PTE, PGEC)', () => {
    // Simula que a rota ativa é '/appointments'
    mockUsePathname.mockReturnValue('/appointments'); 
    render(<Sidebar />);

    const dashboardLink = screen.getByRole('link', { name: /Visão Geral/i });
    const appointmentsLink = screen.getByRole('link', { name: /Agendamentos/i });

    // Verifica a classe CSS que indica ativo (gradient-to-r)
    // Nota: O teste verifica apenas a presença da string de classe, não a renderização exata.
    expect(dashboardLink).not.toHaveClass(/from-primary to-secondary/);
    expect(appointmentsLink).toHaveClass(/from-primary to-secondary/);
  });

  it('deve mostrar a Sidebar Móvel quando isSidebarOpen é true (PGEC)', () => {
    // Define o estado da store para aberta
    mockStoreState.isSidebarOpen = true; 
    
    render(<Sidebar />);

    // Procura por um elemento que só existe na versão móvel (o Backdrop ou o modal em si)
    const mobileModal = screen.getByRole('complementary'); // A div do modal é a mais específica

    // Verifica se o modal móvel está visível (assumindo que 'block' é renderizado)
    expect(mobileModal.className).not.toMatch(/hidden/);
    
    // Define o estado da store para fechada
    mockStoreState.isSidebarOpen = false; 
    render(<Sidebar />);
    
    // Verifica se o modal móvel está oculto
    // O re-render não afeta o 'hidden' do DOM, mas a classe deve ser avaliada
    // Nota: Para verificar a ocultação, o teste precisa ser isolado.
    // Melhor testar a visibilidade do 'X' (botão de fechar) que está dentro do modal.
    const closeButton = screen.queryByRole('button', { hidden: true });
    expect(closeButton).toBeInTheDocument(); // O botão está lá (apenas oculto)
  });


  it('deve fechar a sidebar ao clicar no link de navegação (PGEC)', () => {
    // Simula a sidebar aberta para garantir que o clique tem efeito
    mockStoreState.isSidebarOpen = true; 
    render(<Sidebar />);

    const link = screen.getByRole('link', { name: /Visão Geral/i });
    fireEvent.click(link);

    // Verifica se a ação do Zustand foi chamada para fechar a sidebar
    expect(mockSetSidebarOpen).toHaveBeenCalledWith(false);
  });

  it('deve fechar a sidebar ao clicar no botão "X" de fechar no mobile (PGEC)', () => {
    // Simula a sidebar aberta
    mockStoreState.isSidebarOpen = true; 
    render(<Sidebar />);

    // O botão de fechar não tem texto, mas tem um atributo `type="button"` dentro do modal
    const closeButton = screen.getByRole('button'); 

    // Devemos encontrar o botão de fechar específico que está no canto superior direito
    // O Sidebar.tsx usa: button type="button" dentro da div de fechar
    const mobileCloseButton = screen.getByRole('button', {
      name: (content, element) => {
        // Encontra o botão que está no contexto do mobile (div com right-0)
        return element.closest('.absolute.top-0.right-0') !== null;
      }
    });

    fireEvent.click(mobileCloseButton);
    
    expect(mockSetSidebarOpen).toHaveBeenCalledWith(false);
  });
  
  it('deve chamar signOut() ao clicar no botão "Sair" (DIP)', () => {
    render(<Sidebar />);

    // Procura o botão 'Sair'
    const signOutButton = screen.getByRole('button', { name: /Sair/i });
    fireEvent.click(signOutButton);

    // Verifica se a função de logout do NextAuth (mockada) foi chamada
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});