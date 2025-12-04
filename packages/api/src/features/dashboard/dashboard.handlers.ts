/**
 * /packages/api/src/features/dashboard/dashboard.handlers.ts
 *
 * (Executor: Implementação da Feature Dashboard)
 *
 * Responsabilidade: Lógica de negócios para cálculo de KPIs e Gráficos.
 * Princípios:
 * - DIP (2.9): Usa c.var.db (Drizzle) e c.var.user.
 * - Tenancy (2.16): Filtra estritamente por user.id.
 */

import { Context } from 'hono';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { appointments, financialEntries } from '@repo/db/schema';
import { Variables } from '../../types';

type HandlerContext = Context<{ Variables: Variables }>;

/**
 * GET /stats
 * Retorna estatísticas do dia atual: Faturamento, Agendamentos e Ticket Médio.
 */
export const getDashboardStats = async (c: HandlerContext) => {
  const db = c.var.db;
  const user = c.var.user;

  // Definir intervalo do dia atual para filtrar agendamentos
  const now = new Date();
  const startOfDay = new Date(now.setHours(0, 0, 0, 0));
  const endOfDay = new Date(now.setHours(23, 59, 59, 999));
  
  // Para financial_entries (tipo date YYYY-MM-DD)
  const todayString = startOfDay.toISOString().split('T')[0];

  try {
    // 1. Calcular Faturamento do Dia (Financial Entries)
    // Soma apenas entradas do tipo 'receita' para a data de hoje
    const earningsResult = await db
      .select({ 
        total: sql<number>`sum(${financialEntries.amount})` 
      })
      .from(financialEntries)
      .where(
        and(
          eq(financialEntries.userId, user.id),
          eq(financialEntries.entryDate, todayString),
          eq(financialEntries.type, 'receita')
        )
      );
    
    const dailyEarnings = Number(earningsResult[0]?.total) || 0;

    // 2. Contar Agendamentos do Dia (Appointments)
    const appointmentsResult = await db
      .select({ 
        count: sql<number>`count(*)` 
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.userId, user.id),
          gte(appointments.appointmentDate, startOfDay),
          lte(appointments.appointmentDate, endOfDay)
        )
      );

    const appointmentsCount = Number(appointmentsResult[0]?.count) || 0;

    // 3. Calcular Ticket Médio
    const averageTicket = appointmentsCount > 0 
      ? Math.round(dailyEarnings / appointmentsCount) 
      : 0;

    return c.json({
      dailyEarnings,
      attendedAppointments: appointmentsCount,
      averageTicket,
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return c.json({ error: 'Failed to fetch dashboard stats' }, 500);
  }
};

/**
 * GET /chart
 * Retorna dados financeiros dos últimos 7 dias para o gráfico.
 */
export const getWeeklyChart = async (c: HandlerContext) => {
  const db = c.var.db;
  const user = c.var.user;

  // Data de 7 dias atrás
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const dateString = sevenDaysAgo.toISOString().split('T')[0];

  try {
    // Agrega as receitas por dia
    const chartData = await db
      .select({
        date: financialEntries.entryDate,
        amount: sql<number>`sum(${financialEntries.amount})`.mapWith(Number)
      })
      .from(financialEntries)
      .where(
        and(
          eq(financialEntries.userId, user.id),
          gte(financialEntries.entryDate, dateString),
          eq(financialEntries.type, 'receita')
        )
      )
      .groupBy(financialEntries.entryDate)
      .orderBy(financialEntries.entryDate);

    // Formata o retorno para o frontend
    // O frontend espera: { date: string, amount: number, dayLabel: string }
    // O dayLabel pode ser tratado no front, aqui retornamos os dados brutos.
    const formattedData = chartData.map(item => ({
      date: item.date,
      amount: item.amount || 0,
      // dayLabel será gerado no frontend via date-fns/Intl
    }));

    return c.json(formattedData);

  } catch (error) {
    console.error('Error fetching weekly chart:', error);
    return c.json({ error: 'Failed to fetch chart data' }, 500);
  }
};