// packages/web/src/features/financial/components/FinancialDataTable.tsx

import { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ConfirmationModal } from '@/components/ConfirmationModal';
import { MoreHorizontal, ArrowUpDown, Edit, Trash2, Plus, Search } from 'lucide-react';

import { useFinancialEntriesQuery } from '../hooks/useFinancialEntriesQuery';
import { useDeleteFinancialEntryMutation } from '../hooks/useDeleteFinancialEntryMutation';
import { FinancialFormModal } from './FinancialFormModal';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { FinancialEntry } from '@/packages/shared-types';

export function FinancialDataTable() {
  // 1. Hooks de Data Fetching
  const { data: entries = [], isLoading, isError } = useFinancialEntriesQuery();
  const { mutate: deleteEntry, isPending: isDeleting } = useDeleteFinancialEntryMutation();

  // 2. Estados Locais (Gerenciamento autônomo da UI)
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  
  // Estado do Modal de Formulário (Criação/Edição)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<FinancialEntry | null>(null);

  // Estado do Modal de Exclusão
  const [entryToDelete, setEntryToDelete] = useState<FinancialEntry | null>(null);

  // 3. Handlers Internos
  const handleNewEntry = () => {
    setEditingEntry(null); // Garante modo de criação
    setIsFormOpen(true);
  };

  const handleEditEntry = (entry: FinancialEntry) => {
    setEditingEntry(entry); // Garante modo de edição
    setIsFormOpen(true);
  };

  const handleDeleteClick = (entry: FinancialEntry) => {
    setEntryToDelete(entry);
  };

  const confirmDelete = () => {
    if (entryToDelete?.id) {
      deleteEntry(entryToDelete.id, {
        onSuccess: () => {
          setEntryToDelete(null);
        },
      });
    }
  };

  // 4. Definição de Colunas
  const columns: ColumnDef<FinancialEntry>[] = [
    {
      accessorKey: 'entry_date',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Data
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => formatDate(row.getValue('entry_date')),
    },
    {
      accessorKey: 'description',
      header: 'Descrição',
      cell: ({ row }) => <div className="font-medium">{row.getValue('description')}</div>,
    },
    {
      accessorKey: 'type',
      header: 'Tipo',
      cell: ({ row }) => {
        const type = row.getValue('type') as string;
        return (
          <Badge 
            variant={type === 'receita' ? 'default' : 'destructive'} 
            className={type === 'receita' ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            {type === 'receita' ? 'Receita' : 'Despesa'}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'entry_type',
      header: 'Frequência',
      cell: ({ row }) => {
        const entryType = row.getValue('entry_type') as string;
        return <span className="capitalize text-muted-foreground">{entryType}</span>;
      },
    },
    {
      accessorKey: 'amount',
      header: ({ column }) => (
        <div className="text-right">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Valor
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      ),
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue('amount'));
        const type = row.original.type;
        
        const colorClass = type === 'receita' ? 'text-green-600' : 'text-red-600';
        
        return (
          <div className={`text-right font-medium ${colorClass}`}>
            {type === 'despesa' ? '-' : '+'}{formatCurrency(amount)}
          </div>
        );
      },
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => {
        const entry = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Abrir menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Ações</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleEditEntry(entry)}>
                <Edit className="mr-2 h-4 w-4" /> Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => handleDeleteClick(entry)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // 5. Configuração da Tabela
  const table = useReactTable({
    data: entries,
    columns,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      globalFilter,
    },
  });

  // 6. Renderização Condicional de Loading/Erro
  if (isLoading) {
    return (
      <div className="space-y-4 w-full">
        <div className="flex justify-between">
           <Skeleton className="h-10 w-[250px]" />
           <Skeleton className="h-10 w-[150px]" />
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (isError) {
    return <div className="text-center text-destructive py-8">Erro ao carregar lançamentos financeiros.</div>;
  }

  return (
    <div className="w-full space-y-4">
      {/* Header da Tabela: Filtros e Ações */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filtrar lançamentos..."
              value={globalFilter ?? ''}
              onChange={(event) => setGlobalFilter(event.target.value)}
              className="pl-8"
            />
        </div>
        <Button onClick={handleNewEntry}>
          <Plus className="mr-2 h-4 w-4" /> Novo Lançamento
        </Button>
      </div>

      {/* Tabela */}
      <div className="rounded-md border">
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
                            header.getContext()
                          )}
                    </TableHead>
                  );
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
                        cell.getContext()
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
                  Nenhum lançamento encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Paginação */}
      <div className="flex items-center justify-end space-x-2">
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

      {/* Modais Gerenciados Internamente */}
      <FinancialFormModal 
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        editingEntry={editingEntry}
      />

      <ConfirmationModal
        isOpen={!!entryToDelete}
        onClose={() => setEntryToDelete(null)}
        onConfirm={confirmDelete}
        title="Excluir Lançamento"
        description={`Tem certeza que deseja excluir o lançamento "${entryToDelete?.description}"? Esta ação não pode ser desfeita.`}
        variant="destructive"
        isLoading={isDeleting}
      />
    </div>
  );
}