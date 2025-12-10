/**
 * ARQUIVO: /packages/web/src/features/products/components/ProductsDataTable.tsx
 *
 * Tabela de gerenciamento de produtos.
 * Implementa a camada de UI seguindo o "Padrão Ouro" (camelCase) e os 17 Princípios.
 */

import { useState } from 'react';
import {
  ColumnDef,
  SortingState,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { MoreHorizontal, Plus } from 'lucide-react';

// --- Componentes Shadcn/ui (Princípio 2.17 - CDA) ---
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

// --- Componentes da Feature e Globais (Princípio 2.11 - Feature-Based) ---
import { ProductFormModal } from './ProductFormModal';
import { ConfirmationModal } from '@/packages/web/src/components/ConfirmationModal';
import { LoadingSpinner } from '@/packages/web/src/components/LoadingSpinner';

// --- Hooks de Dados (Princípio 2.12 - CQRS / 2.9 - DIP) ---
import { useProductsQuery } from '../hooks/useProductsQuery';
import { useDeleteProductMutation } from '../hooks/useDeleteProductMutation';

// --- Tipos Compartilhados (Princípio 2.2 - DRY / Contrato do Passo 2) ---
import { ProductType } from '@/packages/shared-types';

// --- Utilitários ---
import { formatCurrency } from '@/packages/web/src/lib/utils';

export function ProductsDataTable() {
  // --- Estado Nível 1: Local State (Princípio 2.13 - PGEC) ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductType | null>(null);
  const [productToDelete, setProductToDelete] = useState<ProductType | null>(null);
  const [searchTerm, setSearchTerm] = useState(''); // Estado para filtro global

  // --- Estado da Tabela ---
  const [sorting, setSorting] = useState<SortingState>([]);

  // --- Estado Nível 3: Server State (Princípio 2.13 - PGEC) ---
  const { data: products, isLoading, isError } = useProductsQuery();
  const { mutate: deleteProduct, isPending: isDeleting } = useDeleteProductMutation();

  // --- Handlers de UI (Princípio 2.5 - SoC) ---
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

  const handleConfirmDelete = () => {
    if (productToDelete && productToDelete.id) {
      deleteProduct(productToDelete.id, { // Uso estrito de camelCase 'id'
        onSuccess: () => {
          setIsDeleteConfirmOpen(false);
          setProductToDelete(null);
        },
      });
    }
  };

  // --- Definição de Colunas (Passo 4: CamelCase Strict) ---
  const columns: ColumnDef<ProductType>[] = [
    {
      accessorKey: 'name', // Mapeia para 'name' (camelCase) do ProductType
      header: 'Nome',
      cell: ({ row }) => (
        <div className="font-medium">{row.original.name}</div>
      ),
    },
    {
      accessorKey: 'price', // Mapeia para 'price' (camelCase)
      header: 'Preço',
      cell: ({ row }) => formatCurrency(row.original.price),
    },
    {
      accessorKey: 'quantity', // Mapeia para 'quantity' (camelCase)
      header: 'Quantidade',
      cell: ({ row }) => {
        const quantity = row.original.quantity ?? 0;
        const isLowStock = quantity <= 5;
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
    getFilteredRowModel: getFilteredRowModel(),
    onGlobalFilterChange: setSearchTerm,
    state: {
      sorting,
      globalFilter: searchTerm,
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

  // --- Renderização Principal (Princípio 2.17 - CDA) ---
  return (
    <div className="w-full space-y-4">
      {/* Header com Filtro Global */}
      <div className="flex items-center justify-between">
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

      {/* Tabela de Dados */}
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

      {/* Modais de Ação */}
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