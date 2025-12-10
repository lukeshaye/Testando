import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
// Nota: Removemos a importação estática do middleware para permitir o reset de módulos
// import { injectorMiddleware, errorHandler } from './middleware'; 

// Mocks das dependências externas
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
    // CRÍTICO: Reseta o registro de módulos para garantir que variáveis globais/singletons
    // no arquivo middleware.ts sejam recriadas a cada teste.
    // Isso evita que o estado de um teste vaze para o outro (Princípio 2.15 - Testabilidade).
    vi.resetModules();
    
    app = new Hono();
    vi.clearAllMocks();
  });

  describe('injectorMiddleware', () => {
    it('deve instanciar clientes (Singleton) e injetar dependências no contexto (c.var)', async () => {
      // Importação dinâmica para garantir que pegamos uma versão "fresca" do módulo após o resetModules
      const { injectorMiddleware } = await import('./middleware');

      // 1. Configurar rota de teste que usa o middleware
      app.use('*', injectorMiddleware);
      app.get('/test-injection', (c) => {
        return c.json({
          db: c.var.db,
          authAdapter: c.var.authAdapter,
        });
      });

      // 2. Executar request
      const env = {
        DATABASE_URL: 'postgres://mock',
        AUTH_PROVIDER_URL: 'https://mock.supabase.co',
        AUTH_PROVIDER_KEY: 'mock-key',
      };

      const res = await app.request('/test-injection', {}, env);
      const data = await res.json();

      // 3. Asserções
      expect(res.status).toBe(200);
      
      // Verifica se o DB foi injetado corretamente
      expect(data.db).toBe('mock-db-instance');
      
      // Verifica se o AuthAdapter foi injetado corretamente
      expect(data.authAdapter).toEqual(expect.objectContaining({
        name: 'mock-auth-adapter'
      }));
    });
  });

  describe('errorHandler (Global)', () => {
    it('deve capturar erros lançados nas rotas e retornar 500 em JSON estruturado', async () => {
      // Importação dinâmica
      const { errorHandler } = await import('./middleware');

      // 1. Registrar o handler global
      app.onError(errorHandler);

      // 2. Rota que lança erro
      app.get('/error', (c) => {
        throw new Error('Test Error Message');
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const res = await app.request('/error');
      
      expect(res.status).toBe(500);
      
      const contentType = res.headers.get('content-type');
      expect(contentType).toContain('application/json');
      
      const body = await res.json();

      expect(body).toEqual({
        success: false,
        error: 'Test Error Message',
      });

      consoleSpy.mockRestore();
    });

    it('deve retornar mensagem padrão se o erro não tiver message', async () => {
      const { errorHandler } = await import('./middleware');

      app.onError(errorHandler);
      app.get('/unknown-error', (c) => {
        throw new Error();
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const res = await app.request('/unknown-error');
      
      expect(res.status).toBe(500);
      
      const body = await res.json();
      
      expect(body).toEqual({
        success: false,
        error: 'Internal Server Error',
      });

      consoleSpy.mockRestore();
    });
  });
});