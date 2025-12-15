/**
 * @file: api.test.ts
 * @description: Teste para a camada de abstração de API (Hono RPC).
 *
 * Princípio Testado: PTE (2.15)  - O teste verifica a infraestrutura de comunicação
 * mockando o 'fetch' subjacente, garantindo que o cliente 'api' está configurado corretamente.
 *
 * Atualização: Migrado de Jest para Vitest conforme o plano de correção.
 */

// Importa utilitários do Vitest (Substituindo globais do Jest)
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Importa o cliente 'api' real
import { api } from './api';

// 1. Mock do 'global.fetch'
// O cliente Hono RPC (hc) depende do fetch. Mockar o fetch global nos permite interceptar
// as chamadas de rede e testar a URL e os parâmetros.
// CORREÇÃO: Uso de vi.fn() em vez de jest.fn()
const mockFetch = vi.fn();

// Declara a mockagem do fetch no escopo global
// CORREÇÃO: Uso de vi.stubGlobal é a prática recomendada no Vitest, mas atribuição direta também funciona.
global.fetch = mockFetch as any;

// A resposta mockada deve simular uma resposta JSON válida
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
    // Limpa o mock do fetch antes de cada teste
    // CORREÇÃO: Reset de estado usando a instância do vi
    mockFetch.mockClear();
    
    // Garante que a resposta mockada é configurada para simular sucesso
    mockFetch.mockImplementation(createMockResponse);
  });

  it('deve exportar a instância do cliente Hono RPC', () => {
    // Verifica se o objeto 'api' foi exportado
    expect(api).toBeDefined();
    // O objeto 'api' deve ter as propriedades de um cliente Hono.
    // O teste verifica a existência de um método de chamada típico do hc.
    expect(typeof (api as any)['$get']).toBe('function');
  });

  it('deve fazer uma chamada GET com o prefixo "/api" (DIP, SoC)', async () => {
    // 1. Simula uma chamada GET na rota raiz (index) do cliente RPC.
    // Esta é a forma típica de chamar um endpoint RPC GET na raiz usando 'hc'.
    await (api as any).index.$get();

    // 2. Verifica se o fetch subjacente foi chamado
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // 3. Verifica se a URL de chamada inclui o prefixo "/api" (configurado em api.ts)
    // O Hono Client constrói a URL base + a rota.
    const calledUrl = mockFetch.mock.calls[0][0];

    // O teste verifica o prefixo básico.
    expect(calledUrl).toMatch(/^\/api\/.*/);

    // 4. Verifica se o método HTTP é GET
    const calledOptions = mockFetch.mock.calls[0][1];
    expect(calledOptions.method).toBe('GET');
  });
});