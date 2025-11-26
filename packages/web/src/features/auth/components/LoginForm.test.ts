import * as React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { LoginForm } from './LoginForm';
import { useAuth } from '../hooks/useAuth';

/**
 * Princípio SoC (2.5) / PTE (2.15):
 * Mockamos o hook 'useAuth' para isolar o componente 'LoginForm'.
 * O teste do LoginForm foca apenas na UI (Nível 1) e no estado do formulário,
 * não na lógica de autenticação (que é testada em useAuth.test.ts).
 */
vi.mock('../hooks/useAuth');

// Criamos um mock tipado para 'useAuth'
const mockedUseAuth = vi.mocked(useAuth);

// Criamos um mock para a função 'mutate' da mutação
const mockMutate = vi.fn();

// Tipo helper para o retorno do mock de useAuth
type MockUseAuthReturnValue = ReturnType<typeof useAuth>;

describe('LoginForm', () => {
  // Resetamos os mocks antes de cada teste
  beforeEach(() => {
    vi.clearAllMocks();

    // Configuração padrão do mock (estado "idle")
    mockedUseAuth.mockReturnValue({
      loginMutation: {
        mutate: mockMutate,
        isPending: false,
        isError: false,
        error: null,
      },
    } as unknown as MockUseAuthReturnValue); // Usamos 'unknown' para simplificar o mock
  });

  /**
   * Princípio Demeter (2.10) / PTE (2.15):
   * Testa a lógica de validação do Zod, que está *localizada* no componente.
   */
  describe('Validação do Formulário (Demeter)', () => {
    it('deve exibir erros de validação para campos obrigatórios', async () => {
      render(<LoginForm />);

      const submitButton = screen.getByRole('button', { name: /entrar/i });
      fireEvent.click(submitButton);

      // Espera que as mensagens de erro do Zod apareçam
      expect(
        await screen.findByText(/o e-mail é obrigatório/i)
      ).toBeInTheDocument();
      expect(
        await screen.findByText(/a senha é obrigatória/i)
      ).toBeInTheDocument();

      // A mutação não deve ser chamada se a validação falhar
      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('deve exibir erro para e-mail inválido', async () => {
      render(<LoginForm />);

      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'email-invalido' },
      });
      fireEvent.change(screen.getByLabelText(/senha/i), {
        target: { value: 'senha123' },
      });

      fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

      expect(
        await screen.findByText(/por favor, insira um e-mail válido/i)
      ).toBeInTheDocument();
      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('deve exibir erro para senha curta', async () => {
      render(<LoginForm />);

      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'teste@email.com' },
      });
      fireEvent.change(screen.getByLabelText(/senha/i), {
        target: { value: '123' },
      });

      fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

      expect(
        await screen.findByText(/a senha deve ter pelo menos 6 caracteres/i)
      ).toBeInTheDocument();
      expect(mockMutate).not.toHaveBeenCalled();
    });
  });

  /**
   * Teste de integração (Nível 1 -> Nível 3)
   * Verifica se o formulário válido chama o "amigo imediato" (loginMutation.mutate).
   */
  describe('Submissão Válida', () => {
    it('deve chamar loginMutation.mutate com os dados corretos ao submeter', async () => {
      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/senha/i);
      const submitButton = screen.getByRole('button', { name: /entrar/i });

      const testData = {
        email: 'teste@exemplo.com',
        password: 'password123',
      };

      // Preenche o formulário
      fireEvent.change(emailInput, { target: { value: testData.email } });
      fireEvent.change(passwordInput, { target: { value: testData.password } });

      // Submete
      fireEvent.click(submitButton);

      // Espera que a mutação seja chamada com os dados validados
      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(testData);
      });

      // Garante que nenhuma mensagem de erro de validação apareceu
      expect(
        screen.queryByText(/o e-mail é obrigatório/i)
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText(/a senha é obrigatória/i)
      ).not.toBeInTheDocument();
    });
  });

  /**
   * Testes de UI baseados no estado do hook mockado (PGEC / SoC).
   */
  describe('Estados da Mutação (UI Feedback)', () => {
    it('deve exibir estado de loading (spinner) e desabilitar o botão quando isPending é true', () => {
      // Configura o mock para o estado 'pending'
      mockedUseAuth.mockReturnValue({
        loginMutation: {
          mutate: mockMutate,
          isPending: true,
          isError: false,
          error: null,
        },
      } as unknown as MockUseAuthReturnValue);

      render(<LoginForm />);

      const submitButton = screen.getByRole('button', { name: /entrando.../i });

      // Verifica o texto do spinner
      expect(submitButton).toHaveTextContent(/entrando.../i);
      // Verifica se o ícone de loader está presente (baseado na classe 'animate-spin' do LoginForm.tsx)
      expect(submitButton.querySelector('.animate-spin')).toBeInTheDocument();
      // Verifica se o botão está desabilitado
      expect(submitButton).toBeDisabled();
    });

    it('deve exibir um alerta de erro quando isError é true', () => {
      const mockError = new Error('Credenciais inválidas. Tente novamente.');

      // Configura o mock para o estado 'error'
      mockedUseAuth.mockReturnValue({
        loginMutation: {
          mutate: mockMutate,
          isPending: false,
          isError: true,
          error: mockError,
        },
      } as unknown as MockUseAuthReturnValue);

      render(<LoginForm />);

      // Verifica se o título do alerta de erro é renderizado
      expect(screen.getByText(/erro no login/i)).toBeInTheDocument();
      // Verifica se a mensagem de erro específica é renderizada
      expect(
        screen.getByText('Credenciais inválidas. Tente novamente.')
      ).toBeInTheDocument();

      // O botão não deve estar em modo "loading"
      expect(
        screen.getByRole('button', { name: /entrar/i })
      ).not.toBeDisabled();
    });
  });
});