/*
* Arquivo de Destino: /packages/web/src/features/professionals/components/ProfessionalFormModal.tsx
*
* Tarefa 3.1: Refatorar o modal de formulário de Profissionais.
*
* De Onde (Refatoração): src/react-app/components/ProfessionalFormModal.tsx
*
* Princípios:
* - SoC (2.5): Componente "burro", delega lógica de submit aos hooks de mutação.
* - CDA (2.17): Substitui PrimeReact (InputText, ColorPicker, InputNumber) por shadcn/ui (Dialog, Form, Input).
* - DSpP (2.16): Usa react-hook-form com zodResolver.
* - Correção de Bug (Problema 4): Corrige o bug do formato de cor (duplo '#') usando <Input type="color">, que
* gerencia nativamente o formato #RRGGBB, alinhando-se à validação Zod.
* - Correção de Feature (Problema 28): Adiciona os 4 novos campos de horário (work_start_time, etc.)
* da migração 12, que estavam faltando no schema e no formulário legados.
*/

"use client"

import * as React from "react"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2, Palette, DollarSign, Percent, Clock } from "lucide-react"

// --- Importações de UI (shadcn/ui) ---
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/components/ui/use-toast"

// --- Importações de Hooks (CQRS) ---
import { useAddProfessionalMutation } from "../hooks/useAddProfessionalMutation"
import { useUpdateProfessionalMutation } from "../hooks/useUpdateProfessionalMutation"

// --- Importações de Tipos ---
// Importamos os schemas da API para garantir que nossos dados transformados
// correspondam ao que as mutações esperam.
import {
  ProfessionalType,
  CreateProfessionalSchema,
  ProfessionalSchema,
} from "@/packages/shared-types"

/**
 * Schema Zod para o *formulário* (UI).
 * Este schema representa os dados como o usuário os vê (ex: Salário em R$, Comissão em %).
 * Ele será transformado para o formato da API (ex: centavos, decimal) no submit.
 */
const formSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  color: z
    .string()
    .regex(
      /^#[0-9a-fA-F]{6}$/,
      "Formato de cor inválido. Use o seletor ou #RRGGBB.",
    )
    .nullable()
    .optional(),
  salary: z.number().min(0, "Salário deve ser positivo").nullable().optional(), // Em R$ (ex: 1500.50)
  commission_rate: z
    .number()
    .min(0, "Comissão deve ser positiva")
    .max(100, "Comissão não pode ser maior que 100%")
    .nullable()
    .optional(), // Em % (ex: 10 para 10%)

  // Novos campos (Problema 28 / Migração 12)
  work_start_time: z.string().nullable().optional(), // Formato "HH:mm"
  work_end_time: z.string().nullable().optional(),
  lunch_start_time: z.string().nullable().optional(),
  lunch_end_time: z.string().nullable().optional(),
})

type ProfessionalFormData = z.infer<typeof formSchema>

// --- Props do Componente ---
interface ProfessionalFormModalProps {
  isOpen: boolean
  onClose: () => void
  professional: ProfessionalType | null // null para "criar", objeto para "editar"
}

/**
 * Valores padrão do formulário (modo "criar").
 */
const defaultValues: ProfessionalFormData = {
  name: "",
  color: "#a855f7", // Cor padrão (violeta secundário)
  salary: null,
  commission_rate: null,
  work_start_time: "",
  work_end_time: "",
  lunch_start_time: "",
  lunch_end_time: "",
}

/**
 * Converte os dados da API (ProfessionalType) para o formato do formulário (ProfessionalFormData).
 * Ex: centavos -> R$, decimal -> %
 */
const transformToFormData = (
  p: ProfessionalType,
): ProfessionalFormData => ({
  name: p.name,
  color: p.color || "#a855f7",
  salary: p.salary ? p.salary / 100 : null, // Cents para R$
  commission_rate: p.commission_rate ? p.commission_rate * 100 : null, // Decimal (0.1) para % (10)
  work_start_time: p.work_start_time || "",
  work_end_time: p.work_end_time || "",
  lunch_start_time: p.lunch_start_time || "",
  lunch_end_time: p.lunch_end_time || "",
})

/**
 * Converte os dados do formulário (ProfessionalFormData) para o formato da API
 * (compatível com CreateProfessionalSchema/ProfessionalSchema).
 * Ex: R$ -> centavos, % -> decimal
 */
const transformToApiData = (data: ProfessionalFormData) => {
  // As chaves aqui devem corresponder aos schemas de API (ProfessionalSchema)
  return {
    name: data.name,
    color: data.color || null,
    salary: data.salary ? Math.round(data.salary * 100) : null, // R$ para Cents
    commission_rate: data.commission_rate
      ? data.commission_rate / 100
      : null, // % (10) para Decimal (0.1)
    work_start_time: data.work_start_time || null,
    work_end_time: data.work_end_time || null,
    lunch_start_time: data.lunch_start_time || null,
    lunch_end_time: data.lunch_end_time || null,
  }
}

/**
 * Modal de Diálogo (shadcn/ui) para criar ou editar um Profissional,
 * usando React Hook Form e os hooks de mutação (CQRS).
 */
export function ProfessionalFormModal({
  isOpen,
  onClose,
  professional,
}: ProfessionalFormModalProps) {
  const { toast } = useToast()
  const isEditing = !!professional

  const form = useForm<ProfessionalFormData>({
    resolver: zodResolver(formSchema),
    defaultValues,
  })

  // --- Resetar o formulário ao abrir/mudar o profissional ---
  useEffect(() => {
    if (isOpen) {
      if (isEditing) {
        form.reset(transformToFormData(professional))
      } else {
        form.reset(defaultValues)
      }
    }
  }, [isOpen, isEditing, professional, form])

  // --- Hooks de Mutação (Escrita) ---
  const addMutation = useAddProfessionalMutation({
    onSuccess: () => {
      toast({
        title: "Sucesso!",
        description: "Novo profissional adicionado.",
      })
      onClose()
    },
    onError: (error) => {
      toast({
        title: "Erro ao adicionar",
        description:
          error.message || "Não foi possível criar o profissional.",
        variant: "destructive",
      })
    },
  })

  const updateMutation = useUpdateProfessionalMutation({
    onSuccess: () => {
      toast({
        title: "Sucesso!",
        description: "Profissional atualizado.",
      })
      onClose()
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar",
        description:
          error.message || "Não foi possível salvar as alterações.",
        variant: "destructive",
      })
    },
  })

  const isLoading = addMutation.isPending || updateMutation.isPending

  // --- Handler de Submit ---
  const onSubmit = (data: ProfessionalFormData) => {
    const apiData = transformToApiData(data)

    if (isEditing) {
      // Garantir que o schema de atualização (ProfessionalSchema) seja satisfeito
      const updateData: z.infer<typeof ProfessionalSchema> = {
        ...apiData,
        id: professional.id, // ID é obrigatório para update
        user_id: professional.user_id, // user_id é obrigatório
      }
      updateMutation.mutate(updateData)
    } else {
      // Garantir que o schema de criação (CreateProfessionalSchema) seja satisfeito
      const createData: z.infer<typeof CreateProfessionalSchema> = apiData
      addMutation.mutate(createData)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Profissional" : "Novo Profissional"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize os detalhes deste profissional."
              : "Preencha os dados para adicionar um novo profissional à equipe."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            {/* O ScrollArea é útil para formulários longos em telas menores */}
            <ScrollArea className="max-h-[70vh] w-full p-1 pr-4">
              <div className="space-y-4 p-4">
                {/* Campo Nome */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: João da Silva" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Campo Cor (FIX Problema 4) */}
                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cor de Identificação</FormLabel>
                      <div className="flex items-center gap-2">
                        <FormControl>
                          {/* Este input gerencia o formato #RRGGBB nativamente */}
                          <Input
                            type="color"
                            className="h-10 w-14 p-1"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <Input
                          placeholder="#a855f7"
                          {...field}
                          value={field.value || ""}
                        />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* --- Campos Financeiros --- */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="salary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Salário Base (R$)</FormLabel>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="1500,00"
                              className="pl-9"
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value === ""
                                    ? null
                                    : parseFloat(e.target.value),
                                )
                              }
                            />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="commission_rate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Comissão (%)</FormLabel>
                        <div className="relative">
                          <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <FormControl>
                            <Input
                              type="number"
                              step="1"
                              placeholder="10"
                              className="pl-9"
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value === ""
                                    ? null
                                    : parseFloat(e.target.value),
                                )
                              }
                            />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* --- Campos de Horário (FIX Problema 28) --- */}
                <div>
                  <FormLabel className="text-base font-semibold">
                    Jornada de Trabalho
                  </FormLabel>
                  <FormDescription>
                    Horário padrão de trabalho e almoço.
                  </FormDescription>
                  <div className="grid grid-cols-2 gap-4 mt-3 rounded-md border p-4">
                    <FormField
                      control={form.control}
                      name="work_start_time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Início (Trabalho)</FormLabel>
                          <FormControl>
                            <Input
                              type="time"
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="work_end_time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fim (Trabalho)</FormLabel>
                          <FormControl>
                            <Input
                              type="time"
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lunch_start_time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Início (Almoço)</FormLabel>
                          <FormControl>
                            <Input
                              type="time"
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lunch_end_time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fim (Almoço)</FormLabel>
                          <FormControl>
                            <Input
                              type="time"
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className="pt-6 pr-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEditing
                  ? "Salvar Alterações"
                  : "Adicionar Profissional"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}