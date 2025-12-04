import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import { authMiddleware } from './auth';

// Mocks para tipos e interfaces caso ainda não existam fisicamente durante a execução passo-a-passo
// Em produção, isso importaria de ../types e ./auth.adapter
type MockUser = { id: string; email: string };
interface MockAuthAdapter {
  validateToken(token: string): Promise<MockUser | null>;
}

describe('Auth Middleware', () => {
  // Helper para criar uma aplicação Hono mínima com o adaptador injetado
  const createTestApp = (mockValidateToken: any) => {
    const app = new Hono<{ Variables: { authAdapter: MockAuthAdapter; user: MockUser } }>();

    // Middleware de Injeção (Simula o injectorMiddleware)
    app.use('*', async (c, next) => {
      c.set('authAdapter', {
        validateToken: mockValidateToken,
      } as MockAuthAdapter);
      await next();
    });

    // Registrar a rota primeiro, depois aplicar o middleware
    // O middleware será executado antes do handler da rota
    app.get('/protected', authMiddleware, (c) => {
      const user = c.var.user;
      return c.json({ message: 'Success', user });
    });

    return app;
  };

  it('deve retornar 401 se nenhum token for fornecido', async () => {
    const mockValidate = vi.fn();
    const app = createTestApp(mockValidate);

    const res = await app.request('/protected');

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: 'Unauthorized', message: 'No token provided' });
    expect(mockValidate).not.toHaveBeenCalled();
  });

  it('deve retornar 401 se o token for inválido (adapter retorna null)', async () => {
    const mockValidate = vi.fn().mockResolvedValue(null);
    const app = createTestApp(mockValidate);

    const res = await app.request('/protected', {
      headers: { 'Authorization': 'Bearer invalid-token' },
    });

    expect(res.status).toBe(401);
    expect(mockValidate).toHaveBeenCalledWith('invalid-token');
    const body = await res.json();
    expect(body).toEqual({ error: 'Unauthorized', message: 'Invalid token' });
  });

  it('deve injetar o usuário e chamar next() se o token for válido', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const mockValidate = vi.fn().mockResolvedValue(mockUser);
    const app = createTestApp(mockValidate);

    const res = await app.request('/protected', {
      headers: { 'Authorization': 'Bearer valid-token' },
    });

    expect(res.status).toBe(200);
    expect(mockValidate).toHaveBeenCalledWith('valid-token');
    const body = await res.json();
    expect(body).toEqual({ message: 'Success', user: mockUser });
  });

  it('deve lidar corretamente com o prefixo Bearer no header', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const mockValidate = vi.fn().mockResolvedValue(mockUser);
    const app = createTestApp(mockValidate);

    // Teste com e sem espaço extra
    await app.request('/protected', {
      headers: { 'Authorization': 'Bearer token-raw' },
    });
    
    expect(mockValidate).toHaveBeenCalledWith('token-raw');
  });

  it('deve retornar 401 se o adaptador lançar um erro', async () => {
    const mockValidate = vi.fn().mockRejectedValue(new Error('Database connection failed'));
    const app = createTestApp(mockValidate);

    const res = await app.request('/protected', {
      headers: { 'Authorization': 'Bearer error-token' },
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: 'Unauthorized', message: 'Token validation failed' });
  });
});