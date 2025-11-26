import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarIcon, Loader2 } from "lucide-react";
import { z } from "zod";

import { CreateFinancialEntrySchema } from "@/packages/shared-types";
import type { FinancialEntry, CreateFinancialEntry } from "@/packages/shared-types";

// IMPORTS DE MUTATION (Ajuste o caminho conforme sua estrutura de pastas, ex: ../api/mutations)
import { useAddFinancialEntryMutation } from "../hooks/useAddFinancialEntryMutation";
import { useUpdateFinancialEntryMutation } from "../hooks/useUpdateFinancialEntryMutation";

import { cn, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Schema local estendido para lidar com a coerção de string para número no input
const FormSchema = CreateFinancialEntrySchema.extend({
  amount: z.coerce.number().positive("O valor deve ser positivo"),
});

type FormData = z.infer<typeof FormSchema>;

interface FinancialFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingEntry?: FinancialEntry | null; // Renomeado de initialData para consistência
}

export function FinancialFormModal({
  open,
  onOpenChange,
  editingEntry,
}: FinancialFormModalProps) {
  // Hooks de Mutação
  const addMutation = useAddFinancialEntryMutation();
  const updateMutation = useUpdateFinancialEntryMutation();

  // Estado de loading combinado
  const isSubmitting = addMutation.isPending || updateMutation.isPending;

  const form = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      description: "",
      amount: 0,
      type: "receita",
      entry_type: "pontual",
      entry_date: new Date(),
    },
  });

  // Resetar o formulário quando o modal abre ou os dados de edição mudam
  useEffect(() => {
    if (open) {
      if (editingEntry) {
        form.reset({
          description: editingEntry.description,
          // Converte centavos para reais para edição no input (1234 -> 12.34)
          amount: editingEntry.amount / 100,
          type: editingEntry.type,
          entry_type: editingEntry.entry_type,
          entry_date: new Date(editingEntry.entry_date),
        });
      } else {
        form.reset({
          description: "",
          amount: 0,
          type: "receita",
          entry_type: "pontual",
          entry_date: new Date(),
        });
      }
    }
  }, [open, editingEntry, form]);

  const handleSubmit = async (values: FormData) => {
    try {
      // Converter o valor de volta para centavos antes de enviar (ex: 12.34 -> 1234)
      const payload: CreateFinancialEntry = {
        ...values,
        amount: Math.round(values.amount * 100),
      };

      if (editingEntry) {
        // Fluxo de Edição
        await updateMutation.mutateAsync({ 
          id: editingEntry.id, 
          data: payload 
        });
      } else {
        // Fluxo de Criação
        await addMutation.mutateAsync(payload);
      }

      // Fecha o modal apenas em caso de sucesso
      onOpenChange(false);
    } catch (error) {
      // O tratamento de erro (ex: toasts) geralmente é feito no onError global do QueryClient
      // ou no hook da mutação, mas pode ser adicionado log aqui se necessário.
      console.error("Erro ao salvar lançamento:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {editingEntry ? "Editar Lançamento" : "Novo Lançamento"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Campo: Descrição */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Venda de Produtos" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Campo: Valor */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor (R$)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              {/* Campo: Tipo (Receita/Despesa) */}
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="receita">Receita</SelectItem>
                        <SelectItem value="despesa">Despesa</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Campo: Frequência (Pontual/Fixa) */}
              <FormField
                control={form.control}
                name="entry_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequência</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pontual">Pontual</SelectItem>
                        <SelectItem value="fixa">Fixa</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Campo: Data */}
            <FormField
              control={form.control}
              name="entry_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data do Lançamento</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            formatDate(field.value)
                          ) : (
                            <span>Selecione uma data</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      {/* Note: O Calendar ainda pode precisar de locale se não estiver configurado globalmente, 
                          mas mantivemos a remoção do import 'ptBR' conforme instrução estrita para remover dependências diretas. */}
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingEntry ? "Salvar Alterações" : "Criar Lançamento"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}