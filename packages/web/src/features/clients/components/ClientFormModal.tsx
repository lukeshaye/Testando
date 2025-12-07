// /packages/web/src/features/clients/components/ClientFormModal.tsx

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ClientType, CreateClientSchema } from '@/packages/shared-types';
import { useAddClientMutation } from '../hooks/useAddClientMutation';
import { useUpdateClientMutation } from '../hooks/useUpdateClientMutation';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/packages/web/src/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/packages/web/src/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/packages/web/src/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/packages/web/src/components/ui/popover';
import { Button } from '@/packages/web/src/components/ui/button';
import { Input } from '@/packages/web/src/components/ui/input';
import { Textarea } from '@/packages/web/src/components/ui/textarea';
import { Calendar } from '@/packages/web/src/components/ui/calendar';
import { cn } from '@/packages/web/src/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  User,
  Mail,
  Phone,
  Loader2,
  Calendar as CalendarIcon,
} from 'lucide-react';

// --- Definição de Tipos ---
interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Callback executado quando um *novo* cliente é criado com sucesso,
   * retornando o cliente recém-criado.
   */
  onClientCreated: (client: ClientType) => void;
  editingClient: ClientType | null;
}

const genderOptions = [
  { label: 'Masculino', value: 'masculino' },
  { label: 'Feminino', value: 'feminino' },
  { label: 'Outro', value: 'outro' },
];

/**
 * Modal de formulário para criar ou editar clientes.
 *
 * Princípios:
 * - CDA (2.17): Utiliza componentes shadcn/ui (Dialog, Form, Input, Select, Calendar)
 * substituindo a implementação legada do PrimeReact.
 * - SoC (2.5): O componente foca na apresentação e validação do formulário.
 * Ele delega a lógica de API (salvar/atualizar) para os hooks de mutação.
 * - DSpP (2.16): Mantém a validação de frontend (Zod + react-hook-form)
 * para feedback imediato ao usuário.
 */
export function ClientFormModal({
  isOpen,
  onClose,
  onClientCreated,
  editingClient,
}: ClientFormModalProps) {
  // 1. Hooks de Mutação (PGEC 2.13, CQRS 2.12)
  const addMutation = useAddClientMutation();
  const updateMutation = useUpdateClientMutation();
  const isPending = addMutation.isPending || updateMutation.isPending;

  // 2. Configuração do Formulário (DSpP 2.16)
  const form = useForm<z.infer<typeof CreateClientSchema>>({
    resolver: zodResolver(CreateClientSchema),
    mode: 'onChange',
  });

  // 3. Efeito para popular o formulário no modo de edição (Plano 3.1.8)
  useEffect(() => {
    if (isOpen) {
      if (editingClient) {
        // Modo Edição: Popula o formulário com dados existentes
        form.reset({
          name: editingClient.name,
          phone: editingClient.phone || '',
          email: editingClient.email || '',
          notes: editingClient.notes || '',
          // Converte string/data para objeto Date que o Calendar do shadcn espera
          birth_date: editingClient.birth_date
            ? new Date(editingClient.birth_date)
            : undefined,
          gender: editingClient.gender || undefined,
        });
      } else {
        // Modo Criação: Reseta para valores padrão
        form.reset({
          name: '',
          phone: '',
          email: '',
          notes: '',
          birth_date: undefined,
          gender: undefined,
        });
      }
    }
  }, [isOpen, editingClient, form]);

  // 4. Lógica de Submissão (Plano 3.1.5)
  function onSubmit(data: z.infer<typeof CreateClientSchema>) {
    if (editingClient) {
      // Modo Edição: Chama a mutação de atualização
      updateMutation.mutate(
        { id: editingClient.id, data },
        {
          onSuccess: () => {
            onClose(); // Fecha o modal
          },
        }
      );
    } else {
      // Modo Criação: Chama a mutação de adição
      addMutation.mutate(data, {
        onSuccess: (newClient) => {
          onClientCreated(newClient); // (Plano 3.1.7) Retorna o novo cliente
          onClose(); // Fecha o modal
        },
      });
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
          </DialogTitle>
        </DialogHeader>

        {/* 5. Formulário com componentes shadcn/ui (CDA 2.17) */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Campo Nome */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        {...field}
                        placeholder="Ex: Maria Silva"
                        className="pl-10"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Campo Telefone */}
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        {...field}
                        placeholder="(11) 99999-9999"
                        className="pl-10"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Campo Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        {...field}
                        type="email"
                        placeholder="Ex: maria@email.com"
                        className="pl-10"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Campos: Data de Nascimento e Gênero */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="birth_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data de Nascimento</FormLabel>
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
                              format(field.value, 'dd/MM/yyyy', {
                                locale: ptBR,
                              })
                            ) : (
                              <span>DD/MM/AAAA</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date('1900-01-01')
                          }
                          initialFocus
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gênero</FormLabel>
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
                        {genderOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Campo Notas */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Preferências, observações, alergias..."
                      className="resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Salvar Cliente
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}