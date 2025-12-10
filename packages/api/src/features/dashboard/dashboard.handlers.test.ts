/**
 * /packages/api/src/features/dashboard/dashboard.handlers.test.ts
 *
 * Princípios de Implementação:
 * - PTE (2.15): Testabilidade Explícita - Testes unitários isolados com mocks.
 * - DIP (2.9): Inversão de Dependência - Depende de abstrações (Schema/Context), não do DB real.
 * - DRY (2.2): Reutilização da cadeia de mocks do Drizzle.
 *
 * Contexto da Refatoração (Padrão Ouro):
 * - O Mock do Schema reflete a Camada 1 (DB snake_case -> TS camelCase).
 * - Os testes validam se os handlers retornam JSON em camelCase (Camada 3).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDashboardStats, getWeeklyChart } from './dashboard.handlers';
import { Context } from 'hono';

// [Passo 1 & 2] Mock dos schemas do DB refletindo a estrutura "Padrão Ouro"
// Propriedades em camelCase (código) -> Colunas em snake_case (banco)
vi.mock('@repo/db/schema', () => ({
  appointments: {
    userId: 'appointments.user_id',
    appointmentDate: 'appointments.appointment_date',
    amount: 'appointments.price', // Mapeamento explícito se a coluna for 'price'
    createdAt: 'appointments.created_at', // Coluna de auditoria obrigatória
    updatedAt: 'appointments.updated_at', // Coluna de auditoria obrigatória
  },
  financialEntries: {
    userId: 'financial_entries.user_id',
    entryDate: 'financial_entries.entry_date',
    amount: 'financial_entries.amount',
    type: 'financial_entries.type',
    createdAt: 'financial_entries.created_at', // Coluna de auditoria obrigatória
    updatedAt: 'financial_entries.updated_at', // Coluna de auditoria obrigatória
  }
}));

// Helper para criar cadeia de mocks do Drizzle (Simula Query Builder)
const createMockChain = (resolvedValue: any) => {
  const chain: any = {
    from: vi.fn(() => chain),
    where: vi.fn(() => chain),
    groupBy: vi.fn(() => chain),
    orderBy: vi.fn(() => chain),
    limit: vi.fn(() => chain), // Adicionado caso seja usado
    // Simula a resolução da Promise ao final da cadeia
    then: (resolve: any) => Promise.resolve(resolvedValue).then(resolve),
  };
  return chain;
};

// Mock da Instância do DB
const mockDb = {
  select: vi.fn(),
};

// Mock do Usuário (Simulando Auth Middleware)
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
    it('deve calcular KPIs corretamente e retornar chaves em camelCase (sucesso)', async () => {
      const ctx = createMockContext();

      // Mock da Query 1 (Earnings)
      // O DB retorna valores brutos, o handler calcula a lógica
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

      // Validação PTE (2.15): Verifica interações
      expect(mockDb.select).toHaveBeenCalledTimes(2);
      
      // Validação de Contrato (Passo 3): O retorno deve ser estritamente camelCase
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
    it('deve retornar dados do gráfico formatados em camelCase', async () => {
      const ctx = createMockContext();

      // [Passo 3] O Handler agora deve retornar objetos já em camelCase,
      // pois o Drizzle faz o mapeamento automático baseado no Schema.
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
      
      // Garante que o frontend receberá camelCase limpo
      expect(ctx.json).toHaveBeenCalledWith([
        { date: '2023-10-01', amount: 1000 },
        { date: '2023-10-02', amount: 2000 },
      ]);
    });
  });
});