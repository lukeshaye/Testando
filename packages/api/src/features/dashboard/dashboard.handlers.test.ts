/**
 * /packages/api/src/features/dashboard/dashboard.handlers.test.ts
 *
 * Princípios:
 * - PTE (2.15): Testes isolados com mocks.
 * - DIP (2.9): Testa a injeção do DB e Auth.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDashboardStats, getWeeklyChart } from './dashboard.handlers';
import { Context } from 'hono';

// Mock dos schemas do DB
vi.mock('@repo/db/schema', () => ({
  appointments: {
    userId: 'appointments.user_id',
    appointmentDate: 'appointments.appointment_date',
    amount: 'appointments.price',
  },
  financialEntries: {
    userId: 'financial_entries.user_id',
    entryDate: 'financial_entries.entry_date',
    amount: 'financial_entries.amount',
    type: 'financial_entries.type',
  }
}));

// Helper para criar cadeia de mocks do Drizzle
const createMockChain = (resolvedValue: any) => {
  const chain: any = {
    from: vi.fn(() => chain),
    where: vi.fn(() => chain),
    groupBy: vi.fn(() => chain),
    orderBy: vi.fn(() => chain),
    // Simula a resolução da Promise
    then: (resolve: any) => Promise.resolve(resolvedValue).then(resolve),
  };
  return chain;
};

// Mock do DB
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
    it('deve calcular KPIs corretamente (sucesso)', async () => {
      const ctx = createMockContext();

      // Mock da Query 1 (Earnings)
      const mockEarningsResult = [{ total: 5000 }]; // 5000 centavos
      const earningsChain = createMockChain(mockEarningsResult);

      // Mock da Query 2 (Appointments Count)
      const mockCountResult = [{ count: 5 }];
      const countChain = createMockChain(mockCountResult);

      // Configura o mockDb.select para retornar as cadeias em sequência
      mockDb.select
        .mockReturnValueOnce(earningsChain) // Primeira chamada: Earnings
        .mockReturnValueOnce(countChain);   // Segunda chamada: Count

      await getDashboardStats(ctx);

      // Verifica as chamadas ao DB
      expect(mockDb.select).toHaveBeenCalledTimes(2);
      
      // Verifica o retorno JSON calculado
      // Ticket Médio: 5000 / 5 = 1000
      expect(ctx.json).toHaveBeenCalledWith({
        dailyEarnings: 5000,
        attendedAppointments: 5,
        averageTicket: 1000,
      });
    });

    it('deve retornar erro 500 se o DB falhar', async () => {
      const ctx = createMockContext();
      // Simula erro na primeira query
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
    it('deve retornar dados do gráfico formatados', async () => {
      const ctx = createMockContext();

      const mockChartData = [
        { date: '2023-10-01', amount: 1000 },
        { date: '2023-10-02', amount: 2000 },
      ];
      
      const chartChain = createMockChain(mockChartData);
      mockDb.select.mockReturnValue(chartChain);

      await getWeeklyChart(ctx);

      expect(mockDb.select).toHaveBeenCalled();
      expect(chartChain.from).toHaveBeenCalled();
      expect(chartChain.groupBy).toHaveBeenCalled();
      
      expect(ctx.json).toHaveBeenCalledWith([
        { date: '2023-10-01', amount: 1000 },
        { date: '2023-10-02', amount: 2000 },
      ]);
    });
  });
});