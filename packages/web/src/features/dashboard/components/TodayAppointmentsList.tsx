import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// Interface de dados específica para a visualização (UI Model)
// Desacopla o componente da estrutura exata do banco de dados
export interface AppointmentSummary {
  id: string;
  clientName: string;
  serviceName: string;
  date: string | Date; // Aceita ISO string ou objeto Date
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELED' | 'ABSENT';
  clientAvatarUrl?: string;
}

interface TodayAppointmentsListProps {
  appointments?: AppointmentSummary[];
  isLoading?: boolean;
}

export function TodayAppointmentsList({ 
  appointments = [], 
  isLoading = false 
}: TodayAppointmentsListProps) {

  // Renderização do Estado de Carregamento (Skeleton)
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Agendamentos de Hoje</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[140px]" />
                  <Skeleton className="h-3 w-[100px]" />
                </div>
              </div>
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Agendamentos de Hoje</CardTitle>
      </CardHeader>
      <CardContent>
        {appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
            <div className="rounded-full bg-muted p-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6 text-muted-foreground"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            </div>
            <p className="text-sm text-muted-foreground">Nenhum agendamento para hoje.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {appointments.map((apt) => (
              <div key={apt.id} className="flex items-center justify-between">
                {/* Informações do Cliente e Serviço */}
                <div className="flex items-center space-x-4">
                  <Avatar>
                    <AvatarImage src={apt.clientAvatarUrl} alt={apt.clientName} />
                    <AvatarFallback>
                      {apt.clientName.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium leading-none">{apt.clientName}</p>
                    <p className="text-sm text-muted-foreground mt-1">{apt.serviceName}</p>
                  </div>
                </div>

                {/* Hora e Status */}
                <div className="flex flex-col items-end space-y-1">
                  <span className="text-sm font-medium tabular-nums">
                    {new Date(apt.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <StatusBadge status={apt.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Sub-componente interno para lógica de apresentação do badge
function StatusBadge({ status }: { status: string }) {
  let variant: "default" | "secondary" | "destructive" | "outline" = "default";
  let label = status;

  switch (status) {
    case 'SCHEDULED':
      variant = "outline";
      label = "Agendado";
      break;
    case 'COMPLETED':
      variant = "default"; // Geralmente verde ou cor primária dependendo do tema
      label = "Concluído";
      break;
    case 'CANCELED':
      variant = "destructive";
      label = "Cancelado";
      break;
    case 'ABSENT':
      variant = "secondary"; // Cinza para indicar neutralidade/falta
      label = "Ausente";
      break;
    default:
      variant = "outline";
      label = status;
  }

  return <Badge variant={variant}>{label}</Badge>;
}