import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, Loader2, AlertCircle } from 'lucide-react';

import { useAuth } from '../hooks/useAuth';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/packages/web/src/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/packages/web/src/components/ui/form';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/packages/web/src/components/ui/alert';
import { Button } from '@/packages/web/src/components/ui/button';
import { Input } from '@/packages/web/src/components/ui/input';

/**
 * Princípio da Lei de Demeter (2.10):
 * O schema de validação (Zod) é definido localmente neste componente.
 * A UI é responsável por sua própria validação de formulário e não
 * "busca" esse schema de um local externo.
 */
const loginSchema = z.object({
  email: z
    .string({ required_error: 'O e-mail é obrigatório.' })
    .email({ message: 'Por favor, insira um e-mail válido.' }),
  password: z
    .string({ required_error: 'A senha é obrigatória.' })
    .min(6, { message: 'A senha deve ter pelo menos 6 caracteres.' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

/**
 * Componente de UI (Nível 1) para o formulário de login.
 *
 * Princípios Aplicados:
 * - SoC (2.5): Responsabilidade única de UI e estado de formulário (react-hook-form).
 * - CDA (2.17): Construído exclusivamente com shadcn/ui e tokens semânticos.
 * - Demeter (2.10): Possui seu próprio schema de validação e apenas
 * "fala com seu amigo imediato" (useAuth) para disparar a mutação.
 */
export function LoginForm() {
  // Obtém as mutações do hook de autenticação (Nível 3)
  const { loginMutation } = useAuth();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Handler de submissão que chama a mutação (Command)
  function onSubmit(data: LoginFormValues) {
    loginMutation.mutate(data);
  }

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Login</CardTitle>
        <CardDescription>Acesse sua conta para continuar.</CardDescription>
      </CardHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-0">
          <CardContent className="space-y-4">
            {/* Campo de Email */}
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
                        placeholder="seu@email.com"
                        {...field}
                        className="pl-10"
                        autoComplete="email"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Campo de Senha */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                        className="pl-10"
                        autoComplete="current-password"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Feedback de Erro da Mutação */}
            {loginMutation.isError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Erro no Login</AlertTitle>
                <AlertDescription>
                  {loginMutation.error instanceof Error
                    ? loginMutation.error.message
                    : 'Ocorreu um erro desconhecido. Tente novamente.'}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>

          <CardFooter>
            {/* Feedback de Estado Pendente (Loading) no Botão */}
            <Button
              type="submit"
              className="w-full"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}