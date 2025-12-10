import { useState } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  ColumnFiltersState,
} from '@tanstack/react-table';
import {
  MoreHorizontal,
  Pencil,
  Trash,
  Plus,
  Search,
  Scissors,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Skeleton } from '@/components/ui/skeleton';
import { ServiceFormModal } from './ServiceFormModal';
import { useServicesQuery } from '../hooks/useServicesQuery';
import { useDeleteServiceMutation } from '../hooks/useDeleteServiceMutation';
import { ServiceType } from '@/packages/shared-types';
import { formatCurrency } from '@/packages/web/src/lib/utils';

export function ServicesDataTable() {
  // 1. Hooks de Dados (CQRS - Read & Delete)
  const { data: services = [], isLoading, isError } = useServicesQuery();
  const deleteMutation = useDeleteServiceMutation();

  // 2. Estados Locais
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceType | null>(null);
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<ServiceType | null>(null);

  // 3. Definição das Colunas
  const columns: ColumnDef<ServiceType>[] = [
    {
      accessorKey: 'name', // Simples, mantém-se igual em camel/snake
      header: 'Nome',
      cell: ({ row }) => {
        const service = row.original;
        // REFATORADO: image_url -> imageUrl (camelCase)
        return (
          <div className="flex items-center gap-3">
             {service.imageUrl ? (
                <img 
                  src={service.imageUrl} 
                  alt={service.name} 
                  className="h-10 w-10 rounded-md object-cover bg-muted"
                />
             ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                  <Scissors className="h-5 w-5 text-muted-foreground" />
                </div>
             )}
             <div className="flex flex-col">
                <span className="font-medium text-foreground">{service.name}</span>
                {service.description && (
                  <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                    {service.description}
                  </span>
                )}
             </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'price',
      header: 'Preço',
      cell: ({ row }) => {
        const amount = row.getValue('price') as number;
        return <div className="font-medium text-green-600">{formatCurrency(amount)}</div>;
      },
    },
    {
      accessorKey: 'duration',
      header: 'Duração',
      cell: ({ row }) => {
        const duration = row.getValue('duration') as number;
        return <div className="text-muted-foreground">{duration} min</div>;
      },
    },
    {
      accessorKey: 'color',
      header: 'Cor',
      cell: ({ row }) => {
        const color = row.getValue('color') as string;
        if (!color) return <span className="text-muted-foreground text-xs">-</span>;
        return (
          <div className="flex items-center gap-2">
            <div 
              className="h-4 w-4 rounded-full border border-border shadow-sm" 
              style={{ backgroundColor: color }} 
            />
            <span className="text-xs text-muted-foreground">{color}</span>
          </div>
        );
      },
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => {
        const service = row.original;
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
              <DropdownMenuItem
                onClick={() => {
                  setEditingService(service);
                  setIsFormModalOpen(true);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => {
                  setServiceToDelete(service);
                  setIsDeleteDialogOpen(true);
                }}
              >
                <Trash className="mr-2 h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // 4. Configuração da Tabela
  const table = useReactTable({
    data: services,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnFiltersChange: setColumnFilters,
    state: {
      columnFilters,
    },
  });

  // 5. Handlers
  const handleNewService = () => {
    setEditingService(null);
    setIsFormModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (serviceToDelete?.id) {
      deleteMutation.mutate(serviceToDelete.id);
      setIsDeleteDialogOpen(false);
      setServiceToDelete(null);
    }
  };

  // 6. Renderização Condicional (Loading e Error)
  if (isLoading) {
    return (
      <div className="space-y-4 p-8">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-[250px]" />
          <Skeleton className="h-10 w-[120px]" />
        </div>
        <div className="rounded-md border">
          <div className="p-4">
             <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
             </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-destructive">
        <AlertCircle className="h-10 w-10 mb-2" />
        <p>Erro ao carregar serviços.</p>
        <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
          Tentar Novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 p-4 sm:p-6 lg:p-8">
      {/* Cabeçalho e Filtros */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filtrar por nome..."
              value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
              onChange={(event) =>
                table.getColumn('name')?.setFilterValue(event.target.value)
              }
              className="pl-8"
            />
          </div>
        </div>
        <Button 
          onClick={handleNewService}
          className="w-full sm:w-auto"
        >
          <Plus className="mr-2 h-4 w-4" />
          Novo Serviço
        </Button>
      </div>

      {/* Tabela ou Estado Vazio */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
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
                  className="h-64 text-center"
                >
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Scissors className="h-12 w-12 mb-4 opacity-20" />
                    <p className="text-lg font-medium text-foreground">
                      Nenhum serviço encontrado
                    </p>
                    <p className="text-sm mt-1">
                      Comece adicionando serviços ao seu catálogo ou ajuste os filtros.
                    </p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={handleNewService}
                    >
                      Adicionar Serviço
                    </Button>
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

      {/* Modal de Formulário (Criação/Edição) */}
      <ServiceFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        editingService={editingService}
      />

      {/* Modal de Confirmação de Exclusão */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Serviço</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o serviço "{serviceToDelete?.name}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}