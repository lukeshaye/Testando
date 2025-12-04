'use client';

import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  DollarSign,
  Calendar,
  TrendingUp,
} from 'lucide-react';

// --- Componentes de UI ---
import { KpiCard } from '@/packages/web/src/features/dashboard/components/KpiCard';
import { WeeklyEarningsChart } from '@/packages/web/src/features/dashboard/components/WeeklyEarningsChart';
import { TodayAppointmentsList, type AppointmentSummary } from '@/packages/web/src/features/dashboard/components/TodayAppointmentsList';

// --- Hooks de Dados do Dashboard ---
import { useDashboardKPIsQuery } from '@/packages/web/src/features/dashboard/hooks/useDashboardKPIsQuery';
import { useWeeklyEarningsQuery } from '@/packages/web/src/features/dashboard/hooks/useWeeklyEarningsQuery';
import { useTodayAppointmentsQuery } from '@/packages/web/src/features/dashboard/hooks/useTodayAppointmentsQuery';

// --- Hooks Auxiliares (para enriquecer dados com nomes) ---
import { useClientsQuery } from '@/packages/web/src/features/clientes/hooks/useClientsQuery';
import { useServicesQuery } from '@/packages/web/src/features/services/hooks/useServicesQuery';

// --- Utilitários ---
import { formatCurrency } from '@/packages/web/src/lib/utils';

export default function DashboardPage() {
  // 1. Busca de Dados (Hooks React Query)
  const { data: kpis, isLoading: isLoadingKpis } = useDashboardKPIsQuery();
  const { data: rawEarnings, isLoading: isLoadingChart } = useWeeklyEarningsQuery();
  const { data: rawAppointments, isLoading: isLoadingAppointments } = useTodayAppointmentsQuery();

  // Buscamos clientes e serviços para resolver os Nomes (ID -> Nome)
  // Em uma aplicação maior, isso poderia ser feito no backend (JOINs),
  // mas para manter o frontend desacoplado e ágil, resolvemos aqui ou usamos cache.
  const { data: clients } = useClientsQuery();
  const { data: services } = useServicesQuery();

  // 2. Processamento de Dados: KPIs
  const kpiList = [
    {
      title: 'Faturamento do Dia',
      // O formatCurrency do projeto já lida com centavos
      value: isLoadingKpis ? '...' : formatCurrency(kpis?.dailyEarnings || 0),
      icon: DollarSign,
      description: 'Total recebido hoje',
    },
    {
      title: 'Agendamentos',
      value: isLoadingKpis ? '...' : (kpis?.attendedAppointments || 0).toString(),
      icon: Calendar,
      description: 'Confirmados/Concluídos hoje',
    },
    {
      title: 'Ticket Médio',
      value: isLoadingKpis ? '...' : formatCurrency(kpis?.averageTicket || 0),
      icon: TrendingUp,
      description: 'Média por atendimento',
    },
  ];

  // 3. Processamento de Dados: Gráfico Semanal
  // Adiciona o rótulo do dia (ex: "SEG", "TER") baseado na data
  const chartData = useMemo(() => {
    if (!rawEarnings) return [];
    return rawEarnings.map((item: any) => ({
      date: item.date,
      amount: item.amount,
      // Formata a data ISO para dia da semana curto (ex: 'sex')
      dayLabel: format(new Date(item.date), 'EEE', { locale: ptBR }).toUpperCase().replace('.', ''),
    }));
  }, [rawEarnings]);

  // 4. Processamento de Dados: Agendamentos de Hoje
  // Mapeia os dados brutos da API (IDs) para o formato de visualização (Nomes)
  const enrichedAppointments: AppointmentSummary[] = useMemo(() => {
    if (!rawAppointments) return [];

    return rawAppointments.map((app: any) => {
      const client = clients?.find((c) => c.id === app.clientId);
      const service = services?.find((s) => s.id === app.serviceId);

      return {
        id: app.id.toString(),
        clientName: client?.name || 'Cliente não identificado',
        serviceName: service?.name || 'Serviço não identificado',
        // Usa 'appointmentDate' (do Drizzle Schema) ou fallback para agora
        date: app.appointmentDate || new Date().toISOString(),
        // Mapeia o booleano 'attended' ou status para o Enum da UI
        status: app.attended ? 'COMPLETED' : 'SCHEDULED', 
        clientAvatarUrl: undefined, 
      };
    });
  }, [rawAppointments, clients, services]);

  return (
    <div className="space-y-6 p-6 pb-20">
      {/* Cabeçalho da Página */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Visão Geral</h1>
        <p className="text-muted-foreground">
          Acompanhe o desempenho do seu negócio em tempo real.
        </p>
      </div>

      {/* Grade de KPIs (Indicadores) */}
      <div className="grid gap-4 md:grid-cols-3">
        {kpiList.map((kpi, i) => (
          <KpiCard
            key={i}
            title={kpi.title}
            value={kpi.value}
            icon={kpi.icon}
            description={kpi.description}
            isLoading={isLoadingKpis}
          />
        ))}
      </div>

      {/* Grade Principal: Gráfico e Lista */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        
        {/* Coluna Esquerda (Gráfico) - Ocupa 4/7 em telas grandes */}
        <div className="col-span-4">
          <WeeklyEarningsChart
            data={chartData}
            isLoading={isLoadingChart}
          />
        </div>

        {/* Coluna Direita (Agendamentos) - Ocupa 3/7 em telas grandes */}
        <div className="col-span-3">
          <TodayAppointmentsList
            appointments={enrichedAppointments}
            isLoading={isLoadingAppointments}
          />
        </div>
      </div>
    </div>
  );
}