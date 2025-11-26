/**
 * ARQUIVO: /packages/web/src/features/appointments/hooks/useAddAppointmentMutation.test.ts
 *
 * $$PLANO_DE_FEATURE$$
 * (REVISADO) - Tarefa 4.8: Feature - Appointments (CRUD Padrão)
 *
 * Testes para o hook useAddAppointmentMutation.
 * Conforme o Princípio do Teste Eficaz (PTE 2.15), este teste deve
 * zombar (mock) as chamadas de API (fetch) e verificar se:
 * 1. O 'fetch' é chamado com os dados corretos (método POST, body).
 * 2. As queries são invalidadas no 'onSuccess' (PGEC 2.13).
 * 3. O estado de erro é tratado corretamente.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAddAppointmentMutation } from './useAddAppointmentMutation';
import { z } from 'zod';
import { AppointmentFormSchema } from '@/packages/shared-types';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';

// Define o tipo de dados do formulário com base no schema Zod
type AppointmentFormData = z.infer<typeof AppointmentFormSchema>;

// 1. Mock de Dados
const mockFormData: AppointmentFormData = {
  clientId: 1,
  professionalId: 1,
  serviceId: 1,
  // Zod schema espera 'Date', que será stringificado para ISO no fetch
  appointment_date: new Date('2025-10-20T14:00:00Z'),
  end_date: new Date('2025-10-20T15:00:00Z'),
  notes: 'Consulta de rotina',
};

const mockApiResponse = {
  id: 101,
  ...mockFormData,
  start: mockFormData.appointment_date.toISOString(), // API geralmente retorna ISO
  end: mockFormData.end_date.toISOString(), // API geralmente retorna ISO
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// 2. Helper para criar o wrapper do React Query
let queryClient: QueryClient;

const createWrapper = () => {
  queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  // Espiona a função de invalidação para o teste de PGEC (2.13)
  vi.spyOn(queryClient, 'invalidateQueries');

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// 3. Mock global do fetch
global.fetch = vi.fn();

describe('useAddAppointmentMutation (PTE 2.15)', () => {
  beforeEach(() => {
    vi.mocked(global.fetch).mockClear();
    // Limpa o spy se o queryClient foi criado em um teste anterior
    if (queryClient) {
      vi.mocked(queryClient.invalidateQueries).mockClear();
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Teste de sucesso (onSuccess e invalidação de cache)
  it('should call fetch with POST and invalidate queries on success (PGEC 2.13)', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    } as Response);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useAddAppointmentMutation(), {
      wrapper,
    });

    // Executa a mutação
    result.current.mutate(mockFormData);

    // Aguarda a mutação ser bem-sucedida
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // 1. Verifica se o fetch foi chamado corretamente
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith('/api/appointments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // Verifica se o body foi stringificado corretamente (datas viram ISO)
      body: JSON.stringify(mockFormData),
    });

    // 2. Verifica o PGEC (2.13): invalidação de cache
    expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(1);
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['appointments'],
    });

    // 3. Verifica o resultado
    expect(result.current.data).toEqual(mockApiResponse);
  });

  // Teste de estado de erro (falha na API)
  it('should return an error if the fetch call fails', async () => {
    const errorResponse = { message: 'Erro ao criar agendamento' };
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: async () => errorResponse,
      status: 400,
    } as Response);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useAddAppointmentMutation(), {
      wrapper,
    });

    // Executa a mutação
    result.current.mutate(mockFormData);

    // Aguarda a mutação falhar
    await waitFor(() => expect(result.current.isError).toBe(true));

    // 1. Verifica a mensagem de erro
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error.message).toBe(errorResponse.message);

    // 2. Verifica se o cache NÃO foi invalidado
    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
  });

  // Teste de estado de erro (falha no parse do JSON de erro)
  it('should return default error message if error response parsing fails', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: async () => {
        throw new Error('JSON parse error');
      },
      status: 500,
    } as Response);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useAddAppointmentMutation(), {
      wrapper,
    });

    result.current.mutate(mockFormData);

    await waitFor(() => expect(result.current.isError).toBe(true));

    // Verifica se a mensagem de fallback foi usada
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error.message).toBe(
      'Falha ao adicionar o agendamento',
    );
    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
  });
});