// /packages/web/src/features/settings/components/ProfileSettingsForm.test.tsx

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfileSettingsForm } from './ProfileSettingsForm';
import { useSettingsQuery } from '../hooks/useSettingsQuery';
import { useUpdateProfileSettingsMutation } from '../hooks/useUpdateSettingsMutation';

// --- Mocks ---
// Garante isolamento total conforme Princípio 2.15 (PTE)
jest.mock('../hooks/useSettingsQuery');
jest.mock('../hooks/useUpdateSettingsMutation');

describe('ProfileSettingsForm', () => {
  // Spies
  const mockMutate = jest.fn();

  // Dados Mock Padrão (Alinhado com Passo 2: Schemas em camelCase)
  // O backend agora retorna 'name' e não 'business_name' ou 'establishment_name'
  const mockProfileData = {
    profile: {
      name: 'Barbearia do Teste',
      phone: '(11) 99999-9999',
      address: 'Rua dos Testes, 123',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup Query (Sucesso)
    // Simula o retorno direto do Drizzle/Zod já em camelCase
    (useSettingsQuery as jest.Mock).mockReturnValue({
      data: mockProfileData,
      isLoading: false,
    });

    // Setup Mutation
    (useUpdateProfileSettingsMutation as jest.Mock).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });
  });

  // --- 1. Testes de Renderização e Loading ---

  it('deve exibir o esqueleto de carregamento quando isLoading for true', () => {
    (useSettingsQuery as jest.Mock).mockReturnValue({
      data: null,
      isLoading: true,
    });

    const { container } = render(<ProfileSettingsForm />);
    
    // Verifica presença visual do loading (Feedback de UI)
    expect(container.getElementsByClassName('animate-pulse').length).toBeGreaterThan(0);
  });

  it('deve popular os campos do formulário com os dados da query em camelCase', async () => {
    render(<ProfileSettingsForm />);

    // Aguarda a população dos campos (react-hook-form reset)
    await waitFor(() => {
      expect(screen.getByDisplayValue('Barbearia do Teste')).toBeInTheDocument();
      expect(screen.getByDisplayValue('(11) 99999-9999')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Rua dos Testes, 123')).toBeInTheDocument();
    });
  });

  // --- 2. Testes de Validação e Erro (Princípio 2.16 - DSpP) ---

  it('NÃO deve chamar a mutação se o campo Nome (obrigatório) estiver vazio', async () => {
    const user = userEvent.setup();
    render(<ProfileSettingsForm />);

    // Aguarda carregar
    await waitFor(() => screen.getByDisplayValue('Barbearia do Teste'));

    // Limpa o campo Nome
    const nameInput = screen.getByLabelText(/Nome do Estabelecimento/i);
    await user.clear(nameInput);

    // Tenta salvar
    const submitButton = screen.getByText('Salvar Perfil');
    await user.click(submitButton);

    // Verificação 1: Mutação não chamada (Segurança de dados)
    expect(mockMutate).not.toHaveBeenCalled();

    // Verificação 2: Mensagem de erro do Schema Zod exibida
    expect(await screen.findByText('Nome do negócio é obrigatório')).toBeInTheDocument();
  });

  // --- 3. Testes de Submissão (Alinhado com Passo 4 - Interface) ---

  it('deve chamar a mutação com payload em camelCase ao submeter formulário válido', async () => {
    const user = userEvent.setup();
    render(<ProfileSettingsForm />);

    // Aguarda carregar
    const nameInput = await screen.findByLabelText(/Nome do Estabelecimento/i);
    const phoneInput = screen.getByLabelText(/Telefone/i);

    // Altera os valores
    await user.clear(nameInput);
    await user.type(nameInput, 'Barbearia Atualizada');
    
    await user.clear(phoneInput);
    await user.type(phoneInput, '(11) 88888-8888');

    // Submete
    const submitButton = screen.getByText('Salvar Perfil');
    await user.click(submitButton);

    // Verifica se a mutação foi chamada respeitando o contrato camelCase
    // Isso garante que o Passo 3 (Handlers) receberá o formato correto
    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(mockMutate).toHaveBeenCalledWith({
      name: 'Barbearia Atualizada',
      phone: '(11) 88888-8888',
      address: 'Rua dos Testes, 123', // Endereço original mantido
    });
  });

  it('deve mostrar estado de loading no botão durante a submissão', () => {
    // Simula estado isPending da mutação (Feedback de UI)
    (useUpdateProfileSettingsMutation as jest.Mock).mockReturnValue({
      mutate: mockMutate,
      isPending: true,
    });

    render(<ProfileSettingsForm />);

    // Verifica estado visual do botão
    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('Salvando...');
    expect(button).toBeDisabled();
  });
});