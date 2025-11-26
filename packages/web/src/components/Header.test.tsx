/**
 * @file: Header.test.tsx
 * @description: Teste para o componente Header, verificando a interação com a store Zustand (PGEC).
 *
 * Princípio Testado: PTE (2.15) - Criação de testes.
 * O teste simula a store Zustand e verifica se a ação correta é disparada ao clicar no botão.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import Header from './Header';
import { useAppStore } from '../lib/store'; // Importamos a store real para fazer o mock

// 1. Mock do Zustand
// Este mock simula a implementação do hook useAppStore.
// Ele garante que a função setSidebarOpen seja um Jest Mock, permitindo a verificação de chamadas.
const mockSetSidebarOpen = jest.fn();

// O mock é aplicado diretamente ao módulo onde a store reside.
// Nota: O arquivo useAppStore é usado pelo Header.tsx, por isso o mock deve vir daqui.
jest.mock('../lib/store', () => ({
  // No Header.tsx, a store é usada assim: const setSidebarOpen = useAppStore((state) => state.setSidebarOpen);
  // O mock deve simular essa assinatura.
  useAppStore: (selector: (state: any) => any) => {
    // Simulamos a store, retornando o valor/ação que o seletor está buscando.
    // Como Header.tsx só busca setSidebarOpen, injetamos a função mockada.
    return selector({
      setSidebarOpen: mockSetSidebarOpen,
    });
  },
}));

// 2. Mock do next/navigation (usePathname)
// Embora o Header.tsx não use usePathname, o Plano [165] exige que o teste de Layout/Navegação
// lide com ele (o que será necessário para o Sidebar.test.tsx).
// O Next.js exige que módulos sejam mockados globalmente quando usados em testes.
jest.mock('next/navigation', () => ({
  usePathname: jest.fn().mockReturnValue('/mocked-path'),
}));


describe('Header', () => {
  // Limpa os mocks antes de cada teste para garantir isolamento.
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve renderizar o botão de menu (hamburger)', () => {
    render(<Header />);

    // Procura pelo elemento que contém o texto acessível "Abrir sidebar".
    const button = screen.getByRole('button', { name: /Abrir sidebar/i });
    expect(button).toBeInTheDocument();
  });

  it('deve chamar setSidebarOpen(true) ao clicar no botão de menu (PGEC)', () => {
    render(<Header />);

    // 1. Encontra o botão (conforme o teste anterior)
    const button = screen.getByRole('button', { name: /Abrir sidebar/i });
    
    // 2. Simula o clique
    fireEvent.click(button);

    // 3. Verifica se a ação do Zustand (mockada) foi chamada
    expect(mockSetSidebarOpen).toHaveBeenCalledTimes(1);
    
    // 4. Verifica se foi chamada com o valor esperado (true)
    expect(mockSetSidebarOpen).toHaveBeenCalledWith(true);
  });
});