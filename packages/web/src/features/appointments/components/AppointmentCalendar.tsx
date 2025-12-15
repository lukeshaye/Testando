/*
 * /packages/web/src/features/appointments/components/AppointmentCalendar.tsx
 *
 * TAREFA: 3.2. AppointmentCalendar.tsx
 * CORREÇÃO: Padronização de dados (camelCase), correção de acesso a objetos aninhados
 * e correção crítica de importação de tipos do monorepo.
 */

import { useState, useMemo } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import localizedFormat from 'dayjs/plugin/localizedFormat';

import {
  Plus,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Scissors,
  User,
} from 'lucide-react';

// Hooks de Dados (Nível 3)
import { useAppointmentsQuery } from '../hooks/useAppointmentsQuery';
import { useDeleteAppointmentMutation } from '../hooks/useDeleteAppointmentMutation';
import { useProfessionalsQuery } from '@/features/professionals/hooks/useProfessionalsQuery';

// Componentes de UI (Nível 1)
import { AppointmentFormModal } from './AppointmentFormModal';
import { Button } from '@/packages/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/packages/ui/select';
import { Card, CardContent, CardHeader } from '@/packages/ui/card';
import { LoadingSpinner } from '@/packages/ui/loading-spinner';
import { ConfirmationModal } from '@/packages/ui/confirmation-modal';
import { useToast } from '@/packages/ui/use-toast';

// Tipos
// CORREÇÃO: Importação pelo nome do pacote no Monorepo (Item #6 do Plano)
import type { AppointmentType, ProfessionalType } from '@salonflow/shared-types';

// Configura o Day.js para português
dayjs.locale('pt-br');
dayjs.extend(localizedFormat);

// Template para o item selecionado no filtro de profissional
const SelectedProfessionalTemplate = ({
  professional,
}: {
  professional: ProfessionalType | { id: null; name: string; color?: string };
}) => {
  if (!professional || professional.id === null) {
    return (
      <span className="text-muted-foreground">Todos os Profissionais</span>
    );
  }
  return (
    <div className="flex items-center">
      <div
        className="w-4 h-4 rounded-full mr-2 flex-shrink-0"
        style={{
          backgroundColor: professional.color || 'hsl(var(--muted-foreground))',
        }}
      />
      <span>{professional.name}</span>
    </div>
  );
};

// Template para os itens na lista do filtro de profissional
const ProfessionalOptionTemplate = ({
  option,
}: {
  option: ProfessionalType | { id: null; name: string; color?: string };
}) => {
  const isAllProfessionals = option.id === null;
  const circleStyle = isAllProfessionals
    ? {
        backgroundImage:
          'linear-gradient(to right, hsl(var(--primary)), hsl(var(--secondary)))',
      }
    : {
        backgroundColor: option.color || 'hsl(var(--muted-foreground))',
      };

  return (
    <div className="flex items-center">
      <div
        className="w-4 h-4 rounded-full mr-2 flex-shrink-0"
        style={circleStyle}
      />
      <span>{option.name}</span>
    </div>
  );
};

export function AppointmentCalendar() {
  const { toast } = useToast();

  // --- 1. Estado de UI (Nível 1) ---
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<
    number | null
  >(null);

  // Estado para controle dos modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] =
    useState<AppointmentType | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] =
    useState<AppointmentType | null>(null);

  // --- 2. Consumo de Dados (Nível 3) ---
  const { data: appointments = [], isLoading: isLoadingAppointments } =
    useAppointmentsQuery({
      date: dayjs(selectedDate).format('YYYY-MM-DD'),
      professionalId: selectedProfessionalId,
    });

  const { data: professionals = [], isLoading: isLoadingProfessionals } =
    useProfessionalsQuery();

  const deleteMutation = useDeleteAppointmentMutation();

  const isLoading = isLoadingAppointments || isLoadingProfessionals;

  // --- 3. Lógica de UI e Memos ---

  // Opções para o filtro de profissionais
  const professionalOptions = useMemo(() => {
    const allOption: { id: null; name: string; color?: string } = {
      id: null,
      name: 'Todos os Profissionais',
    };
    return [allOption, ...professionals];
  }, [professionals]);

  // Agrupamento de agendamentos por hora (CamelCase mantido conforme plano)
  const groupedAppointments = useMemo(() => {
    const sortedAppointments = [...appointments].sort(
      (a, b) =>
        new Date(a.appointmentDate).getTime() -
        new Date(b.appointmentDate).getTime(),
    );

    return sortedAppointments.reduce(
      (acc, app) => {
        const time = dayjs(app.appointmentDate).format('HH:mm');
        if (!acc[time]) acc[time] = [];
        acc[time].push(app);
        return acc;
      },
      {} as Record<string, AppointmentType[]>,
    );
  }, [appointments]);

  // Formatação da data do cabeçalho
  const formatHeaderDate = (date: Date) => {
    if (!date) return 'Selecione uma data';
    return dayjs(date).format('dddd, D [de] MMMM');
  };

  // --- 4. Handlers de UI ---

  const handleDayNavigation = (direction: 'prev' | 'next') => {
    const newDate = dayjs(selectedDate)
      .add(direction === 'prev' ? -1 : 1, 'day')
      .toDate();
    setSelectedDate(newDate);
  };

  const handleOpenModal = (appointment?: AppointmentType) => {
    setEditingAppointment(appointment || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingAppointment(null);
  };

  const handleDeleteClick = (appointment: AppointmentType) => {
    setAppointmentToDelete(appointment);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!appointmentToDelete) return;

    deleteMutation.mutate(appointmentToDelete.id, {
      onSuccess: () => {
        toast({
          title: 'Agendamento removido!',
          variant: 'success',
        });
        setIsDeleteModalOpen(false);
        setAppointmentToDelete(null);
      },
      onError: (error) => {
        toast({
          title: 'Falha ao remover',
          description: error.message,
          variant: 'destructive',
        });
        setIsDeleteModalOpen(false);
      },
    });
  };

  // --- 5. Renderização (Princípio CDA) ---
  return (
    <div className="px-4 sm:px-6 lg:px-8 pb-24 lg:pb-8">
      {/* Cabeçalho e Ações */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Agenda</h1>
          <p className="mt-2 text-muted-foreground">
            Visualize e gerencie os seus agendamentos
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          {/* Filtro de Profissional */}
          <Select
            value={
              selectedProfessionalId === null
                ? 'null'
                : String(selectedProfessionalId)
            }
            onValueChange={(value) =>
              setSelectedProfessionalId(value === 'null' ? null : Number(value))
            }
          >
            <SelectTrigger className="w-full md:w-56">
              <SelectValue>
                <SelectedProfessionalTemplate
                  professional={
                    professionalOptions.find(
                      (p) => p.id === selectedProfessionalId,
                    ) || professionalOptions[0]
                  }
                />
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {professionalOptions.map((option) => (
                <SelectItem
                  key={option.id ?? 'null'}
                  value={String(option.id)}
                >
                  <ProfessionalOptionTemplate option={option} />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Botão Novo Agendamento */}
          <Button
            onClick={() => handleOpenModal()}
            className="hidden sm:inline-flex"
          >
            <Plus className="w-4 h-4 mr-2" />
            Agendar
          </Button>
        </div>
      </div>

      {/* Calendário/Agenda */}
      <div className="mt-8">
        <Card className="min-h-[60vh] overflow-hidden">
          {/* Cabeçalho do Card */}
          <CardHeader className="bg-background p-6 border-b border-border">
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleDayNavigation('prev')}
                className="p-3 rounded-full bg-card hover:bg-accent"
              >
                <ChevronLeft className="w-5 h-5 text-muted-foreground" />
              </Button>
              <div className="text-center">
                <h2 className="text-xl font-bold text-foreground capitalize">
                  {formatHeaderDate(selectedDate)}
                </h2>
                <Button
                  variant="link"
                  onClick={() => setSelectedDate(new Date())}
                  className="text-sm text-primary"
                >
                  Hoje
                </Button>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleDayNavigation('next')}
                className="p-3 rounded-full bg-card hover:bg-accent"
              >
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </Button>
            </div>
          </CardHeader>

          {/* Conteúdo do Card */}
          <CardContent className="p-4 sm:p-6">
            {isLoading ? (
              <div className="flex justify-center items-center py-20">
                <LoadingSpinner />
              </div>
            ) : Object.keys(groupedAppointments).length === 0 ? (
              // Estado Vazio
              <div className="text-center py-20">
                <div className="bg-accent rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                  <CalendarIcon className="h-12 w-12 text-accent-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Nenhum agendamento
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Não há agendamentos para este dia. Que tal criar um novo?
                </p>
                <Button size="lg" onClick={() => handleOpenModal()}>
                  <Plus className="w-5 h-5 mr-2" />
                  Novo Agendamento
                </Button>
              </div>
            ) : (
              // Timeline
              <div className="space-y-6">
                {Object.entries(groupedAppointments).map(([time, apps]) => (
                  <div key={time} className="relative flex gap-x-3">
                    {/* Marcador de Tempo */}
                    <div className="flex-shrink-0 flex flex-col items-center">
                      <div className="bg-primary text-primary-foreground rounded-lg px-3 py-1 mb-2">
                        <p className="text-xs font-semibold">{time}</p>
                      </div>
                      <div className="relative flex h-full w-6 justify-center items-center">
                        <div className="h-full w-1 bg-gradient-to-b from-primary/20 to-secondary/20 rounded-full"></div>
                        <div className="absolute top-0 w-5 h-5 rounded-full bg-gradient-to-r from-primary to-secondary border-2 border-card shadow-sm"></div>
                      </div>
                    </div>
                    {/* Cards de Agendamento */}
                    <div className="flex-grow pb-6">
                      <div className="space-y-3">
                        {apps.map((app) => {
                          // CORREÇÃO: Uso de professionalId (camelCase)
                          const professional = professionals.find(
                            (p) => p.id === app.professionalId,
                          );
                          
                          // CORREÇÃO: Acesso a objetos aninhados (Solução KISS)
                          // O Backend deve retornar client: { name } e service: { name }
                          const serviceName = app.service?.name || 'Serviço não encontrado';
                          const clientName = app.client?.name || 'Cliente não encontrado';
                          const professionalName = professional?.name || app.professional?.name || 'Profissional não encontrado';

                          return (
                            <Card
                              key={app.id}
                              className="bg-card p-4 border border-border cursor-pointer hover:shadow-md hover:border-primary/20 transition-all duration-200 group"
                              onClick={() => handleOpenModal(app)}
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex items-start space-x-3">
                                  <div
                                    className="w-3 h-12 rounded-full mt-1"
                                    style={{
                                      backgroundColor:
                                        professional?.color ||
                                        'hsl(var(--secondary))',
                                    }}
                                  />
                                  <div>
                                    <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                      {serviceName}
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-1 flex items-center">
                                      <User className="w-3 h-3 mr-1.5" />
                                      {clientName}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1.5 flex items-center">
                                      <Scissors className="w-3 h-3 mr-1.5" />
                                      {professionalName}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right flex-shrink-0 ml-4">
                                  <div className="bg-muted rounded-lg px-3 py-1">
                                    <p className="text-sm font-medium text-foreground">
                                      {/* CORREÇÃO: Uso de endDate e appointmentDate (camelCase) */}
                                      {dayjs(app.endDate).diff(
                                        dayjs(app.appointmentDate),
                                        'minutes',
                                      )}{' '}
                                      min
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Botão Flutuante (Mobile) */}
      <div className="lg:hidden fixed bottom-6 right-6 z-40">
        <Button
          size="icon"
          className="rounded-full w-14 h-14 shadow-lg"
          onClick={() => handleOpenModal()}
          aria-label="Novo Agendamento"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      {/* --- Modais --- */}
      <AppointmentFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        editingAppointment={editingAppointment}
        initialDate={selectedDate}
        initialProfessionalId={selectedProfessionalId}
      />

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Excluir Agendamento"
        // CORREÇÃO: Acesso aninhado a client.name para modal
        message={`Tem certeza que deseja excluir o agendamento para "${
          appointmentToDelete?.client?.name || 'Cliente'
        }"?`}
        confirmText="Excluir"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}