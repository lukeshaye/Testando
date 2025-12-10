import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { FinancialFormModal } from './FinancialFormModal';
import { useAddFinancialEntryMutation } from '../hooks/useAddFinancialEntryMutation';
import { useUpdateFinancialEntryMutation } from '../hooks/useUpdateFinancialEntryMutation';
import type { FinancialEntry } from '@/packages/shared-types';

// Mocks dos Hooks de Mutação
vi.mock('../hooks/useAddFinancialEntryMutation');
vi.mock('../hooks/useUpdateFinancialEntryMutation');

// Mock do ResizeObserver (necessário para alguns componentes do Radix/Shadcn)
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock do window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe('FinancialFormModal', () => {
  const mockOnOpenChange = vi.fn();
  const mockAddMutateAsync = vi.fn();
  const mockUpdateMutateAsync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useAddFinancialEntryMutation as any).mockReturnValue({
      mutateAsync: mockAddMutateAsync,
      isPending: false,
    });

    (useUpdateFinancialEntryMutation as any).mockReturnValue({
      mutateAsync: mockUpdateMutateAsync,
      isPending: false,
    });
  });

  // ATUALIZAÇÃO: Objeto mockado agora segue o padrão camelCase (Passo 2 e 4 do Padrão Ouro)
  const mockEntry: FinancialEntry = {
    id: 1,
    userId: 1, // snake_case -> camelCase
    description: 'Venda de Software',
    amount: 15050, // R$ 150,50
    type: 'receita',
    entryType: 'pontual', // snake_case -> camelCase
    entryDate: '2023-10-15T00:00:00.000Z', // snake_case -> camelCase (Data ISO)
    category: 'Vendas',
    createdAt: '2023-10-01', // snake_case -> camelCase
    updatedAt: '2023-10-01'  // snake_case -> camelCase
  };

  it('deve renderizar o título correto para "Novo Lançamento"', () => {
    render(
      <FinancialFormModal 
        open={true} 
        onOpenChange={mockOnOpenChange} 
        editingEntry={null} 
      />
    );

    expect(screen.getByText('Novo Lançamento')).toBeInTheDocument();
    expect(screen.getByText('Criar Lançamento')).toBeInTheDocument();
  });

  it('deve renderizar o título correto e preencher dados para "Editar Lançamento"', async () => {
    render(
      <FinancialFormModal 
        open={true} 
        onOpenChange={mockOnOpenChange} 
        editingEntry={mockEntry} 
      />
    );

    expect(screen.getByText('Editar Lançamento')).toBeInTheDocument();
    
    // Verifica preenchimento dos campos
    expect(screen.getByDisplayValue('Venda de Software')).toBeInTheDocument();
    // Verifica conversão de centavos para reais (15050 -> 150.5)
    expect(screen.getByDisplayValue('150.5')).toBeInTheDocument(); 
  });

  it('deve validar campos obrigatórios ao tentar submeter vazio', async () => {
    const user = userEvent.setup();
    render(
      <FinancialFormModal 
        open={true} 
        onOpenChange={mockOnOpenChange} 
        editingEntry={null} 
      />
    );

    // Tenta submeter sem preencher nada
    const submitBtn = screen.getByText('Criar Lançamento');
    await user.click(submitBtn);

    // Espera pelas mensagens de erro do Zod
    await waitFor(() => {
       expect(mockAddMutateAsync).not.toHaveBeenCalled();
    });
  });

  it('deve chamar a mutação de criação com os dados corretos (e conversão de valor)', async () => {
    const user = userEvent.setup();
    render(
      <FinancialFormModal 
        open={true} 
        onOpenChange={mockOnOpenChange} 
        editingEntry={null} 
      />
    );

    // Preencher Descrição
    const descInput = screen.getByLabelText('Descrição');
    await user.type(descInput, 'Nova Despesa Teste');

    // Preencher Valor (Input numérico)
    const amountInput = screen.getByLabelText('Valor (R$)');
    await user.clear(amountInput);
    await user.type(amountInput, '100.50');

    // Selecionar Tipo (Dropdown do Radix UI)
    const typeTrigger = screen.getByRole('combobox', { name: /tipo/i });
    await user.click(typeTrigger);
    
    const despesaOption = await screen.findByRole('option', { name: 'Despesa' });
    await user.click(despesaOption);

    // Submeter
    const submitBtn = screen.getByText('Criar Lançamento');
    await user.click(submitBtn);

    await waitFor(() => {
      // ATUALIZAÇÃO: Garante que o payload esperado esteja consistente
      expect(mockAddMutateAsync).toHaveBeenCalledWith(expect.objectContaining({
        description: 'Nova Despesa Teste',
        amount: 10050, // 100.50 * 100
        type: 'despesa',
      }));
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('deve chamar a mutação de edição com ID e dados corretos', async () => {
    const user = userEvent.setup();
    render(
      <FinancialFormModal 
        open={true} 
        onOpenChange={mockOnOpenChange} 
        editingEntry={mockEntry} 
      />
    );

    // Alterar descrição
    const descInput = screen.getByLabelText('Descrição');
    await user.clear(descInput);
    await user.type(descInput, 'Venda Editada');

    // Submeter
    const submitBtn = screen.getByText('Salvar Alterações');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockUpdateMutateAsync).toHaveBeenCalledWith({
        id: mockEntry.id,
        // ATUALIZAÇÃO: O objeto enviado deve respeitar o camelCase do Schema Zod atualizado
        data: expect.objectContaining({
          description: 'Venda Editada',
          amount: 15050, // Valor original mantido
          type: 'receita',
        }),
      });
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('deve fechar o modal ao clicar em Cancelar', async () => {
    const user = userEvent.setup();
    render(
      <FinancialFormModal 
        open={true} 
        onOpenChange={mockOnOpenChange} 
        editingEntry={null} 
      />
    );

    const cancelBtn = screen.getByText('Cancelar');
    await user.click(cancelBtn);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });
});