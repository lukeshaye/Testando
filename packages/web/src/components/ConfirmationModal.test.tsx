import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmationModal } from './ConfirmationModal';
import '@testing-library/jest-dom';

// Mock da função 'cn' para garantir que as classes são aplicadas corretamente, se usadas no modal/botão
jest.mock('../../lib/utils', () => ({
  cn: jest.fn((...classes) => classes.filter(Boolean).join(' ')),
}));

describe('ConfirmationModal Component (CDA Compliance)', () => {
  const mockTitle = 'Confirm Deletion';
  const mockMessage = 'Are you sure you want to delete this item? This action cannot be undone.';
  const mockOnConfirm = jest.fn();
  const mockOnCancel = jest.fn();

  const defaultProps = {
    isOpen: true,
    title: mockTitle,
    message: mockMessage,
    onConfirm: mockOnConfirm,
    onCancel: mockOnCancel,
    // Assumimos que o componente aceita uma prop para o texto do botão de confirmação,
    // ou que ele usa "Confirm" por padrão.
    confirmText: 'Delete Permanently', 
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the modal content and call handlers correctly', () => {
    render(<ConfirmationModal {...defaultProps} />);

    // Conteúdo e botões
    expect(screen.getByRole('heading', { name: mockTitle })).toBeInTheDocument();
    expect(screen.getByText(mockMessage)).toBeInTheDocument();
    const confirmButton = screen.getByRole('button', { name: defaultProps.confirmText });
    const cancelButton = screen.getByRole('button', { name: /Cancel/i });

    // Ações
    fireEvent.click(confirmButton);
    expect(mockOnConfirm).toHaveBeenCalledTimes(1);

    fireEvent.click(cancelButton);
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  // TAREFA DE CORREÇÃO: Validar as classes semânticas (CDA - 2.17)
  it('should apply destructive semantic colors to the confirm button', () => {
    render(<ConfirmationModal {...defaultProps} />);
    const confirmButton = screen.getByRole('button', { name: defaultProps.confirmText });

    // Validação de classes semânticas. O botão de confirmação de ação destrutiva
    // deve usar a variante 'destructive' do nosso Design System.
    // Dependendo da implementação real do ConfirmationModal, estas classes podem
    // ser aplicadas diretamente ao botão interno de confirmação.

    // 1. O botão DEVE ter o estilo 'destructive'
    expect(confirmButton).toHaveClass('bg-destructive');
    expect(confirmButton).toHaveClass('text-destructive-foreground');
    expect(confirmButton).toHaveClass('hover:bg-destructive/90');
    
    // 2. O Card/Dialog que envolve o modal (se a cor for aplicada ao header/body)
    // Assumindo que a cor destrutiva é aplicada SOMENTE ao botão, conforme boa prática.
    // Se a exigência fosse "bg-destructive/10" no Dialog, o teste deveria buscar o Dialog/Card.

    // O teste agora cumpre a exigência de QA, validando a conformidade visual/semântica.
  });

  it('should not render the modal when isOpen is false', () => {
    render(<ConfirmationModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole('heading', { name: mockTitle })).not.toBeInTheDocument();
  });
});