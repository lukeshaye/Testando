/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signInHandler, signUpHandler } from './auth.handlers';
import { IAuthAdapter, AuthUser } from '../../core/auth.adapter';
import { Context } from 'hono';

// --- Mocks ---

const mockCredentials = {
  email: 'test@example.com',
  password: 'password123',
};

const mockUser: AuthUser = {
  id: 'user-uuid-123',
  email: 'test@example.com',
};

const mockAuthResult = {
  user: mockUser,
  token: 'mock-jwt-token',
};

// Mock da dependência IAuthAdapter [Ref: 133]
const mockAuthAdapter: IAuthAdapter = {
  validateToken: vi.fn(),
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
};

// Tipo parcial para mocar o contexto Hono
type MockContext = Partial<Context> & {
  var: {
    authAdapter: IAuthAdapter;
  };
  req: {
    valid: (target: 'json') => any;
  };
  json: (data: any, status?: number) => Response;
};

// Mock do Contexto Hono
const mockContext = {
  var: {
    authAdapter: mockAuthAdapter,
  },
  req: {
    valid: vi.fn(() => mockCredentials),
  },
  json: vi.fn((data) => new Response(JSON.stringify(data))),
} as unknown as MockContext;

// Resetar mocks antes de cada teste
beforeEach(() => {
  vi.clearAllMocks();
  // Resetar implementações de mock
  mockAuthAdapter.signIn.mockResolvedValue(mockAuthResult);
  mockAuthAdapter.signUp.mockResolvedValue(mockAuthResult);
  mockContext.req.valid.mockReturnValue(mockCredentials);
});

// --- Testes ---

describe('Auth Handlers', () => {
  describe('signInHandler', () => {
    it('deve chamar authAdapter.signIn e retornar usuário/token com status 200 em caso de sucesso', async () => {
      await signInHandler(mockContext as any);

      // Verifica se os dados validados foram lidos
      expect(mockContext.req.valid).toHaveBeenCalledWith('json');
      // Verifica se o método correto do adaptador foi chamado [Ref: 133]
      expect(mockAuthAdapter.signIn).toHaveBeenCalledWith(mockCredentials);
      // Verifica a resposta de sucesso
      expect(mockContext.json).toHaveBeenCalledWith(mockAuthResult, 200);
    });

    it('deve retornar 401 se authAdapter.signIn retornar null (credenciais inválidas)', async () => {
      // Configura o mock para falha (credenciais inválidas)
      mockAuthAdapter.signIn.mockResolvedValue(null);

      await signInHandler(mockContext as any);

      expect(mockAuthAdapter.signIn).toHaveBeenCalledWith(mockCredentials);
      expect(mockContext.json).toHaveBeenCalledWith(
        { error: 'Invalid email or password' },
        401,
      );
    });

    it('deve retornar 500 se authAdapter.signIn lançar uma exceção', async () => {
      const error = new Error('Database connection error');
      mockAuthAdapter.signIn.mockRejectedValue(error);

      await signInHandler(mockContext as any);

      expect(mockContext.json).toHaveBeenCalledWith(
        { error: 'Sign-in failed', message: error.message },
        500,
      );
    });
  });

  describe('signUpHandler', () => {
    it('deve chamar authAdapter.signUp e retornar usuário/token com status 201 em caso de sucesso', async () => {
      await signUpHandler(mockContext as any);

      // Verifica se os dados validados foram lidos
      expect(mockContext.req.valid).toHaveBeenCalledWith('json');
      // Verifica se o método correto do adaptador foi chamado [Ref: 133]
      expect(mockAuthAdapter.signUp).toHaveBeenCalledWith(mockCredentials);
      // Verifica a resposta de sucesso (201 Created)
      expect(mockContext.json).toHaveBeenCalledWith(mockAuthResult, 201);
    });

    it('deve retornar 400 se authAdapter.signUp retornar null (ex: usuário já existe)', async () => {
      // Configura o mock para falha (ex: usuário já existe)
      mockAuthAdapter.signUp.mockResolvedValue(null);

      await signUpHandler(mockContext as any);

      expect(mockAuthAdapter.signUp).toHaveBeenCalledWith(mockCredentials);
      expect(mockContext.json).toHaveBeenCalledWith(
        { error: 'Could not create user' },
        400,
      );
    });

    it('deve retornar 500 se authAdapter.signUp lançar uma exceção', async () => {
      const error = new Error('Validation constraint failed');
      mockAuthAdapter.signUp.mockRejectedValue(error);

      await signUpHandler(mockContext as any);

      expect(mockContext.json).toHaveBeenCalledWith(
        { error: 'Sign-up failed', message: error.message },
        500,
      );
    });
  });
});