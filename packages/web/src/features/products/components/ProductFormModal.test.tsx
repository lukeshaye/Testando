/**
 * ARQUIVO: /packages/web/src/features/products/components/ProductFormModal.test.tsx
 *
 * Este arquivo implementa a TAREFA 4.10, Seção 3.3 (Testes) do $$PLANO_DE_FEATURE$$.
 * ATUALIZADO: Refatoração para camelCase (Padrão Ouro - Passo 4).
 *
 * PRINCÍPIOS APLICADOS:
 * - PTE (2.15): Teste de Ponta a Ponta atualizado para refletir o novo contrato de dados (camelCase).
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProductFormModal } from './ProductFormModal';
import { ProductType } from '@/packages/shared-types';

// --- Mocks (Plano 3.3 Lógica 1: "Mockar" os hooks de dados) ---

// 1. Mock dos hooks de mutação
vi.mock('../hooks/useAddProductMutation');
vi.mock('../hooks/useUpdateProductMutation');

// --- Importações dinâmicas dos hooks mockados ---
import { useAddProductMutation } from '../hooks/useAddProductMutation';
import { useUpdateProductMutation } from '../hooks/useUpdateProductMutation';

// --- Setup dos Testes ---

const mockAddMutate = vi.fn(() => Promise.resolve());
const mockUpdateMutate = vi.fn(() => Promise.resolve());

// ATUALIZADO: Propriedades renomeadas para camelCase conforme Passo 2 do plano.
const mockEditingProduct: ProductType = {
  id: 1,
  name: 'Shampoo Antigo',
  price: 1500, // R$ 15,00
  quantity: 10,
  description: 'Descrição antiga',
  imageUrl: 'http://imagem.antiga/img.png', // camelCase (era image_url)
  userId: 'user-123', // camelCase (era user_id)
};

// Props padrão para o modal
const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  editingProduct: null,
};

describe('ProductFormModal (Feature Test)', () => {
  beforeEach(() => {
    // Limpa mocks antes de cada teste
    vi.resetAllMocks();

    // Configuração padrão dos mocks (Happy Path)
    vi.mocked(useAddProductMutation).mockReturnValue({
      mutateAsync: mockAddMutate,
      isPending: false,
    } as any);

    vi.mocked(useUpdateProductMutation).mockReturnValue({
      mutateAsync: mockUpdateMutate,
      isPending: false,
    } as any);
  });

  // Teste de Renderização (Modo "Novo")
  it('should render in "new" mode correctly', () => {
    render(<ProductFormModal {...defaultProps} />);

    expect(screen.getByText('Novo Produto')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Ex: Shampoo Hidratante'),
    ).toHaveValue('');
    expect(screen.getByPlaceholderText('45.50')).toHaveValue(null);
  });

  // Teste de Submissão (Modo "Novo")
  it('should call useAddProductMutation on submit in "new" mode', async () => {
    render(<ProductFormModal {...defaultProps} />);

    // Simula preenchimento válido
    fireEvent.change(screen.getByLabelText(/Nome/i), {
      target: { value: 'Novo Shampoo' },
    });
    fireEvent.change(screen.getByLabelText(/Preço/i), {
      target: { value: '50.50' },
    });
    fireEvent.change(screen.getByLabelText(/Quantidade/i), {
      target: { value: '100' },
    });

    // Clica em Salvar
    fireEvent.click(screen.getByRole('button', { name: /Salvar/i }));

    // Espera a mutação ser chamada
    await waitFor(() => {
      // Verifica se a mutação de ADIÇÃO foi chamada
      expect(mockAddMutate).toHaveBeenCalledTimes(1);
      
      // ATUALIZADO: Expectativa agora aguarda camelCase no payload
      expect(mockAddMutate).toHaveBeenCalledWith({
        name: 'Novo Shampoo',
        price: 5050, // 50.50 * 100
        quantity: 100,
        description: null,
        imageUrl: null, // camelCase
      });

      // Verifica se a mutação de UPDATE não foi chamada
      expect(mockUpdateMutate).not.toHaveBeenCalled();
      // Verifica se o modal fechou
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });
  });

  // Teste de Renderização (Modo "Editar")
  it('should render in "edit" mode and populate fields (useEffect)', async () => {
    render(
      <ProductFormModal {...defaultProps} editingProduct={mockEditingProduct} />,
    );

    expect(screen.getByText('Editar Produto')).toBeInTheDocument();

    // Espera o useEffect popular os campos
    expect(
      await screen.findByDisplayValue('Shampoo Antigo'),
    ).toBeInTheDocument();
    expect(
      await screen.findByDisplayValue('Descrição antiga'),
    ).toBeInTheDocument();
    expect(await screen.findByDisplayValue('15.00')).toBeInTheDocument(); 
    expect(await screen.findByDisplayValue('10')).toBeInTheDocument();
    expect(
      await screen.findByDisplayValue('http://imagem.antiga/img.png'),
    ).toBeInTheDocument();
  });

  // Teste de Submissão (Modo "Editar")
  it('should call useUpdateProductMutation on submit in "edit" mode', async () => {
    render(
      <ProductFormModal {...defaultProps} editingProduct={mockEditingProduct} />,
    );

    // Espera o formulário popular
    await screen.findByDisplayValue('Shampoo Antigo');

    // Modifica um campo
    fireEvent.change(screen.getByLabelText(/Nome/i), {
      target: { value: 'Shampoo Atualizado' },
    });

    // Clica em Salvar
    fireEvent.click(screen.getByRole('button', { name: /Salvar/i }));

    // Espera a mutação ser chamada
    await waitFor(() => {
      // Verifica se a mutação de ATUALIZAÇÃO foi chamada
      expect(mockUpdateMutate).toHaveBeenCalledTimes(1);
      
      // ATUALIZADO: Expectativa agora aguarda camelCase no payload
      expect(mockUpdateMutate).toHaveBeenCalledWith({
        id: 1, 
        name: 'Shampoo Atualizado', 
        price: 1500, 
        quantity: 10,
        description: 'Descrição antiga',
        imageUrl: 'http://imagem.antiga/img.png', // camelCase
      });

      // Verifica se a mutação de ADIÇÃO não foi chamada
      expect(mockAddMutate).not.toHaveBeenCalled();
      // Verifica se o modal fechou
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });
  });

  // Teste de Validação (Zod)
  it('should show validation errors and not submit if required fields are empty', async () => {
    render(<ProductFormModal {...defaultProps} />);

    // Tenta submeter com o formulário vazio
    fireEvent.click(screen.getByRole('button', { name: /Salvar/i }));

    // Espera as mensagens de erro do Zod aparecerem
    expect(
      await screen.findByText(/Nome é obrigatório/i),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/O preço deve ser positivo/i),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/A quantidade deve ser positiva/i),
    ).toBeInTheDocument();

    // Verifica se nenhuma mutação foi chamada
    expect(mockAddMutate).not.toHaveBeenCalled();
    expect(mockUpdateMutate).not.toHaveBeenCalled();
    // Verifica se o modal NÃO fechou
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  // Teste de Estado de Loading
  it('should show loading state (isPending) and disable buttons', () => {
    // Configura o mock para estar "Pending"
    vi.mocked(useAddProductMutation).mockReturnValue({
      mutateAsync: mockAddMutate,
      isPending: true,
    } as any);

    render(<ProductFormModal {...defaultProps} />);

    const saveButton = screen.getByRole('button', { name: /Salvando.../i });
    const cancelButton = screen.getByRole('button', { name: /Cancelar/i });

    expect(saveButton).toBeInTheDocument();
    expect(saveButton.querySelector('svg.animate-spin')).toBeInTheDocument();

    expect(saveButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });
});