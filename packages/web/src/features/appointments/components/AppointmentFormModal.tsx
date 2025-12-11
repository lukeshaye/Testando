// /packages/web/src/features/appointments/components/AppointmentFormModal.tsx

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import startOfDay from 'dayjs/plugin/startOf';

import {
  AppointmentFormSchema,
  AppointmentType,
  ClientType,
} from '@/packages/shared-types';
import { useToast } from '@/packages/ui/components/ui/use-toast';
import { cn } from '@/packages/ui/lib/utils';

// UI Components
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

// Hooks
import { useAddAppointmentMutation } from '../hooks/useAddAppointmentMutation';
import { useUpdateAppointmentMutation } from '../hooks/useUpdateAppointmentMutation';
import { useAvailableTimeSlots } from '../hooks/useAvailableTimeSlots';

// Hooks de outras features
import { useClientsQuery } from '@/packages/web/src/features/clients/hooks/useClientsQuery';
import { useProfessionalsQuery } from '@/packages/web/src/features/professionals/hooks/useProfessionalsQuery';
import { useServicesQuery } from '@/packages/web/src/features/services/hooks/useServicesQuery';

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

// 2.1 Planejamento: Default Values atualizados para camelCase
const defaultFormValues: Partial<AppointmentFormData> = {
  clientId: undefined,
  professionalId: undefined,
  serviceId: undefined,
  price: 0,
  appointmentDate: new Date(),
  endDate: new Date(),
  attended: false,
};

/**
 * Componente de Modal para criar e editar agendamentos.
 * Refatorado para camelCase seguindo o Passo 4 do Padrão Ouro.
 * Corrigido conforme Plano de Simplificação Radical (Opção B).
 */
export function AppointmentFormModal({
  isOpen,
  onClose,
  editingAppointment,
  initialDate,
}: AppointmentFormModalProps) {
  const { toast } = useToast();
  
  // 2.16 DSpP: Schema e Resolver
  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(AppointmentFormSchema),
    defaultValues: initialDate
      ? { ...defaultFormValues, appointmentDate: initialDate }
      : defaultFormValues,
  });

  const [isClientModalOpen, setIsClientModalOpen] = useState(false);

  // Hooks de Mutação
  const addMutation = useAddAppointmentMutation();
  const updateMutation = useUpdateAppointmentMutation();
  const isMutating = addMutation.isPending || updateMutation.isPending;

  // Hooks de Query
  const { data: clients = [], isLoading: isLoadingClients } = useClientsQuery({});
  const { data: professionals = [], isLoading: isLoadingProfessionals } = useProfessionalsQuery({});
  const { data: services = [], isLoading: isLoadingServices } = useServicesQuery({});

  // Observadores do Formulário (Atualizado para camelCase)
  const watchedProfessionalId = form.watch('professionalId');
  const watchedServiceId = form.watch('serviceId');
  const watchedDate = form.watch('appointmentDate');

  // Seleções Derivadas
  const selectedProfessional = useMemo(
    () => professionals.find((p) => p.id === watchedProfessionalId),
    [professionals, watchedProfessionalId]
  );

  const selectedService = useMemo(
    () => services.find((s) => s.id === watchedServiceId),
    [services, watchedServiceId]
  );

  const serviceDuration = selectedService?.duration || 30;

  // Hook de Lógica de Negócios
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
          clientId: editingAppointment.clientId,
          professionalId: editingAppointment.professionalId,
          serviceId: editingAppointment.serviceId,
          // API armazena em centavos, formulário usa reais
          price: (editingAppointment.price || 0) / 100,
          appointmentDate: new Date(editingAppointment.appointmentDate),
          endDate: new Date(editingAppointment.endDate),
          attended: editingAppointment.attended,
        });
      } else {
        // Modo Criação
        form.reset({
          ...defaultFormValues,
          appointmentDate: initialDate || new Date(),
        });
      }
    }
  }, [isOpen, editingAppointment, initialDate, form]);

  /**
   * Efeito: Atualiza preço e data de término
   */
  useEffect(() => {
    if (selectedService) {
      form.setValue('price', (selectedService.price || 0) / 100, {
        shouldValidate: true,
      });

      const newEndDate = dayjs(watchedDate)
        .add(selectedService.duration, 'minutes')
        .toDate();
      // Atualizado para camelCase: endDate
      form.setValue('endDate', newEndDate, { shouldValidate: true });
    }
  }, [selectedService, watchedDate, form]);

  /**
   * Efeito: Validação de Slot (Correção UX Auditoria Item 4)
   * Se o horário selecionado não estiver mais disponível (ex: mudança de dia),
   * reseta a seleção de horário e avisa o usuário.
   */
  useEffect(() => {
    if (!isLoadingSlots && availableTimeSlots.length > 0 && watchedDate) {
      // Verifica se o timestamp exato do watchedDate existe na lista de slots disponíveis
      const selectedTimeValid = availableTimeSlots.some(
        (slot) => slot.value.getTime() === watchedDate.getTime()
      );

      // Se não for válido e não for apenas a data "zerada" (início do dia), limpa
      const isStartOfDay = dayjs(watchedDate).isSame(dayjs(watchedDate).startOf('day'));

      if (!selectedTimeValid && !isStartOfDay) {
         // Reseta para o início do dia para "desmarcar" os radio buttons de horário
         const cleanDate = dayjs(watchedDate).startOf('day').toDate();
         
         // Evita loop infinito se já estiver zerado
         if (watchedDate.getTime() !== cleanDate.getTime()) {
             form.setValue('appointmentDate', cleanDate);
             
             toast({
                 title: "Horário Indisponível",
                 description: "O horário selecionado não está disponível nesta nova data. Selecione outro.",
                 variant: "destructive" // Alerta visual
             });
         }
      }
    }
  }, [availableTimeSlots, isLoadingSlots, watchedDate, form, toast]);

  /**
   * Efeito: Fecha modal no sucesso
   */
  useEffect(() => {
    if (addMutation.isSuccess || updateMutation.isSuccess) {
      onClose();
    }
  }, [addMutation.isSuccess, updateMutation.isSuccess, onClose]);

  // --- Manipulador de Envio (Correção: Simplificação Radical) ---
  function onSubmit(data: AppointmentFormData) {
    // Cálculo do fim apenas para garantir integridade, se necessário.
    const startDayjs = dayjs(data.appointmentDate);
    const endDayjs = startDayjs.add(serviceDuration, 'minutes');

    // ✅ CORREÇÃO: Payload limpo e direto.
    // Enviamos 'appointmentDate' e 'endDate' como objetos Date.
    // Não formatamos mais strings manuais (YYYY-MM-DD ou HH:mm).
    // O navegador/axios serializa isso como ISO String automaticamente.
    const payload = {
      clientId: data.clientId,
      professionalId: data.professionalId,
      serviceId: data.serviceId,
      attended: data.attended,
      price: Math.round(data.price * 100), // Conversão para centavos
      
      // Datas como objetos nativos (KISS - Keep It Simple)
      appointmentDate: data.appointmentDate,
      endDate: endDayjs.toDate(),
    };

    if (editingAppointment) {
      updateMutation.mutate({
        ...payload,
        id: editingAppointment.id,
      });
    } else {
      addMutation.mutate(payload);
    }
  }

  const handleClientCreated = (newClient: ClientType) => {
    setIsClientModalOpen(false);
    if (newClient && newClient.id) {
      form.setValue('clientId', newClient.id, { shouldValidate: true });
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
                name="clientId" 
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
                                      form.setValue('clientId', client.id);
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
                name="professionalId" 
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
                                    form.setValue('professionalId', prof.id);
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
                name="serviceId" 
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
                                    form.setValue('serviceId', service.id);
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
                        disabled={!!selectedService}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* === Data (Calendar) === */}
              <FormField
                control={form.control}
                name="appointmentDate" 
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
                              dayjs(field.value).format('DD/MM/YYYY')
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
                            const newDate = dayjs(field.value || new Date())
                              .year(day.getFullYear())
                              .month(day.getMonth())
                              .date(day.getDate());
                            field.onChange(newDate.toDate());
                          }}
                          disabled={(date) =>
                            !editingAppointment &&
                            date < dayjs().startOf('day').toDate()
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
                  name="appointmentDate" 
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
    </>
  );
}