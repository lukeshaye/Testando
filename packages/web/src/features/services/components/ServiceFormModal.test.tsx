// /packages/web/src/features/services/components/ServiceFormModal.test.tsx

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ServiceFormModal } from './ServiceFormModal';

// Mocks dos Hooks de Mutação
const mockAddMutate = vi.fn();
const mockUpdateMutate = vi.fn();

vi.mock('../hooks/useAddServiceMutation', () => ({
  useAddServiceMutation: () => ({
    mutate: mockAddMutate,
    isPending: false,
  }),
}));

vi.mock('../hooks/useUpdateServiceMutation', () => ({
  useUpdateServiceMutation: () => ({
    mutate: mockUpdateMutate,
    isPending: false,
  }),
}));

// Mock dos Utilitários de Formatação
// Isso isola o teste da implementação real de 'utils', focando na lógica do componente
vi.mock('@/packages/web/src/lib/utils', () => ({
  formatCurrency: (val: number) => {
    if (val === undefined || val === null) return 'R$ 0,00';
    return `R$ ${(val / 100).toFixed(2).replace('.', ',')}`;
  },
  parseCurrency: (val: string) => {
    const numbers = val.replace(/\D/g, '');
    return parseInt(numbers, 10) || 0;
  },
  cn: (...inputs: any[]) => inputs.join(' '),
}));

// Mock Global para ResizeObserver (necessário para alguns componentes do Radix UI/Shadcn em JSDOM)
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('ServiceFormModal', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar o modal de criação corretamente (estado vazio)', () => {
    render(<ServiceFormModal isOpen={true} onClose={onClose} />);
    
    expect(screen.getByText('Novo Serviço')).toBeInTheDocument();
    expect(screen.getByLabelText(/nome \*/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /criar serviço/i })).toBeInTheDocument();
  });

  it('deve exibir erros de validação ao submeter formulário vazio', async () => {
    render(<ServiceFormModal isOpen={true} onClose={onClose} />);
    
    const submitBtn = screen.getByRole('button', { name: /criar serviço/i });
    fireEvent.click(submitBtn);

    // O Zod Schema define 'name' como obrigatório e 'price' positivo
    await waitFor(() => {
        expect(screen.getByText(/nome do serviço é obrigatório/i)).toBeInTheDocument(); 
        // Nota: O input de preço inicia com 0. Se o schema exige positive (>0), deve falhar.
        // Ajuste conforme a mensagem exata definida no shared/types.ts
    });
  });

  it('deve chamar addMutation ao criar um serviço válido', async () => {
    const user = userEvent.setup();
    render(<ServiceFormModal isOpen={true} onClose={onClose} />);

    // Preencher Nome
    await user.type(screen.getByLabelText(/nome \*/i), 'Corte Novo');
    
    // Preencher Preço (Simulando digitação que o parseCurrency converte para centavos)
    const priceInput = screen.getByLabelText(/preço \(r\$\) \*/i);
    await user.clear(priceInput);
    await user.type(priceInput, '5000'); // O mock converte isso para 5000 (R$ 50,00)
    
    // Preencher Duração
    const durationInput = screen.getByLabelText(/duração \(min\) \*/i);
    await user.clear(durationInput);
    await user.type(durationInput, '45');

    // Submeter
    await user.click(screen.getByRole('button', { name: /criar serviço/i }));

    await waitFor(() => {
      expect(mockAddMutate).toHaveBeenCalledTimes(1);
      expect(mockAddMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Corte Novo',
          price: 5000,
          duration: 45,
          image_url: null, // Verifica se inicializou corretamente como null
          color: '#000000',
        }),
        expect.anything()
      );
    });
  });

  it('deve popular o formulário e chamar updateMutation ao editar', async () => {
    const editingService = {
      id: 10,
      user_id: 'uid-123',
      name: 'Corte Antigo',
      description: 'Descrição antiga',
      price: 3000, // R$ 30,00
      duration: 30,
      image_url: 'http://site.com/img.jpg',
      color: '#ff0000',
      created_at: '2023-01-01',
      updated_at: '2023-01-01'
    };

    const user = userEvent.setup();
    render(<ServiceFormModal isOpen={true} onClose={onClose} editingService={editingService} />);

    // Verifica valores iniciais populados
    expect(screen.getByLabelText(/nome \*/i)).toHaveValue('Corte Antigo');
    // Preço formatado pelo mock: 3000 -> R$ 30,00
    expect(screen.getByLabelText(/preço \(r\$\) \*/i)).toHaveValue('R$ 30,00');
    expect(screen.getByLabelText(/url da imagem/i)).toHaveValue('http://site.com/img.jpg');
    
    // Editar Nome
    await user.clear(screen.getByLabelText(/nome \*/i));
    await user.type(screen.getByLabelText(/nome \*/i), 'Corte Editado');

    // Salvar
    await user.click(screen.getByRole('button', { name: /salvar alterações/i }));

    await waitFor(() => {
      expect(mockUpdateMutate).toHaveBeenCalledTimes(1);
      expect(mockUpdateMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 10,
          name: 'Corte Editado',
          price: 3000,
          image_url: 'http://site.com/img.jpg',
        }),
        expect.anything()
      );
    });
  });

  it('deve tratar string vazia em image_url como null na submissão (Correção Crítica)', async () => {
    const user = userEvent.setup();
    render(<ServiceFormModal isOpen={true} onClose={onClose} />);

    // Preencher campos obrigatórios
    await user.type(screen.getByLabelText(/nome \*/i), 'Serviço Teste');
    const priceInput = screen.getByLabelText(/preço \(r\$\) \*/i);
    await user.clear(priceInput);
    await user.type(priceInput, '1000');

    // Simular usuário digitando e apagando no campo de imagem
    const imgInput = screen.getByLabelText(/url da imagem/i);
    await user.type(imgInput, 'invalid-url');
    await user.clear(imgInput); // Deixa vazio ("")

    await user.click(screen.getByRole('button', { name: /criar serviço/i }));

    await waitFor(() => {
        // Verifica se o valor enviado foi null e não ""
        expect(mockAddMutate).toHaveBeenCalledWith(
            expect.objectContaining({
                image_url: null
            }),
            expect.anything()
        );
    });
  });
});