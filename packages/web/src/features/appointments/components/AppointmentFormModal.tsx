// /packages/web/src/features/appointments/components/AppointmentFormModal.tsx

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
// REMOVIDO: import moment from 'moment';
// ADICIONADO: dayjs e seus plugins/locales
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import startOfDay from 'dayjs/plugin/startOf'; // Necessário para a lógica do calendário

import {
  AppointmentFormSchema,
  AppointmentType,
  ProfessionalType,
  ServiceType,
  ClientType,
} from '@/packages/shared-types';
import { useToast } from '@/packages/ui/components/ui/use-toast';
import { cn } from '@/packages/ui/lib/utils';

// UI Components (CDA 2.17: Substituindo PrimeReact)
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from '@/packages/ui/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/packages/ui/components/ui/form';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/packages/ui/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/packages/ui/components/ui/command';
import {
  RadioGroup,
  RadioGroupItem,
} from '@/packages/ui/components/ui/radio-group';
import { Button } from '@/packages/ui/components/ui/button';
import { Calendar } from '@/packages/ui/components/ui/calendar';
import { Input } from '@/packages/ui/components/ui/input';
import { Label } from '@/packages/ui/components/ui/label';
import {
  CalendarIcon,
  Check,
  ChevronsUpDown,
  Loader2,
  Plus,
} from 'lucide-react';

// Hooks (CQRS 2.12 / PGEC 2.13)
import { useAddAppointmentMutation } from '../hooks/useAddAppointmentMutation';
import { useUpdateAppointmentMutation } from '../hooks/useUpdateAppointmentMutation';
import { useAvailableTimeSlots } from '../hooks/useAvailableTimeSlots';

// Hooks de outras features (assumindo que existem conforme o plano)
// Estes imports são fictícios e representam o consumo de hooks de outras features
import { useClientsQuery } from '@/packages/web/src/features/clients/hooks/useClientsQuery';
import { useProfessionalsQuery } from '@/packages/web/src/features/professionals/hooks/useProfessionalsQuery';
import { useServicesQuery } from '@/packages/web/src/features/services/hooks/useServicesQuery';

// (Este modal de cliente seria importado de features/clients)
// import { ClientFormModal } from '@/packages/web/src/features/clients/components/ClientFormModal';

// Configura o Day.js
dayjs.locale('pt-br');
dayjs.extend(localizedFormat);
dayjs.extend(startOfDay);

type AppointmentFormData = z.infer<typeof AppointmentFormSchema>;

interface AppointmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingAppointment: AppointmentType | null;
  /** Data inicial opcional (ex: ao clicar em um slot vazio) */
  initialDate?: Date;
}

const defaultFormValues: Partial<AppointmentFormData> = {
  client_id: undefined,
  professional_id: undefined,
  service_id: undefined,
  price: 0,
  appointment_date: new Date(),
  end_date: new Date(),
  attended: false,
};

/**
 * Componente de Modal (View) para criar e editar agendamentos.
 *
 * Em conformidade com o plano de feature 4.8, item 3.1 (REVISADO).
 *
 * - SoC (2.5): Foca apenas na UI e estado do formulário.
 * - DSpP (2.16): Usa react-hook-form e Zod.
 * - CDA (2.17): Usa componentes de @/packages/ui, substituindo PrimeReact.
 * - Consome hooks de mutação (1.2, 1.3) e o hook de lógica `useAvailableTimeSlots` (2.1).
 */
export function AppointmentFormModal({
  isOpen,
  onClose,
  editingAppointment,
  initialDate,
}: AppointmentFormModalProps) {
  const { toast } = useToast();
  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(AppointmentFormSchema),
    defaultValues: initialDate
      ? { ...defaultFormValues, appointment_date: initialDate }
      : defaultFormValues,
  });

  // --- Estado local para UI (ex: modal de novo cliente) ---
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);

  // --- Hooks de Mutação (CQRS 2.12) ---
  const addMutation = useAddAppointmentMutation();
  const updateMutation = useUpdateAppointmentMutation();
  const isMutating = addMutation.isPending || updateMutation.isPending;

  // --- Hooks de Query (Consumo de outras features) ---
  const { data: clients = [], isLoading: isLoadingClients } =
    useClientsQuery({});
  const { data: professionals = [], isLoading: isLoadingProfessionals } =
    useProfessionalsQuery({});
  const { data: services = [], isLoading: isLoadingServices } =
    useServicesQuery({});

  // --- Observadores do Formulário (Form State) ---
  const watchedProfessionalId = form.watch('professional_id');
  const watchedServiceId = form.watch('service_id');
  const watchedDate = form.watch('appointment_date');

  // --- Seleções Derivadas ---
  const selectedProfessional = useMemo(
    () => professionals.find((p) => p.id === watchedProfessionalId),
    [professionals, watchedProfessionalId]
  );

  const selectedService = useMemo(
    () => services.find((s) => s.id === watchedServiceId),
    [services, watchedServiceId]
  );

  const serviceDuration = selectedService?.duration || 30;

  // --- Hook de Lógica de Negócios (SoC 2.5) ---
  const { availableTimeSlots, isLoading: isLoadingSlots } =
    useAvailableTimeSlots({
      selectedDate: watchedDate,
      professional: selectedProfessional || null,
      serviceDuration: serviceDuration,
    });

  // --- Efeitos para Sincronização do Formulário ---

  /**
   * Efeito: Reseta o formulário ao abrir o modal
   */
  useEffect(() => {
    if (isOpen) {
      if (editingAppointment) {
        // Modo Edição: Carrega dados existentes
        form.reset({
          client_id: editingAppointment.client_id,
          professional_id: editingAppointment.professional_id,
          service_id: editingAppointment.service_id,
          // API armazena em centavos, formulário usa reais
          price: (editingAppointment.price || 0) / 100,
          appointment_date: new Date(editingAppointment.appointment_date),
          end_date: new Date(editingAppointment.end_date),
          attended: editingAppointment.attended,
        });
      } else {
        // Modo Criação: Reseta para valores padrão
        form.reset({
          ...defaultFormValues,
          appointment_date: initialDate || new Date(),
        });
      }
    }
  }, [isOpen, editingAppointment, initialDate, form]);

  /**
   * Efeito: Atualiza o preço e a data de término quando o serviço ou
   * o horário de início mudam.
   */
  useEffect(() => {
    if (selectedService) {
      // API armazena em centavos, schema Zod espera reais
      form.setValue('price', (selectedService.price || 0) / 100, {
        shouldValidate: true,
      });

      // Atualiza a data de término baseada na duração
      const newEndDate = dayjs(watchedDate) // Alterado para dayjs
        .add(selectedService.duration, 'minutes')
        .toDate();
      form.setValue('end_date', newEndDate, { shouldValidate: true });
    }
  }, [selectedService, watchedDate, form]);

  /**
   * Efeito: Limpa o horário selecionado se os slots disponíveis
   * mudarem (ex: trocou de profissional) e o horário antigo
   * não for mais válido.
   */
  useEffect(() => {
    if (!isLoadingSlots && availableTimeSlots.length > 0) {
      const selectedTimeValid = availableTimeSlots.some(
        (slot) => slot.value.getTime() === watchedDate.getTime()
      );
      if (!selectedTimeValid) {
        // O horário atual não é mais válido,
        // mas não vamos resetar automaticamente para não frustrar o usuário.
        // O `react-hook-form` com Zod irá invalidar se o slot não for escolhido.
        // A lógica do TimeSlotPicker (legado) também não resetava.
      }
    }
  }, [availableTimeSlots, isLoadingSlots, watchedDate]);

  /**
   * Efeito: Fecha o modal no sucesso da mutação
   */
  useEffect(() => {
    if (addMutation.isSuccess || updateMutation.isSuccess) {
      onClose();
    }
  }, [addMutation.isSuccess, updateMutation.isSuccess, onClose]);

  // --- Manipulador de Envio (DSpP 2.16) ---
  function onSubmit(data: AppointmentFormData) {
    // Converte o preço de reais (formulário) para centavos (API)
    // (Lógica migrada do `onSubmit` do `Appointments.tsx` legado)
    const payload = {
      ...data,
      price: Math.round(data.price * 100),
      // Garante que a data de término está correta
      end_date: dayjs(data.appointment_date) // Alterado para dayjs
        .add(serviceDuration, 'minutes')
        .toDate(),
    };

    if (editingAppointment) {
      updateMutation.mutate({
        ...payload,
        id: editingAppointment.id, // Adiciona o ID para atualização
      });
    } else {
      addMutation.mutate(payload);
    }
  }

  const handleClientCreated = (newClient: ClientType) => {
    // (Lógica do modal de cliente, se implementado)
    setIsClientModalOpen(false);
    if (newClient && newClient.id) {
      form.setValue('client_id', newClient.id, { shouldValidate: true });
      toast({
        title: 'Cliente Adicionado',
        description: `${newClient.name} foi selecionado.`,
      });
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAppointment ? 'Editar Agendamento' : 'Novo Agendamento'}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados abaixo para o agendamento.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* === Cliente (Combobox) === */}
              <FormField
                control={form.control}
                name="client_id"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Cliente *</FormLabel>
                    <div className="flex items-center gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn(
                                'w-full justify-between',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value
                                ? clients.find((c) => c.id === field.value)
                                    ?.name
                                : 'Selecione um cliente'}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                          <Command>
                            <CommandInput placeholder="Buscar cliente..." />
                            <CommandList>
                              <CommandEmpty>Nenhum cliente.</CommandEmpty>
                              <CommandGroup>
                                {clients.map((client) => (
                                  <CommandItem
                                    value={client.name}
                                    key={client.id}
                                    onSelect={() => {
                                      form.setValue('client_id', client.id);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        'mr-2 h-4 w-4',
                                        client.id === field.value
                                          ? 'opacity-100'
                                          : 'opacity-0'
                                      )}
                                    />
                                    {client.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <Button
                        type="button"
                        size="icon"
                        onClick={() => setIsClientModalOpen(true)}
                        className="flex-shrink-0"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* === Profissional (Combobox) === */}
              <FormField
                control={form.control}
                name="professional_id"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Profissional *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              'w-full justify-between',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value
                              ? professionals.find((p) => p.id === field.value)
                                  ?.name
                              : 'Selecione um profissional'}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                          <CommandInput placeholder="Buscar profissional..." />
                          <CommandList>
                            <CommandEmpty>Nenhum profissional.</CommandEmpty>
                            <CommandGroup>
                              {professionals.map((prof) => (
                                <CommandItem
                                  value={prof.name}
                                  key={prof.id}
                                  onSelect={() => {
                                    form.setValue(
                                      'professional_id',
                                      prof.id
                                    );
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      'mr-2 h-4 w-4',
                                      prof.id === field.value
                                        ? 'opacity-100'
                                        : 'opacity-0'
                                    )}
                                  />
                                  {prof.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* === Serviço (Combobox) === */}
              <FormField
                control={form.control}
                name="service_id"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Serviço *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              'w-full justify-between',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value
                              ? services.find((s) => s.id === field.value)
                                  ?.name
                              : 'Selecione um serviço'}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                          <CommandInput placeholder="Buscar serviço..." />
                          <CommandList>
                            <CommandEmpty>Nenhum serviço.</CommandEmpty>
                            <CommandGroup>
                              {services.map((service) => (
                                <CommandItem
                                  value={service.name}
                                  key={service.id}
                                  onSelect={() => {
                                    form.setValue('service_id', service.id);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      'mr-2 h-4 w-4',
                                      service.id === field.value
                                        ? 'opacity-100'
                                        : 'opacity-0'
                                    )}
                                  />
                                  {service.name} ({service.duration} min)
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* === Preço (Input) === */}
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço (R$)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="R$ 50,00"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseFloat(e.target.value) || 0)
                        }
                        disabled={!!selectedService} // Desabilita se o preço vem do serviço
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* === Data (Calendar) === */}
              <FormField
                control={form.control}
                name="appointment_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={'outline'}
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              dayjs(field.value).format('DD/MM/YYYY') // Alterado para dayjs
                            ) : (
                              <span>Selecione a data</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(day) => {
                            if (!day) return;
                            // Alterado para dayjs
                            const newDate = dayjs(field.value || new Date())
                              .year(day.getFullYear())
                              .month(day.getMonth())
                              .date(day.getDate());
                            field.onChange(newDate.toDate());
                          }}
                          disabled={(date) =>
                            !editingAppointment &&
                            date < dayjs().startOf('day').toDate() // Alterado para dayjs
                          }
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* === Horários (RadioGroup) === */}
              {watchedProfessionalId && watchedServiceId && (
                <FormField
                  control={form.control}
                  name="appointment_date"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Horário *</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={(isoString) =>
                            field.onChange(new Date(isoString))
                          }
                          value={field.value.toISOString()}
                          className="grid grid-cols-4 gap-2"
                        >
                          {isLoadingSlots ? (
                            <div className="col-span-4 flex items-center justify-center p-4">
                              <Loader2 className="h-5 w-5 animate-spin" />
                            </div>
                          ) : availableTimeSlots.length === 0 ? (
                            <p className="col-span-4 text-sm text-muted-foreground p-4 text-center">
                              Nenhum horário disponível para este profissional
                              na data ou para este serviço.
                            </p>
                          ) : (
                            availableTimeSlots.map((slot) => (
                              <FormItem
                                key={slot.label}
                                className="flex-1"
                              >
                                <FormControl>
                                  <RadioGroupItem
                                    value={slot.value.toISOString()}
                                    id={slot.label}
                                    className="peer sr-only"
                                  />
                                </FormControl>
                                <Label
                                  htmlFor={slot.label}
                                  className="flex items-center justify-center rounded-md border-2 border-muted bg-popover p-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                                >
                                  {slot.label}
                                </Label>
                              </FormItem>
                            ))
                          )}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Cancelar
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={isMutating}>
                  {isMutating && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingAppointment ? 'Salvar Alterações' : 'Criar Agendamento'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Modal de Novo Cliente
        A lógica de `ClientFormModal` seria importada da feature 'clients'
        e gerenciada aqui.
      */}
      {/* <ClientFormModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onClientCreated={handleClientCreated}
        editingClient={null}
      /> 
      */}
    </>
  );
}