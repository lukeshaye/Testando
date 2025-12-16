/**
 * /packages/api/src/features/dashboard/dashboard.handlers.test.ts
 *
 * Princípios de Implementação:
 * - PTE (2.15): Testabilidade Explícita - Testes unitários isolados com mocks.
 * - DIP (2.9): Inversão de Dependência - Depende de abstrações (Schema/Context).
 *
 * Atualização:
 * - Adicionado suporte ao campo 'attended' no mock de appointments para refletir a lógica de filtro de agendamentos realizados.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDashboardStats, getWeeklyChart } from './dashboard.handlers';
import { Context } from 'hono';

// [Passo 1 & 2] Mock dos schemas do DB refletindo a estrutura "Padrão Ouro"
vi.mock('@repo/db/schema', () => ({
  appointments: {
    userId: 'appointments.user_id',
    appointmentDate: 'appointments.appointment_date',
    amount: 'appointments.price',
    attended: 'appointments.attended', // <--- ADICIONADO: Necessário para o filtro .where(eq(..., true))
    createdAt: 'appointments.created_at',
    updatedAt: 'appointments.updated_at',
  },
  financialEntries: {
    userId: 'financial_entries.user_id',
    entryDate: 'financial_entries.entry_date',
    amount: 'financial_entries.amount',
    type: 'financial_entries.type',
    createdAt: 'financial_entries.created_at',
    updatedAt: 'financial_entries.updated_at',
  }
}));

// Helper para criar cadeia de mocks do Drizzle
const createMockChain = (resolvedValue: any) => {
  const chain: any = {
    from: vi.fn(() => chain),
    where: vi.fn(() => chain),
    groupBy: vi.fn(() => chain),
    orderBy: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    then: (resolve: any) => Promise.resolve(resolvedValue).then(resolve),
  };
  return chain;
};

// Mock da Instância do DB
const mockDb = {
  select: vi.fn(),
};

// Mock do Usuário
const mockUser = { id: 'user-123' };

// Mock do Contexto Hono
const createMockContext = () => ({
  var: {
    db: mockDb,
    user: mockUser,
  },
  json: vi.fn((data, status) => ({ data, status })),
} as unknown as Context<any>);

describe('Dashboard Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getDashboardStats', () => {
    it('deve calcular KPIs considerando apenas agendamentos REALIZADOS (attended=true)', async () => {
      const ctx = createMockContext();

      // Mock da Query 1 (Earnings)
      const mockEarningsResult = [{ total: 5000 }]; // 50,00
      const earningsChain = createMockChain(mockEarningsResult);

      // Mock da Query 2 (Appointments Count)
      // O handler agora aplica o filtro 'attended = true'.
      // O mock retorna 5, simulando que 5 agendamentos atenderam a esse critério.
      const mockCountResult = [{ count: 5 }];
      const countChain = createMockChain(mockCountResult);

      mockDb.select
        .mockReturnValueOnce(earningsChain)
        .mockReturnValueOnce(countChain);

      await getDashboardStats(ctx);

      // Verificações
      expect(mockDb.select).toHaveBeenCalledTimes(2);
      
      // Validação de Contrato:
      // dailyEarnings: 5000
      // attendedAppointments: 5 (Reflete o count do DB filtrado)
      // averageTicket: 5000 / 5 = 1000
      expect(ctx.json).toHaveBeenCalledWith({
        dailyEarnings: 5000,
        attendedAppointments: 5,
        averageTicket: 1000,
      });
    });

    it('deve retornar erro 500 se o DB falhar', async () => {
      const ctx = createMockContext();
      mockDb.select.mockImplementation(() => {
        throw new Error('DB Connection Failed');
      });

      await getDashboardStats(ctx);

      expect(ctx.json).toHaveBeenCalledWith(
        { error: 'Failed to fetch dashboard stats' },
        500
      );
    });
  });

  describe('getWeeklyChart', () => {
    it('deve retornar dados do gráfico formatados em camelCase', async () => {
      const ctx = createMockContext();

      const mockChartData = [
        { date: '2023-10-01', amount: 1000 },
        { date: '2023-10-02', amount: 2000 },
      ];
      
      const chartChain = createMockChain(mockChartData);
      mockDb.select.mockReturnValue(chartChain);

      await getWeeklyChart(ctx);

      expect(mockDb.select).toHaveBeenCalled();
      expect(ctx.json).toHaveBeenCalledWith([
        { date: '2023-10-01', amount: 1000 },
        { date: '2023-10-02', amount: 2000 },
      ]);
    });
  });
});