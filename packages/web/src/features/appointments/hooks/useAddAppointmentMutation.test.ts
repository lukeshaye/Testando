/**
 * ARQUIVO: /packages/web/src/features/appointments/hooks/useAddAppointmentMutation.test.ts
 *
 * $$PLANO_DE_FEATURE$$
 * (REVISADO) - Tarefa 4.8: Feature - Appointments (CRUD Padrão)
 *
 * Testes para o hook useAddAppointmentMutation.
 * ATUALIZADO conforme Plano de Correção 3 e Princípios Mandatórios.
 *
 * Mudanças:
 * 1. Mock do cliente RPC (@/lib/api) em vez de global.fetch (DIP 2.9).
 * 2. Validação estrita de ISO Strings no payload (KISS 2.23).
 * 3. Garantia de tipagem numérica para IDs.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAddAppointmentMutation } from './useAddAppointmentMutation';
import { z } from 'zod';
import { AppointmentFormSchema } from '@/packages/shared-types';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api } from '@/lib/api'; // Importa o cliente para ser mockado
import React from 'react';

// Define o tipo de dados do formulário com base no schema Zod
type AppointmentFormData = z.infer<typeof AppointmentFormSchema>;

// 1. Mock do Módulo API (DIP 2.9)
// Em vez de mockar fetch, mockamos a abstração do cliente Hono RPC
vi.mock('@/lib/api', () => ({
  api: {
    appointments: {
      $post: vi.fn(),
    },
  },
}));

// 2. Mock de Dados
const mockFormData: AppointmentFormData = {
  clientId: 1,
  professionalId: 1,
  serviceId: 1,
  // Inputs do formulário são objetos Date (controle de estado local)
  appointment_date: new Date('2025-10-20T14:00:00.000Z'),
  end_date: new Date('2025-10-20T15:00:00.000Z'),
  notes: 'Consulta de rotina',
  price: 100
};

// Resposta simulada da API
const mockApiResponse = {
  id: 101,
  clientId: 1,
  professionalId: 1,
  serviceId: 1,
  appointmentDate: '2025-10-20T14:00:00.000Z',
  endDate: '2025-10-20T15:00:00.000Z',
  notes: 'Consulta de rotina',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// 3. Helper para criar o wrapper do React Query
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

describe('useAddAppointmentMutation (PTE 2.15)', () => {
  beforeEach(() => {
    vi.clearAllMocks(); // Limpa mocks do api e do queryClient
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Teste de sucesso (onSuccess e invalidação de cache)
  it('should call api.$post with ISO strings and numeric IDs (DIP 2.9 & PTE 2.15)', async () => {
    // Configura o mock do cliente Hono RPC para sucesso
    vi.mocked(api.appointments.$post).mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    } as any);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useAddAppointmentMutation(), {
      wrapper,
    });

    // Executa a mutação
    result.current.mutate(mockFormData);

    // Aguarda a mutação ser bem-sucedida
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // 1. Verifica se o cliente API foi chamado (PTE 2.15)
    expect(api.appointments.$post).toHaveBeenCalledTimes(1);

    // Captura o argumento passado para o $post
    const callArgs = vi.mocked(api.appointments.$post).mock.calls[0][0];
    const payload = callArgs.json;

    // VERIFICAÇÃO CRÍTICA DO PLANO DE CORREÇÃO 3:
    // O hook deve enviar os dados formatados corretamente para o backend
    expect(payload).toEqual(expect.objectContaining({
      clientId: 1,       // Number
      professionalId: 1, // Number
      serviceId: 1,      // Number
      notes: 'Consulta de rotina',
      price: 100
    }));

    // Verifica transformação de Date para ISO String
    expect(payload.appointmentDate).toBe(mockFormData.appointment_date.toISOString());
    expect(payload.endDate).toBe(mockFormData.end_date.toISOString());

    // Garante que campos antigos e "crus" NÃO foram enviados (Limpeza/KISS)
    expect(payload).not.toHaveProperty('startTime');       // Removido
    expect(payload).not.toHaveProperty('endTime');         // Removido
    expect(payload).not.toHaveProperty('appointment_date'); // Snake case local
    expect(payload).not.toHaveProperty('end_date');         // Snake case local

    // 2. Verifica o PGEC (2.13): invalidação de cache
    expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(1);
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['appointments'],
    });

    // 3. Verifica o resultado retornado pelo hook
    expect(result.current.data).toEqual(mockApiResponse);
  });

  // Teste de estado de erro (falha na API)
  it('should return an error if the api call fails', async () => {
    const errorResponse = { message: 'Erro ao criar agendamento' };
    
    // Configura mock para erro (ok: false)
    vi.mocked(api.appointments.$post).mockResolvedValue({
      ok: false,
      json: async () => errorResponse,
      status: 400,
    } as any);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useAddAppointmentMutation(), {
      wrapper,
    });

    result.current.mutate(mockFormData);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(Error);
    // Assumindo que seu hook trata o erro extraindo a mensagem
    expect(result.current.error.message).toBe(errorResponse.message);
    
    // Invalidação não deve ocorrer em erro
    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
  });
});