// /packages/web/src/features/settings/components/ProfileSettingsForm.tsx

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';

// Imports de UI (shadcn/ui)
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

// Imports da Feature
import { useSettingsQuery } from '../hooks/useSettingsQuery';
import { useUpdateProfileSettingsMutation } from '../hooks/useUpdateSettingsMutation';

// [DRY 2.2] Importação do Contrato (Shared Types)
// Isso centraliza a lógica de validação. Se a regra mudar no backend, o frontend se adapta automaticamente.
// Ajuste o caminho de importação conforme a configuração do seu monorepo (ex: @barba/shared-types)
import { 
  profileSettingsSchema, 
  type ProfileSettingsFormData 
} from '@barba/shared-types/schemas/settings.schema'; 

export const ProfileSettingsForm = () => {
  // 1. Consumir hooks de dados e mutação
  const { data, isLoading } = useSettingsQuery();
  const { mutate, isPending } = useUpdateProfileSettingsMutation();

  // 2. Inicializar useForm com Tipagem Compartilhada
  const form = useForm<ProfileSettingsFormData>({
    resolver: zodResolver(profileSettingsSchema),
    defaultValues: {
      name: '',
      phone: '',
      address: '',
    },
  });

  // 3. Sincronizar dados (Mapeamento Automático - Padrão Ouro)
  // [KISS 2.3] Como o Backend agora retorna camelCase (Step 3 do plano),
  // não precisamos de tradução manual (ex: name: data.business_name).
  useEffect(() => {
    if (data?.profile) {
      // O reset aceita o objeto direto pois as chaves batem exatamente com o schema
      form.reset(data.profile);
    }
  }, [data, form]);

  // 4. Handler de envio
  const onSubmit = (values: ProfileSettingsFormData) => {
    mutate(values);
  };

  // 5. Renderização (Loading State)
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Perfil do Negócio</CardTitle>
        <CardDescription>
          Gerencie as informações básicas do seu estabelecimento.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Campo: Nome (camelCase) */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Estabelecimento</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Barbearia Silva" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Campo: Telefone (camelCase) */}
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl>
                    <Input placeholder="(00) 00000-0000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Campo: Endereço (camelCase) */}
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Endereço</FormLabel>
                  <FormControl>
                    <Input placeholder="Rua Exemplo, 123" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isPending ? 'Salvando...' : 'Salvar Perfil'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};