/**
 * @file: api.test.ts
 * @description: Teste para a camada de abstração de API (Hono RPC).
 *
 * Princípio Testado: PTE (2.15) - O teste verifica a infraestrutura de comunicação
 * mockando o 'fetch' subjacente para garantir o comportamento correto do cliente 'api'.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { api } from './api';

// Criação do mock para o fetch
const mockFetch = vi.fn();

// Configura o mock no escopo global usando a API do Vitest (Prática recomendada)
vi.stubGlobal('fetch', mockFetch);

// Helper para criar respostas de sucesso padronizadas (DRY)
const mockResponse = { message: 'Success from Hono RPC' };
const createMockResponse = () =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve(mockResponse),
    text: () => Promise.resolve(JSON.stringify(mockResponse)),
    headers: new Headers({ 'Content-Type': 'application/json' }),
  }) as unknown as Promise<Response>;

describe('API Client (Hono RPC)', () => {
  beforeEach(() => {
    // Limpa o estado do mock antes de cada teste para garantir isolamento
    mockFetch.mockClear();
    
    // Define o comportamento padrão de sucesso
    mockFetch.mockImplementation(createMockResponse);
  });

  afterEach(() => {
    // Opcional: Garante que mocks globais sejam resetados
    vi.clearAllMocks();
  });

  it('deve exportar a instância do cliente Hono RPC corretamente', () => {
    expect(api).toBeDefined();
    // Verifica se a estrutura do cliente possui o método base esperado ($get é comum no Hono Client)
    expect(typeof (api as any)['$get']).toBe('function');
  });

  it('deve realizar uma chamada GET utilizando o prefixo "/api" configurado (DIP)', async () => {
    // 1. Simula uma chamada RPC na rota index
    await (api as any).index.$get();

    // 2. Verifica se a abstração chamou o fetch
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // 3. Verifica se a URL foi construída corretamente com o prefixo
    const calledUrl = mockFetch.mock.calls[0][0];
    expect(calledUrl).toMatch(/^\/api\/.*/);

    // 4. Valida o método HTTP
    const calledOptions = mockFetch.mock.calls[0][1];
    expect(calledOptions.method).toBe('GET');
  });
});