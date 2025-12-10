/*
* Arquivo de Destino: /packages/web/src/features/professionals/components/ProfessionalsDataTable.tsx
*
* Tarefa: 3.2. Criar uma tabela de dados (DataTable) para listar, editar e excluir profissionais.
*
* Princípios:
* - CDA (2.17): Usa o componente <DataTable> de shadcn/ui.
* - PGEC (2.13): Consome o hook useProfessionalsQuery e trata estados de loading/erro.
* - SoC (2.5) / CQRS (2.12): Delega lógica de escrita (create/update/delete) aos hooks e modais.
* - PTE (2.15): Agnóstico à lógica de exclusão, apenas chama o hook.
* - DRY (2.2): Utiliza formatCurrency de @/lib/utils.
*/

"use client"

import * as React from "react"
import { useState, useMemo } from "react"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  SortingState,
  ColumnFiltersState,
} from "@tanstack/react-table"

// --- Importações de UI (shadcn/ui) ---
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"

// --- Importações de Ícones ---
import { MoreHorizontal, Plus, Loader2, AlertTriangle, Users } from "lucide-react"

// --- Importações de Hooks (CQRS) ---
import { useProfessionalsQuery } from "../hooks/useProfessionalsQuery"
import { useDeleteProfessionalMutation } from "../hooks/useDeleteProfessionalMutation"

// --- Importações de Componentes da Feature ---
import { ProfessionalFormModal } from "./ProfessionalFormModal"

// --- Importações de Tipos ---
import { ProfessionalType } from "@/@types/shared-types"

// --- Importações de Utilitários Compartilhados (DRY) ---
import { formatCurrency } from "@/lib/utils"

// --- Funções Utilitárias Locais ---

/**
 * Formata uma taxa de comissão (ex: 0.1 -> 10%).
 * Nota: Mantido local por enquanto, mas candidato a ir para utils se usado em outros lugares.
 */
const formatCommission = (rate: number | null | undefined) => {
  if (rate == null) return "0%"
  return `${(rate * 100).toFixed(0)}%`
}

/**
 * Componente principal da tabela de dados de profissionais.
 */
export function ProfessionalsDataTable() {
  const { toast } = useToast()

  // --- Estados de UI ---
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isAlertOpen, setIsAlertOpen] = useState(false)
  const [selectedProfessional, setSelectedProfessional] =
    useState<ProfessionalType | null>(null)

  // --- Hooks de Query (Leitura) ---
  const professionalsQuery = useProfessionalsQuery()

  // --- Hooks de Mutation (Escrita) ---
  const deleteMutation = useDeleteProfessionalMutation({
    onSuccess: () => {
      toast({
        title: "Sucesso!",
        description: "Profissional excluído com sucesso.",
        variant: "default",
      })
      setIsAlertOpen(false)
      setSelectedProfessional(null)
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir",
        description:
          error.message || "Não foi possível excluir o profissional.",
        variant: "destructive",
      })
    },
  })

  // --- Handlers de Ação ---
  const handleAddNew = () => {
    setSelectedProfessional(null)
    setIsModalOpen(true)
  }

  const handleEdit = (professional: ProfessionalType) => {
    setSelectedProfessional(professional)
    setIsModalOpen(true)
  }

  const handleDelete = (professional: ProfessionalType) => {
    setSelectedProfessional(professional)
    setIsAlertOpen(true)
  }

  const onConfirmDelete = () => {
    if (selectedProfessional) {
      deleteMutation.mutate(selectedProfessional.id)
    }
  }

  // --- Definição das Colunas (tanstack/react-table) ---
  const columns: ColumnDef<ProfessionalType>[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Nome",
        cell: ({ row }) => (
          <div className="font-medium">{row.original.name}</div>
        ),
      },
      {
        accessorKey: "color",
        header: "Cor",
        cell: ({ row }) => {
          const color = row.original.color || "#ccc"
          return (
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full border shadow-sm"
                style={{ backgroundColor: color }}
              />
              <span className="font-mono text-xs">{color}</span>
            </div>
          )
        },
      },
      {
        accessorKey: "salary",
        header: "Salário Base",
        cell: ({ row }) => {
          const salary = row.original.salary
          // Correção DRY: Usa formatCurrency compartilhado, tratando nulos explicitamente
          return salary != null ? formatCurrency(salary) : "N/D"
        },
      },
      {
        // REFATORAÇÃO STEP 4: Atualizado de 'commission_rate' (snake_case) para 'commissionRate' (camelCase)
        accessorKey: "commissionRate",
        header: "Comissão",
        // REFATORAÇÃO STEP 4: Acessando a propriedade camelCase do objeto row.original
        cell: ({ row }) => formatCommission(row.original.commissionRate),
      },
      // As colunas 'workHours' e 'lunchHours' foram removidas
      // para aderir ao Princípio YAGNI (2.4).
      {
        id: "actions",
        header: () => <div className="text-right">Ações</div>,
        cell: ({ row }) => {
          const professional = row.original
          return (
            <div className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Abrir menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Ações</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => handleEdit(professional)}>
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleDelete(professional)}
                    className="text-destructive"
                  >
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const table = useReactTable({
    data: professionalsQuery.data || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: {
      sorting,
      columnFilters,
    },
  })

  // --- Renderização de Estados (PGEC) ---
  if (professionalsQuery.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">
          Carregando profissionais...
        </span>
      </div>
    )
  }

  if (professionalsQuery.isError) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-md border border-destructive/20 bg-destructive/5 p-8">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <p className="mt-4 text-center font-semibold text-destructive">
          Erro ao carregar profissionais
        </p>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          {professionalsQuery.error.message ||
            "Não foi possível buscar os dados."}
        </p>
      </div>
    )
  }

  // --- Renderização Principal ---
  return (
    <div className="w-full space-y-4">
      {/* Header com Filtro e Botão de Adicionar */}
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder="Filtrar por nome..."
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("name")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <Button onClick={handleAddNew}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Profissional
        </Button>
      </div>

      {/* Tabela de Dados */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <div className="flex flex-col items-center justify-center gap-2 py-8">
                    <Users className="h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      Nenhum profissional encontrado.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginação */}
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Próximo
        </Button>
      </div>

      {/* Modal de Formulário (Controlado pelo Estado) */}
      <ProfessionalFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        professional={selectedProfessional}
      />

      {/* Modal de Alerta para Exclusão (Controlado pelo Estado) */}
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o
              profissional{" "}
              <span className="font-medium text-foreground">
                {selectedProfessional?.name}
              </span>
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}