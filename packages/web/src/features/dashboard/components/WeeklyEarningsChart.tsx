import React, { useMemo } from 'react';
import { formatCurrency } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Interface de dados para o gráfico
export interface WeeklyEarningData {
  date: string; // ISO string ou 'YYYY-MM-DD'
  dayLabel: string; // Ex: 'Seg', 'Ter'
  amount: number;
}

interface WeeklyEarningsChartProps {
  data?: WeeklyEarningData[];
  isLoading?: boolean;
}

export function WeeklyEarningsChart({ 
  data = [], 
  isLoading = false 
}: WeeklyEarningsChartProps) {

  // Memoriza o valor máximo para calcular a escala relativa das barras
  const maxAmount = useMemo(() => {
    return Math.max(...data.map(d => d.amount), 0);
  }, [data]);

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Receita Semanal</CardTitle>
          <CardDescription>Carregando dados...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[200px] items-end justify-between gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-full w-full rounded-t-md opacity-20" style={{ height: `${Math.random() * 80 + 20}%` }} />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Receita Semanal</CardTitle>
        <CardDescription>
          Ganhos brutos dos últimos 7 dias
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-[200px] items-center justify-center text-muted-foreground">
            Dados insuficientes para exibir o gráfico.
          </div>
        ) : (
          // Container do Gráfico
          <div className="mt-4 h-[200px] w-full">
            <div className="flex h-full items-end gap-2 sm:gap-4">
              {data.map((item, index) => {
                // Evita divisão por zero se maxAmount for 0
                const percentage = maxAmount > 0 ? (item.amount / maxAmount) * 100 : 0;
                
                return (
                  <div 
                    key={index} 
                    className="group relative flex h-full flex-1 flex-col justify-end"
                  >
                    {/* Tooltip Customizado (aparece no hover) */}
                    <div className="absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 flex-col items-center rounded-md bg-popover px-2 py-1 text-xs shadow-md transition-all group-hover:flex z-10 border">
                      <span className="font-bold text-foreground">{formatCurrency(item.amount)}</span>
                      <span className="text-muted-foreground text-[10px]">{item.date.split('T')[0]}</span>
                    </div>

                    {/* A Barra */}
                    <div 
                      className="w-full rounded-t-md bg-primary/90 transition-all hover:bg-primary group-hover:opacity-90"
                      style={{ 
                        height: `${percentage}%`,
                        minHeight: item.amount > 0 ? '4px' : '0' // Garante visibilidade mínima se tiver valor
                      }} 
                    />

                    {/* Rótulo do Eixo X */}
                    <span className="mt-2 text-center text-xs font-medium text-muted-foreground truncate">
                      {item.dayLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}