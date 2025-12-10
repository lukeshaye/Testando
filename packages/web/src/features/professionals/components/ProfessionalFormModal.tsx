/*
* Arquivo de Destino: /packages/web/src/features/professionals/components/ProfessionalFormModal.tsx
*
* Refatoração Padrão Ouro (Passo 4: A Interface):
* - Atualização para camelCase (ex: commission_rate -> commissionRate).
* - Remoção de traduções manuais de chaves (snake -> camel), mantendo apenas conversão de tipos (R$ -> Cents).
* - Alinhamento com os schemas Zod atualizados no Passo 2.
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
import {
  ProfessionalType,
  CreateProfessionalSchema,
  ProfessionalSchema,
} from "@/packages/shared-types"

/**
 * Schema Zod para o *formulário* (UI) em camelCase.
 * Representa os dados visuais (R$, %).
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
  salary: z.number().min(0, "Salário deve ser positivo").nullable().optional(), // Em R$
  commissionRate: z // Renomeado de commission_rate
    .number()
    .min(0, "Comissão deve ser positiva")
    .max(100, "Comissão não pode ser maior que 100%")
    .nullable()
    .optional(), // Em %

  // Novos campos em camelCase
  workStartTime: z.string().nullable().optional(),
  workEndTime: z.string().nullable().optional(),
  lunchStartTime: z.string().nullable().optional(),
  lunchEndTime: z.string().nullable().optional(),
})

type ProfessionalFormData = z.infer<typeof formSchema>

// --- Props do Componente ---
interface ProfessionalFormModalProps {
  isOpen: boolean
  onClose: () => void
  professional: ProfessionalType | null
}

/**
 * Valores padrão do formulário (camelCase).
 */
const defaultValues: ProfessionalFormData = {
  name: "",
  color: "#a855f7",
  salary: null,
  commissionRate: null,
  workStartTime: "",
  workEndTime: "",
  lunchStartTime: "",
  lunchEndTime: "",
}

/**
 * Converte API (camelCase) -> Form (camelCase).
 * Foca apenas na transformação de valores (Cents -> R$, Decimal -> %).
 */
const transformToFormData = (
  p: ProfessionalType,
): ProfessionalFormData => ({
  name: p.name,
  color: p.color || "#a855f7",
  salary: p.salary ? p.salary / 100 : null,
  commissionRate: p.commissionRate ? p.commissionRate * 100 : null, // Assume que ProfessionalType já está atualizado
  workStartTime: p.workStartTime || "",
  workEndTime: p.workEndTime || "",
  lunchStartTime: p.lunchStartTime || "",
  lunchEndTime: p.lunchEndTime || "",
})

/**
 * Converte Form (camelCase) -> API (camelCase).
 * Foca apenas na transformação de valores (R$ -> Cents, % -> Decimal).
 */
const transformToApiData = (data: ProfessionalFormData) => {
  return {
    name: data.name,
    color: data.color || null,
    salary: data.salary ? Math.round(data.salary * 100) : null,
    commissionRate: data.commissionRate
      ? data.commissionRate / 100
      : null,
    workStartTime: data.workStartTime || null,
    workEndTime: data.workEndTime || null,
    lunchStartTime: data.lunchStartTime || null,
    lunchEndTime: data.lunchEndTime || null,
  }
}

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

  // --- Resetar o formulário ---
  useEffect(() => {
    if (isOpen) {
      if (isEditing) {
        form.reset(transformToFormData(professional))
      } else {
        form.reset(defaultValues)
      }
    }
  }, [isOpen, isEditing, professional, form])

  // --- Hooks de Mutação ---
  const addMutation = useAddProfessionalMutation({
    onSuccess: () => {
      toast({ title: "Sucesso!", description: "Novo profissional adicionado." })
      onClose()
    },
    onError: (error) => {
      toast({
        title: "Erro ao adicionar",
        description: error.message || "Não foi possível criar o profissional.",
        variant: "destructive",
      })
    },
  })

  const updateMutation = useUpdateProfessionalMutation({
    onSuccess: () => {
      toast({ title: "Sucesso!", description: "Profissional atualizado." })
      onClose()
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar",
        description: error.message || "Não foi possível salvar as alterações.",
        variant: "destructive",
      })
    },
  })

  const isLoading = addMutation.isPending || updateMutation.isPending

  // --- Handler de Submit ---
  const onSubmit = (data: ProfessionalFormData) => {
    const apiData = transformToApiData(data)

    if (isEditing) {
      // Atualizado para usar userId e id em camelCase
      const updateData: z.infer<typeof ProfessionalSchema> = {
        ...apiData,
        id: professional.id,
        userId: professional.userId, // Atualizado de user_id para userId
      }
      updateMutation.mutate(updateData)
    } else {
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

                {/* Campo Cor */}
                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cor de Identificação</FormLabel>
                      <div className="flex items-center gap-2">
                        <FormControl>
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
                  {/* Atualizado name="commissionRate" */}
                  <FormField
                    control={form.control}
                    name="commissionRate"
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

                {/* --- Campos de Horário (Atualizados para camelCase) --- */}
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
                      name="workStartTime"
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
                      name="workEndTime"
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
                      name="lunchStartTime"
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
                      name="lunchEndTime"
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