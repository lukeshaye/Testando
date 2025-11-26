// /packages/web/src/features/settings/components/WorkingHoursForm.tsx

import { useEffect, useState, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Clock, Plus, Trash2, Save, AlertTriangle, Loader2 } from 'lucide-react';
import dayjs from 'dayjs'; // CORREÇÃO C: Substituição de moment por dayjs (Padrão do Projeto)

// Imports de UI (shadcn/ui)
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

// Imports da Feature
import { useSettingsQuery } from '../hooks/useSettingsQuery';
import {
  useUpdateWorkingHoursMutation,
  useAddBusinessExceptionMutation,
  useDeleteBusinessExceptionMutation,
} from '../hooks/useUpdateSettingsMutation';

// CORREÇÃO B (DRY - Princípio 2.2): 
// Importação dos schemas canônicos em vez de redefinição manual.
// Assumindo que este arquivo existe com base no prompt.
import { BusinessHoursSchema, BusinessExceptionSchema } from '../schemas/settings.schema'; 

// --- CONSTANTS & ADAPTERS ---
const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo' }, { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' }, { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' }, { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' },
];

// Adaptação para o Form: O formulário espera um objeto wrapper { hours: [...] }
// O BusinessHoursSchema valida a entidade individual (ou a lista, dependendo da implementação do backend).
// Aqui compomos o schema do formulário reutilizando a regra canônica.
const formWorkingHoursSchema = z.object({
  hours: z.array(BusinessHoursSchema)
});

type WorkingHoursFormData = z.infer<typeof formWorkingHoursSchema>;
type BusinessExceptionFormData = z.infer<typeof BusinessExceptionSchema>;

interface BusinessException {
  id: number;
  description: string;
  exception_date: string; // YYYY-MM-DD
  start_time: string | null;
  end_time: string | null;
}

// Inicialização com todos os dias inativos
const DEFAULT_HOURS: WorkingHoursFormData = {
  hours: DAYS_OF_WEEK.map(day => ({
    day_of_week: day.value,
    is_active: false,
    start_time: null,
    end_time: null,
  })),
};

// --- Componente WorkingHoursForm ---

export const WorkingHoursForm = () => {
  // 1. Hooks de Dados e Mutação
  const { data, isLoading } = useSettingsQuery();
  const { mutate: updateHours, isPending: isSavingHours } = useUpdateWorkingHoursMutation();
  const { mutate: addException, isPending: isAddingException } = useAddBusinessExceptionMutation();
  const { mutate: deleteException, isPending: isDeletingException } = useDeleteBusinessExceptionMutation();

  // 2. Estados Locais
  const [isExceptionModalOpen, setIsExceptionModalOpen] = useState(false);
  const [exceptionToDelete, setExceptionToDelete] = useState<BusinessException | null>(null);

  // Estado local para inputs de "Aplicar a Todos"
  const [applyStartTime, setApplyStartTime] = useState('09:00');
  const [applyEndTime, setApplyEndTime] = useState('18:00');

  // 3. Formulário de Horários
  const hoursForm = useForm<WorkingHoursFormData>({
    resolver: zodResolver(formWorkingHoursSchema), // Usa o schema composto com a fonte de verdade
    defaultValues: DEFAULT_HOURS,
  });

  const { fields, update } = useFieldArray({ control: hoursForm.control, name: 'hours' });
  const { setValue, watch, reset: resetHoursForm } = hoursForm;

  // 4. Formulário de Exceções
  const exceptionForm = useForm<BusinessExceptionFormData>({
    resolver: zodResolver(BusinessExceptionSchema), // Usa diretamente o schema canônico
    defaultValues: {
      description: '',
      // CORREÇÃO C: Uso de dayjs
      exception_date: dayjs().startOf('day').toDate(),
      start_time: '09:00',
      end_time: '18:00',
    },
  });

  // --- Sincronização de Dados ---
  useEffect(() => {
    if (data?.businessHours) {
      const hoursData = DEFAULT_HOURS.hours.map(defaultHour => {
        const existing = data.businessHours.find((h: any) => h.day_of_week === defaultHour.day_of_week);
        return {
          day_of_week: defaultHour.day_of_week,
          is_active: !!(existing?.start_time && existing?.end_time),
          start_time: existing?.start_time || null,
          end_time: existing?.end_time || null,
        };
      });
      resetHoursForm({ hours: hoursData });
    }
  }, [data, resetHoursForm]);

  // --- Lógica de Aplicação Rápida (Apply to All Days) ---
  const applyToAllDays = useCallback((startTime: string, endTime: string) => {
    if (!startTime || !endTime) {
      toast.warning('Preencha os horários de início e fim para aplicar a todos.');
      return;
    }

    fields.forEach((field, index) => {
      if (watch(`hours.${index}.is_active`)) {
        setValue(`hours.${index}.start_time`, startTime, { shouldValidate: true });
        setValue(`hours.${index}.end_time`, endTime, { shouldValidate: true });
        update(index, { ...field, start_time: startTime, end_time: endTime });
      }
    });
    toast.info('Horários aplicados aos dias ativos.');
  }, [fields, watch, setValue, update]);

  // --- Handlers de Horários (Update Hours) ---
  const onSubmitHours = (formData: WorkingHoursFormData) => {
    const hoursToUpsert = formData.hours.map(h => ({
        day_of_week: h.day_of_week,
        start_time: h.is_active ? h.start_time : null,
        end_time: h.is_active ? h.end_time : null,
    }));
    updateHours(hoursToUpsert as any);
  };

  // --- Handlers de Exceções (Add/Delete Exception) ---
  const onSubmitException = (formData: BusinessExceptionFormData) => {
    const exceptionData = {
      description: formData.description,
      // CORREÇÃO C: Uso de dayjs para formatar
      exception_date: dayjs(formData.exception_date).format('YYYY-MM-DD'),
      start_time: formData.start_time || null,
      end_time: formData.end_time || null,
    };

    addException(exceptionData as any, {
      onSuccess: () => {
        setIsExceptionModalOpen(false);
        exceptionForm.reset({
          description: '',
          // CORREÇÃO C: Uso de dayjs
          exception_date: dayjs().startOf('day').toDate(),
          start_time: '09:00',
          end_time: '18:00',
        });
      },
    });
  };

  const handleConfirmDeleteException = () => {
    if (exceptionToDelete?.id) {
      deleteException(exceptionToDelete.id, {
        onSuccess: () => {
          setExceptionToDelete(null);
        },
        onError: () => {
          setExceptionToDelete(null);
        }
      });
    }
  };

  // --- Renderização de Loading ---
  if (isLoading) {
    return (
        <div className="space-y-8">
            <Card><CardHeader><Skeleton className="h-8 w-48" /></CardHeader><CardContent className="space-y-4"><Skeleton className="h-48 w-full" /></CardContent></Card>
            <Card><CardHeader><Skeleton className="h-8 w-48" /></CardHeader><CardContent className="space-y-4"><Skeleton className="h-48 w-full" /></CardContent></Card>
        </div>
    );
  }

  // --- Componente Principal ---
  return (
    <div className="space-y-8">
      {/* ----------------------------------------------------------- */}
      {/* SEÇÃO 1: HORÁRIOS DE FUNCIONAMENTO */}
      {/* ----------------------------------------------------------- */}
      <Card>
        <CardHeader className="bg-gradient-to-r from-primary/5 to-secondary/5 border-b border-border">
          <div className="flex items-center">
            <Clock className="w-5 h-5 text-primary mr-3" />
            <CardTitle>Horários de Funcionamento</CardTitle>
          </div>
          <CardDescription>Defina os horários padrão de abertura e fechamento.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Form {...hoursForm}>
            <form onSubmit={hoursForm.handleSubmit(onSubmitHours)} className="space-y-6">
              
              {/* --- APLICAR A TODOS --- */}
              <div className="bg-muted p-5 rounded-lg border border-border">
                <h4 className="text-sm font-semibold text-foreground mb-3">Aplicar Horário a Todos os Dias Ativos</h4>
                <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-3">
                  <Input 
                    type="time" 
                    className="w-full sm:w-auto" 
                    placeholder="Início" 
                    value={applyStartTime}
                    onChange={(e) => setApplyStartTime(e.target.value)}
                  />
                  <span className="text-muted-foreground font-medium">até</span>
                  <Input 
                    type="time" 
                    className="w-full sm:w-auto" 
                    placeholder="Fim" 
                    value={applyEndTime}
                    onChange={(e) => setApplyEndTime(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => applyToAllDays(applyStartTime, applyEndTime)}
                    className="w-full sm:w-auto"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Aplicar
                  </Button>
                </div>
              </div>

              {/* --- DIAS DA SEMANA COM CHECKBOX --- */}
              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div key={field.id} className="p-4 rounded-lg border border-border bg-background">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 items-center">
                      
                      {/* Checkbox para Ativar o Dia */}
                      <FormField
                        control={hoursForm.control}
                        name={`hours.${index}.is_active`}
                        render={({ field: checkboxField }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0 col-span-2 lg:col-span-1">
                            <FormControl>
                              <Checkbox
                                checked={checkboxField.value}
                                onCheckedChange={(checked) => {
                                    if (!checked) {
                                        setValue(`hours.${index}.start_time`, null);
                                        setValue(`hours.${index}.end_time`, null);
                                    }
                                    checkboxField.onChange(checked);
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-semibold text-foreground cursor-pointer">
                              {DAYS_OF_WEEK.find(d => d.value === field.day_of_week)?.label}
                            </FormLabel>
                          </FormItem>
                        )}
                      />

                      {/* Input de Hora Início */}
                      <FormField
                        control={hoursForm.control}
                        name={`hours.${index}.start_time`}
                        render={({ field: timeField }) => (
                          <FormItem className="col-span-2 lg:col-span-1">
                            <FormControl>
                              <Input 
                                type="time" 
                                {...timeField} 
                                value={timeField.value || ''}
                                disabled={!watch(`hours.${index}.is_active`)}
                                placeholder="Início" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Input de Hora Fim */}
                      <FormField
                        control={hoursForm.control}
                        name={`hours.${index}.end_time`}
                        render={({ field: timeField }) => (
                          <FormItem className="col-span-2 lg:col-span-1">
                            <FormControl>
                              <Input 
                                type="time" 
                                {...timeField} 
                                value={timeField.value || ''}
                                disabled={!watch(`hours.${index}.is_active`)}
                                placeholder="Fim" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isSavingHours}>
                  {isSavingHours && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="w-4 h-4 mr-2" />
                  {isSavingHours ? 'Salvando...' : 'Salvar Horários'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* ----------------------------------------------------------- */}
      {/* SEÇÃO 2: EXCEÇÕES E FERIADOS */}
      {/* ----------------------------------------------------------- */}
      <Card>
        <CardHeader className="bg-gradient-to-r from-primary/5 to-secondary/5 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-warning mr-3" />
              <CardTitle>Exceções e Feriados</CardTitle>
            </div>
            <Dialog open={isExceptionModalOpen} onOpenChange={setIsExceptionModalOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary" onClick={() => setIsExceptionModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Nova Exceção
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Adicionar Exceção de Horário</DialogTitle>
                </DialogHeader>
                <Form {...exceptionForm}>
                    <form onSubmit={exceptionForm.handleSubmit(onSubmitException)} className="space-y-4">
                        
                        <FormField
                            control={exceptionForm.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Descrição *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: Feriado de Carnaval" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={exceptionForm.control}
                            name="exception_date"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Data *</FormLabel>
                                    <FormControl>
                                        {/* CORREÇÃO C: Input Date com dayjs */}
                                        <Input 
                                            type="date" 
                                            value={field.value ? dayjs(field.value).format('YYYY-MM-DD') : ''}
                                            onChange={(e) => field.onChange(dayjs(e.target.value).toDate())}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={exceptionForm.control}
                                name="start_time"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Início (opcional)</FormLabel>
                                        <FormControl>
                                            <Input type="time" placeholder="00:00" {...field} value={field.value || ''} />
                                        </FormControl>
                                        <FormMessage />
                                        <p className="text-xs text-muted-foreground mt-1">Deixe vazio se for fechado o dia todo.</p>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={exceptionForm.control}
                                name="end_time"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Fim (opcional)</FormLabel>
                                        <FormControl>
                                            <Input type="time" placeholder="00:00" {...field} value={field.value || ''} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <div className="pt-4 flex justify-end">
                            <Button type="submit" disabled={isAddingException}>
                                {isAddingException && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Criar Exceção
                            </Button>
                        </div>
                    </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {data?.businessExceptions.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium text-foreground">Nenhuma exceção cadastrada</h3>
              <p className="mt-1 text-sm text-muted-foreground">Adicione feriados ou dias com horários especiais.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data?.businessExceptions.map((exception: BusinessException) => (
                <div
                  key={exception.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg bg-background hover:bg-accent transition-colors"
                >
                  <div>
                    <p className="font-semibold text-foreground">{exception.description}</p>
                    <div className="text-sm text-muted-foreground mt-1 flex items-center space-x-2">
                        {/* CORREÇÃO C: Formatação com dayjs */}
                        <span>{dayjs(exception.exception_date).format('DD/MM/YYYY')}</span>
                        <span className="text-xs text-primary">•</span>
                        {exception.start_time && exception.end_time ? (
                            <span>{exception.start_time} - {exception.end_time}</span>
                        ) : (
                            <span className="italic">Fechado o dia todo</span>
                        )}
                    </div>
                  </div>
                  <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => setExceptionToDelete(exception)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!exceptionToDelete} onOpenChange={() => setExceptionToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Excluir Exceção</AlertDialogTitle>
                <AlertDialogDescription>
                    Tem certeza que deseja excluir a exceção "{exceptionToDelete?.description}"? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeletingException}>Cancelar</AlertDialogCancel>
                <AlertDialogAction 
                    onClick={handleConfirmDeleteException}
                    disabled={isDeletingException}
                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                >
                    {isDeletingException ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Excluir'}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};