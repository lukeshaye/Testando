import { describe, it, expect } from 'vitest';
import { CreateFinancialEntrySchema } from './financial.schema';

// Testes focados em falhas de validação (PTE 2.15)
describe('CreateFinancialEntrySchema', () => {
  // Atualizado para camelCase conforme Passo 2 do plano de refatoração
  const validEntry = {
    description: 'Venda de produto',
    amount: 150.5,
    type: 'receita',
    entryType: 'pontual', // Refatorado: entry_type -> entryType
    entryDate: new Date('2025-11-04'), // Refatorado: entry_date -> entryDate
  };

  it('deve validar um lançamento financeiro correto', () => {
    const result = CreateFinancialEntrySchema.safeParse(validEntry);
    expect(result.success).toBe(true);
  });

  it('deve falhar se a descrição estiver vazia', () => {
    const invalidEntry = { ...validEntry, description: '' };
    const result = CreateFinancialEntrySchema.safeParse(invalidEntry);
    expect(result.success).toBe(false);
    // Verifica a mensagem de erro específica
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        'A descrição é obrigatória.',
      );
    }
  });

  it('deve falhar se o valor (amount) for negativo', () => {
    const invalidEntry = { ...validEntry, amount: -100 };
    const result = CreateFinancialEntrySchema.safeParse(invalidEntry);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        'O valor deve ser um número positivo.',
      );
    }
  });

  it('deve falhar se o valor (amount) for zero', () => {
    // (Teste de borda para .positive())
    const invalidEntry = { ...validEntry, amount: 0 };
    const result = CreateFinancialEntrySchema.safeParse(invalidEntry);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        'O valor deve ser um número positivo.',
      );
    }
  });

  it('deve falhar se o "type" for um valor de enum inválido', () => {
    const invalidEntry = { ...validEntry, type: 'investimento' };
    const result = CreateFinancialEntrySchema.safeParse(invalidEntry);
    expect(result.success).toBe(false);
  });

  it('deve falhar se o "entryType" for um valor de enum inválido', () => {
    // Refatorado: entry_type -> entryType
    const invalidEntry = { ...validEntry, entryType: 'recorrente' };
    const result = CreateFinancialEntrySchema.safeParse(invalidEntry);
    expect(result.success).toBe(false);
  });

  it('deve falhar se a data for inválida', () => {
    // Refatorado: entry_date -> entryDate
    const invalidEntry = { ...validEntry, entryDate: 'data-invalida' };
    const result = CreateFinancialEntrySchema.safeParse(invalidEntry);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Data inválida.');
    }
  });

  it('deve converter uma string de data válida para Date (coerce)', () => {
    // Refatorado: entry_date -> entryDate
    const entryWithDateString = {
      ...validEntry,
      entryDate: '2025-11-04T12:00:00.000Z',
    };
    const result = CreateFinancialEntrySchema.safeParse(entryWithDateString);
    expect(result.success).toBe(true);
    if (result.success) {
      // Refatorado: entry_date -> entryDate nas asserções
      expect(result.data.entryDate).toBeInstanceOf(Date);
      expect(result.data.entryDate.toISOString()).toBe(
        '2025-11-04T12:00:00.000Z',
      );
    }
  });
});