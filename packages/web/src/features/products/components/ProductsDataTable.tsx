/**
 * ARQUIVO: /packages/web/src/features/products/components/ProductsDataTable.tsx
 *
 * Este componente implementa a TAREFA 4.10, Seção 3.2.2 do $$PLANO_DE_FEATURE$$.
 *
 * CORREÇÃO (Baseada na Rejeição):
 * Esta versão corrige a violação da Seção 3.2.2, Lógica 2.
 * 1. REMOVIDO: O estado `columnFilters` e a lógica `onColumnFiltersChange` que não estavam no plano.
 * 2. ADICIONADO: O estado `const [searchTerm, setSearchTerm] = useState('');`, conforme explicitamente exigido pelo plano (PGEC Nível 1).
 * 3. ATUALIZADO: A `useReactTable` agora usa `globalFilter: searchTerm` e `onGlobalFilterChange: setSearchTerm`.
 * 4. ATUALIZADO: O `Input` do header agora está corretamente vinculado ao estado `searchTerm`.
 *
 * PRINCÍPIOS APLICADOS:
 * - SoC (2.5): Componente focado em orquestração e UI.
 * - PGEC (2.13): Usa Nível 1 (useState para `searchTerm` e modais) e Nível 3 (useQuery).
 * - CDA (2.17): Uso mandatório de shadcn/ui (DataTable, DropdownMenu, Button, Input).
 */

import { useState } from 'react'; // <--- CORREÇÃO: Importa useState
import {
  ColumnDef,
  SortingState,
  // REMOVIDO: ColumnFiltersState (Não estava no plano)
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel, // Necessário para globalFilter
  useReactTable,
} from '@tanstack/react-table';
import { MoreHorizontal, Plus } from 'lucide-react';

// --- Componentes Shadcn/ui (CDA 2.17) ---
import { Button } from '@/packages/web/src/components/ui/button';
import { Input } from '@/packages/web/src/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/packages/web/src/components/ui/dropdown-menu';
import { DataTable } from '@/packages/web/src/components/ui/data-table';

// --- Componentes da Feature e Globais ---
import { ProductFormModal } from './ProductFormModal';
import { ConfirmationModal } from '@/packages/web/src/components/ConfirmationModal';
import { LoadingSpinner } from '@/packages/web/src/components/LoadingSpinner'; // Assumindo caminho

// --- Hooks de Dados (PGEC 2.13 / CQRS 2.12) ---
import { useProductsQuery } from '../hooks/useProductsQuery';
import { useDeleteProductMutation } from '../hooks/useDeleteProductMutation';

// --- Tipos Compartilhados (DSpP 2.16) ---
import { ProductType } from '@/packages/shared-types';

// --- Utilitários ---
import { formatCurrency } from '@/packages/web/src/lib/utils';

export function ProductsDataTable() {
  // --- Estado Nível 1 (Local State - PGEC 2.13, Plano 3.2.2 Lógica 2) ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductType | null>(null);
  const [productToDelete, setProductToDelete] = useState<ProductType | null>(null);
  // --- CORREÇÃO: Adiciona o estado searchTerm exigido pelo plano ---
  const [searchTerm, setSearchTerm] = useState('');

  // --- Estado da Tabela (Local) ---
  const [sorting, setSorting] = useState<SortingState>([]);
  // REMOVIDO: columnFilters (Não estava no plano)

  // --- Hooks de Dados (Nível 3 - Server State, Plano 3.2.2 Lógica 3) ---
  const { data: products, isLoading, isError } = useProductsQuery();
  const { mutate: deleteProduct, isPending: isDeleting } =
    useDeleteProductMutation();

  // --- Handlers de UI ---
  const handleOpenNewModal = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product: ProductType) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleOpenDeleteConfirm = (product: ProductType) => {
    setProductToDelete(product);
    setIsDeleteConfirmOpen(true);
  };

  // (Plano 3.2.2 Lógica 6)
  const handleConfirmDelete = () => {
    if (productToDelete) {
      deleteProduct(productToDelete.id!, {
        onSuccess: () => {
          setIsDeleteConfirmOpen(false);
          setProductToDelete(null);
        },
      });
    }
  };

  // --- Definição de Colunas (Plano 3.2.2 Lógica 5) ---
  const columns: ColumnDef<ProductType>[] = [
    {
      accessorKey: 'name',
      header: 'Nome',
      cell: ({ row }) => (
        <div className="font-medium">{row.original.name}</div>
      ),
    },
    {
      accessorKey: 'price',
      header: 'Preço',
      cell: ({ row }) => formatCurrency(row.original.price),
    },
    {
      accessorKey: 'quantity',
      header: 'Quantidade',
      cell: ({ row }) => {
        const quantity = row.original.quantity ?? 0;
        const isLowStock = quantity <= 5; // Lógica legada mantida
        return (
          <span
            className={
              isLowStock
                ? 'text-destructive font-bold'
                : 'text-muted-foreground'
            }
          >
            {quantity} {isLowStock && '(Baixo!)'}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: 'Ações',
      cell: ({ row }) => {
        const product = row.original;
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
              <DropdownMenuItem onClick={() => handleOpenEditModal(product)}>
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleOpenDeleteConfirm(product)}
                className="text-destructive"
              >
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // --- Instância da Tabela ---
  const table = useReactTable({
    data: products || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(), // Necessário para filtro
    // --- CORREÇÃO: Implementa globalFilter com o estado searchTerm ---
    onGlobalFilterChange: setSearchTerm,
    state: {
      sorting,
      globalFilter: searchTerm, // Vincula o estado local ao filtro da tabela
    },
  });

  // --- Renderização de Loading/Erro ---
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-md border border-destructive/50 bg-destructive/10 p-6 text-center text-destructive">
        <h3 className="text-lg font-semibold">Erro ao Carregar Produtos</h3>
        <p className="text-sm">
          Não foi possível buscar os dados. Tente novamente.
        </p>
      </div>
    );
  }

  // --- Renderização Principal ---
  return (
    <div className="w-full space-y-4">
      {/* Header (Plano 3.2.2 Lógica 4) */}
      <div className="flex items-center justify-between">
        {/* --- CORREÇÃO: Input vinculado ao estado `searchTerm` --- */}
        <Input
          placeholder="Filtrar produtos..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="max-w-sm"
        />
        <Button onClick={handleOpenNewModal}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Produto
        </Button>
      </div>

      {/* Tabela (Plano 3.2.2 Lógica 5) */}
      <div className="rounded-md border bg-card">
        <DataTable table={table} columns={columns} />
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

      {/* Modais (Plano 3.2.2 Lógica 7) */}
      <ProductFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingProduct={editingProduct}
      />

      <ConfirmationModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Confirmar Exclusão"
        message={`Tem certeza que deseja excluir o produto "${productToDelete?.name}"? Esta ação não pode ser desfeita.`}
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}