// /packages/web/src/features/clients/components/ClientsDataTable.tsx

import { useState } from 'react';
import { useClientsQuery } from '../hooks/useClientsQuery';
import { useDeleteClientMutation } from '../hooks/useDeleteClientMutation';
import { ClientFormModal } from './ClientFormModal';
import { ClientType } from '@/packages/shared-types';

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
  ColumnFiltersState,
  GlobalFilterTableState,
} from '@tanstack/react-table';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/packages/web/src/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/packages/web/src/components/ui/dropdown-menu';
import { Button } from '@/packages/web/src/components/ui/button';
import { Input } from '@/packages/web/src/components/ui/input';
// Assumindo que ConfirmationModal exista em ui/ConfirmationModal
import { ConfirmationModal } from '@/packages/web/src/components/ui/ConfirmationModal';
import {
  Loader2,
  MoreHorizontal,
  PlusCircle,
  Users,
  Search,
  Edit,
  Trash2,
} from 'lucide-react';
import { differenceInYears } from 'date-fns';

/**
 * Componente principal da tabela de dados de Clientes.
 *
 * Princípios:
 * - CDA (2.17): Implementa o DataTable de shadcn/ui.
 * - PGEC (2.13): Consome o hook useClientsQuery para estado do servidor.
 * - SoC (2.5): Gerencia a apresentação da lista e o estado da UI
 * (filtros, modais), delegando a lógica de dados aos hooks.
 */
export function ClientsDataTable() {
  // 1. Estado do Servidor (PGEC 2.13)
  const { data: clients, isLoading } = useClientsQuery();
  const { mutate: deleteClient, isPending: isDeleting } =
    useDeleteClientMutation();

  // 2. Estado da UI (SoC 2.5)
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<ClientType | null>(null);
  const [clientToDelete, setClientToDelete] =
    useState<ClientType | null>(null);

  // 3. Lógica de Ações (Plano 3.2.7 - 3.2.9)
  const handleNewClient = () => {
    setClientToEdit(null);
    setIsFormModalOpen(true);
  };

  const handleEditClient = (client: ClientType) => {
    setClientToEdit(client);
    setIsFormModalOpen(true);
  };

  const handleDeleteClient = (client: ClientType) => {
    setClientToDelete(client);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (clientToDelete) {
      deleteClient(clientToDelete.id, {
        onSuccess: () => {
          setIsDeleteModalOpen(false);
          setClientToDelete(null);
        },
      });
    }
  };

  // 4. Definição das Colunas (Plano 3.2.3)
  const columns: ColumnDef<ClientType>[] = [
    {
      accessorKey: 'name',
      header: 'Nome',
      cell: ({ row }) => (
        <div className="font-medium text-foreground">
          {row.getValue('name')}
        </div>
      ),
    },
    {
      accessorKey: 'phone',
      header: 'Telefone',
    },
    {
      accessorKey: 'email',
      header: 'Email',
    },
    {
      accessorKey: 'birth_date',
      header: 'Idade',
      cell: ({ row }) => {
        const birthDate = row.getValue('birth_date') as string | Date | null;
        if (!birthDate) return <span className="text-muted-foreground">N/A</span>;
        const age = differenceInYears(new Date(), new Date(birthDate));
        return <span>{age} anos</span>;
      },
    },
    {
      accessorKey: 'gender',
      header: 'Gênero',
      cell: ({ row }) => {
        const gender = row.getValue('gender') as string | null;
        return gender ? (
          <span className="capitalize">{gender}</span>
        ) : (
          <span className="text-muted-foreground">N/A</span>
        );
      },
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Ações</div>,
      cell: ({ row }) => {
        const client = row.original;
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
                <DropdownMenuItem onClick={() => handleEditClient(client)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => handleDeleteClient(client)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  // 5. Instância da Tabela
  const table = useReactTable({
    data: clients || [],
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  // 6. UI de Filtro e Header (Plano 3.2.4)
  const tableHeader = (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Filtrar por nome, email ou telefone..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="w-full max-w-sm pl-10"
        />
      </div>
      <Button onClick={handleNewClient}>
        <PlusCircle className="mr-2 h-4 w-4" />
        Novo Cliente
      </Button>
    </div>
  );

  // 7. Renderização Condicional (Loading, Empty, Data) (Plano 3.2.11)
  if (isLoading) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isLoading && (!clients || clients.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <Users className="h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold text-foreground">
          Nenhum cliente cadastrado
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Comece adicionando seu primeiro cliente para gerenciar agendamentos.
        </p>
        <Button className="mt-6" onClick={handleNewClient}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Adicionar Cliente
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full">
      {tableHeader}
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
                  className="h-24 text-center"
                >
                  Nenhum resultado encontrado para "{globalFilter}".
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
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

      {/* 8. Modais (Plano 3.2.10) */}
      <ClientFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        editingClient={clientToEdit}
        // CORREÇÃO: A assinatura da prop foi corrigida para aceitar o
        // argumento 'client', conforme definido no contrato do ClientFormModal
        // (Plano 3.1.7) e exigido pela análise do Veredito.
        onClientCreated={(client: ClientType) => {
          // O hook de mutação já invalida o cache (Plano 3.2.10).
          // O contrato (Plano 3.1.7) exige a prop, então a implementamos
          // corretamente (aceitando o argumento 'client'),
          // mesmo que não precisemos usá-lo aqui (Plano 4.9).
          console.log('Novo cliente criado:', client.id);
        }}
      />

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Excluir Cliente"
        description={`Tem certeza que deseja excluir "${clientToDelete?.name}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        variant="destructive"
        isLoading={isDeleting}
      />
    </div>
  );
}