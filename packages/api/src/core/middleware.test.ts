import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { injectorMiddleware, errorHandler } from './middleware';

// Mocks das dependências externas para isolar o teste do middleware
vi.mock('./db', () => ({
  createDbClient: vi.fn(() => 'mock-db-instance'),
  createAuthClient: vi.fn(() => 'mock-auth-client-instance'),
}));

vi.mock('../adapters/supabase-auth.adapter', () => ({
  SupabaseAuthAdapter: vi.fn().mockImplementation((client) => ({
    name: 'mock-auth-adapter',
    client: client
  })),
}));

// Mock para Types
type Bindings = {
  DATABASE_URL: string;
  AUTH_PROVIDER_URL: string;
  AUTH_PROVIDER_KEY: string;
};

type Variables = {
  db: any;
  authAdapter: any;
};

describe('Core Middleware', () => {
  let app: Hono<{ Bindings: Bindings; Variables: Variables }>;

  beforeEach(() => {
    app = new Hono();
    vi.clearAllMocks();
  });

  describe('injectorMiddleware', () => {
    it('deve instanciar clientes e injetar dependências no contexto (c.var)', async () => {
      // 1. Configurar rota de teste que usa o middleware
      app.use('*', injectorMiddleware);
      app.get('/test-injection', (c) => {
        // Retorna o que foi injetado para verificação
        return c.json({
          db: c.var.db,
          authAdapter: c.var.authAdapter,
        });
      });

      // 2. Executar request simulando variáveis de ambiente
      const env = {
        DATABASE_URL: 'postgres://mock',
        AUTH_PROVIDER_URL: 'https://mock.supabase.co',
        AUTH_PROVIDER_KEY: 'mock-key',
      };

      const res = await app.request('/test-injection', {}, env);
      const data = await res.json();

      // 3. Asserções
      expect(res.status).toBe(200);
      
      // Verifica se o DB foi injetado (retorno do mock createDbClient)
      expect(data.db).toBe('mock-db-instance');
      
      // Verifica se o AuthAdapter foi injetado (retorno do mock SupabaseAuthAdapter)
      // O mock retorna um objeto { name: 'mock-auth-adapter', client: ... }
      expect(data.authAdapter).toEqual(expect.objectContaining({
        name: 'mock-auth-adapter'
      }));
    });
  });

  describe('errorHandler (Global)', () => {
    it('deve capturar erros lançados nas rotas e retornar 500 em JSON estruturado', async () => {
      // 1. Registrar o handler global de erro do Hono
      app.onError(errorHandler);

      // 2. Rota que lança erro propositalmente
      app.get('/error', (c) => {
        throw new Error('Test Error Message');
      });

      // Supressão temporária do console.error para não poluir o output do teste
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const res = await app.request('/error');
      
      expect(res.status).toBe(500);
      
      // O errorHandler retorna JSON (c.json sempre retorna JSON no Hono)
      // Verificar content-type para garantir que é JSON
      const contentType = res.headers.get('content-type');
      expect(contentType).toContain('application/json');
      
      const body = await res.json();

      expect(body).toEqual({
        success: false,
        error: 'Test Error Message',
      });

      // Restaurar console
      consoleSpy.mockRestore();
    });

    it('deve retornar mensagem padrão se o erro não tiver message', async () => {
      app.onError(errorHandler);
      app.get('/unknown-error', (c) => {
        // Lança um Error sem mensagem explícita para simular erro genérico
        throw new Error();
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const res = await app.request('/unknown-error');
      
      expect(res.status).toBe(500);
      
      // Verificar content-type para garantir que é JSON
      const contentType = res.headers.get('content-type');
      expect(contentType).toContain('application/json');
      
      const body = await res.json();
      
      expect(body).toEqual({
        success: false,
        error: 'Internal Server Error',
      });

      consoleSpy.mockRestore();
    });
  });
});