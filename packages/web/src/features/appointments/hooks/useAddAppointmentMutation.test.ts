/**
 * ARQUIVO: /packages/web/src/features/appointments/hooks/useAddAppointmentMutation.test.ts
 *
 * $$PLANO_DE_FEATURE$$
 * (REVISADO) - Tarefa 4.8: Feature - Appointments (CRUD Padrão)
 *
 * Testes para o hook useAddAppointmentMutation.
 * Conforme o Princípio do Teste Eficaz (PTE 2.15), este teste deve
 * zombar (mock) as chamadas de API (fetch) e verificar se:
 * 1. O 'fetch' é chamado com os dados TRANSFORMADOS (Date -> HH:MM string).
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
  // Inputs do formulário são objetos Date
  appointment_date: new Date('2025-10-20T14:00:00'),
  end_date: new Date('2025-10-20T15:00:00'),
  notes: 'Consulta de rotina',
};

// Resposta simulada da API (o que retorna após a criação)
const mockApiResponse = {
  id: 101,
  clientId: 1,
  professionalId: 1,
  serviceId: 1,
  appointmentDate: '2025-10-20',
  startTime: '14:00',
  endTime: '15:00',
  notes: 'Consulta de rotina',
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
    if (queryClient) {
      vi.mocked(queryClient.invalidateQueries).mockClear();
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Teste de sucesso (onSuccess e invalidação de cache)
  it('should transform data and call fetch with correct payload (PGEC 2.13 & PTE 2.15)', async () => {
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

    // 1. Verifica se o fetch foi chamado (PTE 2.15)
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Recupera a chamada para inspecionar o body
    const [url, options] = vi.mocked(global.fetch).mock.calls[0];
    
    expect(url).toBe('/api/appointments');
    expect(options?.method).toBe('POST');
    
    // Parse do body para verificar a transformação de dados (Date -> String HH:MM)
    const bodyPayload = JSON.parse(options?.body as string);

    // Verifica se os campos foram mapeados corretamente conforme o plano de correção
    expect(bodyPayload).toEqual(expect.objectContaining({
      clientId: 1,
      professionalId: 1,
      serviceId: 1,
      // A API espera 'appointmentDate' (camelCase) e strings de hora separadas
      // O hook deve extrair YYYY-MM-DD e HH:MM dos objetos Date
      appointmentDate: expect.stringMatching(/2025-10-20/), 
      startTime: '14:00',
      endTime: '15:00',
      notes: 'Consulta de rotina'
    }));

    // Garante que os campos "crus" do formulário NÃO foram enviados
    expect(bodyPayload).not.toHaveProperty('appointment_date');
    expect(bodyPayload).not.toHaveProperty('end_date');

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

    result.current.mutate(mockFormData);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error.message).toBe(errorResponse.message);
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

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error.message).toBe(
      'Falha ao adicionar o agendamento',
    );
    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
  });
});