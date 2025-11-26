/**
 * ARQUIVO: /packages/web/src/features/products/components/ProductsDataTable.test.tsx
 *
 * Este arquivo implementa a TAREFA 4.10, Seção 3.3 (Testes) do $$PLANO_DE_FEATURE$$.
 *
 * PRINCÍPIOS APLICADOS:
 * - PTE (2.15): Teste de Ponta a Ponta (isolado). A lógica da UI é testada
 * "mockando" os hooks de dados (DIP 2.9), permitindo testar a
 * renderização, filtros e orquestração de modais de forma independente.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProductsDataTable } from './ProductsDataTable';
import { ProductType } from '@/packages/shared-types';

// --- Mocks (Plano 3.3 Lógica 1: "Mockar" os hooks de dados) ---

// 1. Mock dos hooks de dados
vi.mock('../hooks/useProductsQuery');
vi.mock('../hooks/useDeleteProductMutation');

// 2. Mock dos componentes (Modais e Loading)
vi.mock('./ProductFormModal', () => ({
  ProductFormModal: vi.fn(({ isOpen }) =>
    isOpen ? <div data-testid="product-form-modal-mock" /> : null,
  ),
}));

vi.mock('@/packages/web/src/components/ConfirmationModal', () => ({
  ConfirmationModal: vi.fn(
    ({ isOpen, onConfirm, title, message, isLoading }) =>
      isOpen ? (
        <div data-testid="confirmation-modal-mock">
          <h3>{title}</h3>
          <p>{message}</p>
          <button onClick={onConfirm} disabled={isLoading}>
            Confirmar Exclusão
          </button>
        </div>
      ) : null,
  ),
}));

vi.mock('@/packages/web/src/components/LoadingSpinner', () => ({
  LoadingSpinner: vi.fn(() => <div data-testid="loading-spinner-mock" />),
}));

// 3. Mock de utilitários (para consistência)
vi.mock('@/packages/web/src/lib/utils', () => ({
  formatCurrency: (value: number) => `R$${(value / 100).toFixed(2)}`,
}));

// --- Importações dinâmicas dos hooks mockados ---
import { useProductsQuery } from '../hooks/useProductsQuery';
import { useDeleteProductMutation } from '../hooks/useDeleteProductMutation';
import { ProductFormModal } from './ProductFormModal';
import { ConfirmationModal } from '@/packages/web/src/components/ConfirmationModal';

// --- Setup dos Testes ---

const mockProducts: ProductType[] = [
  {
    id: 1,
    name: 'Shampoo Hidratante',
    price: 5000,
    quantity: 10,
    description: '',
    image_url: '',
    user_id: '1',
  },
  {
    id: 2,
    name: 'Condicionador Reparador',
    price: 5500,
    quantity: 3, // Estoque baixo
    description: '',
    image_url: '',
    user_id: '1',
  },
];

// Mock da função mutate (Plano 3.3)
const mockDeleteMutate = vi.fn((_productId: number, options: any) => {
  options.onSuccess();
});

describe('ProductsDataTable (Feature Test)', () => {
  beforeEach(() => {
    // Limpa todos os mocks antes de cada teste
    vi.resetAllMocks();

    // Configuração padrão (Happy Path)
    vi.mocked(useProductsQuery).mockReturnValue({
      data: mockProducts,
      isLoading: false,
      isError: false,
    } as any);

    vi.mocked(useDeleteProductMutation).mockReturnValue({
      mutate: mockDeleteMutate,
      isPending: false,
    } as any);
  });

  // Teste de Loading (Plano 3.3 Lógica 2)
  it('should render loading spinner when isLoading is true', () => {
    vi.mocked(useProductsQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as any);

    render(<ProductsDataTable />);
    expect(screen.getByTestId('loading-spinner-mock')).toBeInTheDocument();
  });

  // Teste de Erro (Plano 3.3 Lógica 2)
  it('should render error message when isError is true', () => {
    vi.mocked(useProductsQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as any);

    render(<ProductsDataTable />);
    expect(
      screen.getByText('Erro ao Carregar Produtos'),
    ).toBeInTheDocument();
  });

  // Teste de Renderização de Dados (Plano 3.3 Lógica 2)
  it('should render the table with products when data is available', () => {
    render(<ProductsDataTable />);

    // Verifica se os nomes dos produtos estão na tela
    expect(screen.getByText('Shampoo Hidratante')).toBeInTheDocument();
    expect(screen.getByText('Condicionador Reparador')).toBeInTheDocument();

    // Verifica se os preços formatados estão na tela
    expect(screen.getByText('R$50.00')).toBeInTheDocument();
    expect(screen.getByText('R$55.00')).toBeInTheDocument();

    // Verifica a lógica de estoque baixo (Plano 3.2.2 Lógica 5)
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('3 (Baixo!)')).toBeInTheDocument();
  });

  // Teste de Filtro (Plano 3.3 Lógica 2)
  it('should filter the table based on the search term (globalFilter)', async () => {
    render(<ProductsDataTable />);

    const filterInput = screen.getByPlaceholderText('Filtrar produtos...');
    expect(filterInput).toBeInTheDocument();

    // Estado inicial (ambos visíveis)
    expect(screen.getByText('Shampoo Hidratante')).toBeInTheDocument();
    expect(screen.getByText('Condicionador Reparador')).toBeInTheDocument();

    // Digita no filtro
    await fireEvent.change(filterInput, {
      target: { value: 'Shampoo' },
    });

    // Estado filtrado (apenas Shampoo visível)
    expect(screen.getByText('Shampoo Hidratante')).toBeInTheDocument();
    expect(
      screen.queryByText('Condicionador Reparador'),
    ).not.toBeInTheDocument();
  });

  // Teste de Abertura do Modal "Novo" (Plano 3.3 Lógica 2)
  it('should open the ProductFormModal in "new" mode when "Novo Produto" is clicked', async () => {
    render(<ProductsDataTable />);

    expect(screen.queryByTestId('product-form-modal-mock')).not.toBeInTheDocument();

    const newButton = screen.getByRole('button', { name: /Novo Produto/i });
    await fireEvent.click(newButton);

    // Verifica se o modal foi aberto
    expect(screen.getByTestId('product-form-modal-mock')).toBeInTheDocument();

    // Verifica se o modal foi chamado com as props corretas (modo "new")
    expect(vi.mocked(ProductFormModal)).toHaveBeenCalledWith(
      expect.objectContaining({
        isOpen: true,
        editingProduct: null,
      }),
      expect.anything(),
    );
  });

  // Teste de Abertura do Modal "Editar" (Plano 3.3 Lógica 2)
  it('should open the ProductFormModal in "edit" mode when "Editar" is clicked', async () => {
    render(<ProductsDataTable />);

    // Encontra todos os botões de menu (um por linha)
    const actionButtons = screen.getAllByRole('button', { name: /Abrir menu/i });
    await fireEvent.click(actionButtons[0]); // Clica no menu do primeiro produto (Shampoo)

    // Clica em "Editar"
    const editButton = await screen.findByText('Editar');
    await fireEvent.click(editButton);

    // Verifica se o modal foi aberto
    expect(screen.getByTestId('product-form-modal-mock')).toBeInTheDocument();

    // Verifica se o modal foi chamado com as props corretas (modo "edit")
    expect(vi.mocked(ProductFormModal)).toHaveBeenCalledWith(
      expect.objectContaining({
        isOpen: true,
        editingProduct: mockProducts[0], // Deve passar o "Shampoo"
      }),
      expect.anything(),
    );
  });

  // Teste de Abertura e Confirmação de Exclusão (Plano 3.3 Lógica 2)
  it('should open ConfirmationModal when "Excluir" is clicked and call mutation on confirm', async () => {
    render(<ProductsDataTable />);

    // 1. Encontra e clica no menu do segundo produto (Condicionador)
    const actionButtons = screen.getAllByRole('button', { name: /Abrir menu/i });
    await fireEvent.click(actionButtons[1]);

    // 2. Clica em "Excluir"
    const deleteButton = await screen.findByText('Excluir');
    await fireEvent.click(deleteButton);

    // 3. Verifica se o modal de confirmação abriu
    expect(
      screen.getByTestId('confirmation-modal-mock'),
    ).toBeInTheDocument();

    // 4. Verifica se o modal contém o nome do produto correto
    expect(
      screen.getByText(
        /Tem certeza que deseja excluir o produto "Condicionador Reparador"\?/i,
      ),
    ).toBeInTheDocument();

    // 5. Simula a confirmação (clicando no botão do mock)
    const confirmDeleteButton = screen.getByRole('button', {
      name: /Confirmar Exclusão/i,
    });
    await fireEvent.click(confirmDeleteButton);

    // 6. Verifica se a mutação de exclusão foi chamada com o ID correto (Plano 3.2.2 Lógica 6)
    expect(mockDeleteMutate).toHaveBeenCalledTimes(1);
    expect(mockDeleteMutate).toHaveBeenCalledWith(
      mockProducts[1].id, // ID do Condicionador (2)
      expect.objectContaining({
        onSuccess: expect.any(Function),
      }),
    );

    // 7. Verifica se o modal de confirmação fechou (assumindo que o onSuccess o fecha)
    // No nosso caso, o onSuccess é chamado, o estado muda e o componente é re-renderizado
    // O mock do ConfirmationModal é chamado com isOpen: false
    await waitFor(() => {
      expect(
        vi.mocked(ConfirmationModal).mock.lastCall?.[0].isOpen,
      ).toBe(false);
    });
  });
});