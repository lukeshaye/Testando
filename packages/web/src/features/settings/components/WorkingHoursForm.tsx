// /packages/web/src/features/settings/components/WorkingHoursForm.tsx

import { useEffect, useState, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Clock, Plus, Trash2, Save, AlertTriangle, Loader2 } from 'lucide-react';
import dayjs from 'dayjs';

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

[cite_start]// Importação dos schemas canônicos (Atualizados no Passo 2 para camelCase) [cite: 14]
import { BusinessHoursSchema, BusinessExceptionSchema } from '../schemas/settings.schema'; 

// --- CONSTANTS & ADAPTERS ---
const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo' }, { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' }, { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' }, { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' },
];

// Adaptação para o Form: O formulário espera um objeto wrapper { hours: [...] }
const formWorkingHoursSchema = z.object({
  hours: z.array(BusinessHoursSchema)
});

type WorkingHoursFormData = z.infer<typeof formWorkingHoursSchema>;
type BusinessExceptionFormData = z.infer<typeof BusinessExceptionSchema>;

// Interface local atualizada para camelCase (Reflete o retorno da API do Passo 3)
interface BusinessException {
  id: number;
  description: string;
  exceptionDate: string; // YYYY-MM-DD (camelCase)
  startTime: string | null; // camelCase
  endTime: string | null;   // camelCase
}

// Inicialização com todos os dias inativos (camelCase)
const DEFAULT_HOURS: WorkingHoursFormData = {
  hours: DAYS_OF_WEEK.map(day => ({
    dayOfWeek: day.value,
    isActive: false,
    startTime: null,
    endTime: null,
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
    resolver: zodResolver(formWorkingHoursSchema),
    defaultValues: DEFAULT_HOURS,
  });

  const { fields, update } = useFieldArray({ control: hoursForm.control, name: 'hours' });
  const { setValue, watch, reset: resetHoursForm } = hoursForm;

  // 4. Formulário de Exceções
  const exceptionForm = useForm<BusinessExceptionFormData>({
    resolver: zodResolver(BusinessExceptionSchema),
    defaultValues: {
      description: '',
      exceptionDate: dayjs().startOf('day').toDate(), // camelCase
      startTime: '09:00', // camelCase
      endTime: '18:00',   // camelCase
    },
  });

  // --- Sincronização de Dados ---
  // Princípio 2.1 (Mapeamento): Assume que 'data' já vem da API em camelCase
  useEffect(() => {
    if (data?.businessHours) {
      const hoursData = DEFAULT_HOURS.hours.map(defaultHour => {
        // Busca usando camelCase
        const existing = data.businessHours.find((h: any) => h.dayOfWeek === defaultHour.dayOfWeek);
        return {
          dayOfWeek: defaultHour.dayOfWeek,
          // Lógica de negócio: Se tem horário definido, está ativo
          isActive: !!(existing?.startTime && existing?.endTime),
          startTime: existing?.startTime || null,
          endTime: existing?.endTime || null,
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
      // Verifica camelCase isActive
      if (watch(`hours.${index}.isActive`)) {
        // Atualiza camelCase startTime/endTime
        setValue(`hours.${index}.startTime`, startTime, { shouldValidate: true });
        setValue(`hours.${index}.endTime`, endTime, { shouldValidate: true });
        update(index, { ...field, startTime: startTime, endTime: endTime });
      }
    });
    toast.info('Horários aplicados aos dias ativos.');
  }, [fields, watch, setValue, update]);

  // --- Handlers de Horários (Update Hours) ---
  const onSubmitHours = (formData: WorkingHoursFormData) => {
    // Preparação para envio. O Drizzle no backend (Passo 1/3) fará o map reverso para snake_case se necessário,
    // mas a API deve receber camelCase conforme contrato.
    const hoursToUpsert = formData.hours.map(h => ({
        dayOfWeek: h.dayOfWeek,
        startTime: h.isActive ? h.startTime : null,
        endTime: h.isActive ? h.endTime : null,
    }));
    updateHours(hoursToUpsert as any);
  };

  // --- Handlers de Exceções (Add/Delete Exception) ---
  const onSubmitException = (formData: BusinessExceptionFormData) => {
    const exceptionData = {
      description: formData.description,
      // camelCase para a API
      exceptionDate: dayjs(formData.exceptionDate).format('YYYY-MM-DD'),
      startTime: formData.startTime || null,
      endTime: formData.endTime || null,
    };

    addException(exceptionData as any, {
      onSuccess: () => {
        setIsExceptionModalOpen(false);
        exceptionForm.reset({
          description: '',
          exceptionDate: dayjs().startOf('day').toDate(),
          startTime: '09:00',
          endTime: '18:00',
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
                      
                      {/* Checkbox para Ativar o Dia (isActive) */}
                      <FormField
                        control={hoursForm.control}
                        name={`hours.${index}.isActive`}
                        render={({ field: checkboxField }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0 col-span-2 lg:col-span-1">
                            <FormControl>
                              <Checkbox
                                checked={checkboxField.value}
                                onCheckedChange={(checked) => {
                                    if (!checked) {
                                        setValue(`hours.${index}.startTime`, null);
                                        setValue(`hours.${index}.endTime`, null);
                                    }
                                    checkboxField.onChange(checked);
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-semibold text-foreground cursor-pointer">
                              {DAYS_OF_WEEK.find(d => d.value === field.dayOfWeek)?.label}
                            </FormLabel>
                          </FormItem>
                        )}
                      />

                      {/* Input de Hora Início (startTime) */}
                      <FormField
                        control={hoursForm.control}
                        name={`hours.${index}.startTime`}
                        render={({ field: timeField }) => (
                          <FormItem className="col-span-2 lg:col-span-1">
                            <FormControl>
                              <Input 
                                type="time" 
                                {...timeField} 
                                value={timeField.value || ''}
                                disabled={!watch(`hours.${index}.isActive`)}
                                placeholder="Início" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Input de Hora Fim (endTime) */}
                      <FormField
                        control={hoursForm.control}
                        name={`hours.${index}.endTime`}
                        render={({ field: timeField }) => (
                          <FormItem className="col-span-2 lg:col-span-1">
                            <FormControl>
                              <Input 
                                type="time" 
                                {...timeField} 
                                value={timeField.value || ''}
                                disabled={!watch(`hours.${index}.isActive`)}
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

                        {/* Campo Atualizado para camelCase: exceptionDate */}
                        <FormField
                            control={exceptionForm.control}
                            name="exceptionDate"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Data *</FormLabel>
                                    <FormControl>
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
                            {/* Campo Atualizado para camelCase: startTime */}
                            <FormField
                                control={exceptionForm.control}
                                name="startTime"
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
                            {/* Campo Atualizado para camelCase: endTime */}
                            <FormField
                                control={exceptionForm.control}
                                name="endTime"
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
                        {/* Uso de camelCase: exceptionDate */}
                        <span>{dayjs(exception.exceptionDate).format('DD/MM/YYYY')}</span>
                        <span className="text-xs text-primary">•</span>
                        {/* Uso de camelCase: startTime e endTime */}
                        {exception.startTime && exception.endTime ? (
                            <span>{exception.startTime} - {exception.endTime}</span>
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