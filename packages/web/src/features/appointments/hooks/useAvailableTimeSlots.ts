// /packages/web/src/features/appointments/hooks/useAvailableTimeSlots.ts

import { useMemo } from 'react';
import moment from 'moment';
import { useAppointmentsQuery } from './useAppointmentsQuery';
import type { ProfessionalType, AppointmentType } from '@/packages/shared-types';

interface UseAvailableTimeSlotsProps {
  /** A data selecionada para verificar a disponibilidade. */
  selectedDate: Date;
  /** O profissional selecionado. A disponibilidade depende de seus horários. */
  professional: ProfessionalType | null;
  /** A duração do serviço, usada para calcular o horário de término. */
  serviceDuration: number;
}

interface TimeSlot {
  label: string;
  value: Date;
}

/**
 * Hook de Lógica de Negócios (Plano 2.1)
 *
 * Em conformidade com o Princípio da Separação de Responsabilidades (SoC 2.5),
 * este hook encapsula a lógica de negócios de cálculo de horários disponíveis,
 * removendo-a da camada de UI (View).
 *
 * Ele consome `useAppointmentsQuery` (Plano 1.1) internamente para buscar
 * conflitos (Estado Nível 3) e retorna uma lista computada de slots.
 *
 * Replica e melhora a lógica do `TimeSlotPicker.tsx` (legado).
 */
export const useAvailableTimeSlots = ({
  selectedDate,
  professional,
  serviceDuration,
}: UseAvailableTimeSlotsProps): { availableTimeSlots: TimeSlot[]; isLoading: boolean } => {
  
  // 1. Consumir a Query de Agendamentos (PGEC 2.13 / CQRS 2.12)
  // Busca apenas os agendamentos necessários para o cálculo:
  // do profissional selecionado e na data selecionada.
  const dayStart = moment(selectedDate).startOf('day').toDate();
  const dayEnd = moment(selectedDate).endOf('day').toDate();

  const { data: appointmentsOnDate = [], isLoading: isLoadingAppointments } =
    useAppointmentsQuery({
      startDate: dayStart,
      endDate: dayEnd,
      professionalId: professional?.id,
      // A query só é ativada se um profissional estiver selecionado (enabled).
      enabled: !!professional,
    });

  // 2. Encapsular a Lógica de Cálculo (SoC 2.5)
  // useMemo garante que este cálculo pesado só execute quando as dependências mudarem.
  const availableTimeSlots = useMemo(() => {
    // Se não houver profissional ou horários de trabalho definidos, não há slots.
    // (Baseado no problema 42, os horários estão na tabela 'professionals')
    if (
      !professional ||
      !professional.work_start_time ||
      !professional.work_end_time
    ) {
      return [];
    }

    const allPossibleSlots: moment.Moment[] = [];
    const {
      work_start_time, // ex: "09:00"
      work_end_time, // ex: "18:00"
      lunch_start_time, // ex: "12:00"
      lunch_end_time, // ex: "13:00"
    } = professional;

    /** Helper para criar um objeto moment a partir de uma string HH:MM e da data selecionada */
    const timeToMoment = (timeStr: string): moment.Moment => {
      const [hour, minute] = timeStr.split(':').map(Number);
      return moment(selectedDate).startOf('day').hour(hour).minute(minute);
    };

    const workDayStart = timeToMoment(work_start_time);
    const workDayEnd = timeToMoment(work_end_time);

    const lunchStart = lunch_start_time ? timeToMoment(lunch_start_time) : null;
    const lunchEnd = lunch_end_time ? timeToMoment(lunch_end_time) : null;

    // Intervalo de slots (baseado no TimeSlotPicker.tsx legado)
    const slotInterval = 30;

    // Etapa 1: Gerar todos os slots possíveis
    let tempTime = workDayStart.clone();
    while (tempTime.isBefore(workDayEnd)) {
      allPossibleSlots.push(tempTime.clone());
      tempTime.add(slotInterval, 'minutes');
    }

    const now = moment();

    // Etapa 2: Filtrar os slots
    const availableSlots = allPossibleSlots.filter((slotStartTime) => {
      const slotEndTime = slotStartTime.clone().add(serviceDuration, 'minutes');

      // Filtro 1: O slot já passou (relevante apenas para o dia de hoje)
      if (moment(selectedDate).isSame(now, 'day') && slotStartTime.isBefore(now)) {
        return false;
      }

      // Filtro 2: O serviço termina DEPOIS do fim do expediente
      if (slotEndTime.isAfter(workDayEnd)) {
        return false;
      }

      // Filtro 3: O slot está ocupado por outro agendamento (conflito)
      // Usa os dados já filtrados de useAppointmentsQuery
      const isOccupied = appointmentsOnDate.some((app: AppointmentType) => {
        const existingStart = moment(app.appointment_date);
        const existingEnd = moment(app.end_date);
        
        // Verifica sobreposição:
        // O novo slot começa antes do fim do existente E
        // O novo slot termina depois do início do existente
        return slotStartTime.isBefore(existingEnd) && slotEndTime.isAfter(existingStart);
      });
      if (isOccupied) {
        return false;
      }

      // Filtro 4: O slot conflita com o horário de almoço
      if (lunchStart && lunchEnd) {
        const isDuringLunch = 
            slotStartTime.isBefore(lunchEnd) && slotEndTime.isAfter(lunchStart);
            
        if (isDuringLunch) {
            return false;
        }
      }

      // Se passou por todos os filtros, o slot está disponível
      return true;
    });

    // Etapa 3: Formatar os slots para a UI
    return availableSlots.map((slot) => ({
      label: slot.format('HH:mm'),
      value: slot.toDate(),
    }));
  }, [selectedDate, professional, serviceDuration, appointmentsOnDate]);

  // 3. Retornar os slots disponíveis e o estado de carregamento
  return {
    availableTimeSlots,
    isLoading: isLoadingAppointments,
  };
};