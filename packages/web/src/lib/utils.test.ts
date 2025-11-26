// packages/web/src/lib/utils.test.ts

import { describe, test, expect } from 'vitest';
import { cn, formatCurrency, formatDate } from './utils';

/**
 * Testes para /packages/web/src/lib/utils.ts
 *
 * Conforme o PLANO_DE_FEATURE (Tarefa 4.6):
 * [cite_start]- [cite: 65] Estes testes migram a lógica de validação de `formatCurrency`
 * do legado, e também validam os outros utilitários (`cn`, `formatDate`)
 * para garantir a aderência ao princípio PTE (2.15).
 */

// Testes para cn (tailwind-merge + clsx)
describe('cn (utility)', () => {
  test('deve mesclar classes simples', () => {
    expect(cn('bg-red-500', 'text-white')).toBe('bg-red-500 text-white');
  });

  test('deve lidar com classes condicionais (falsy values)', () => {
    expect(cn('p-4', false, 'm-2', null, 'font-bold', undefined, 0)).toBe(
      'p-4 m-2 font-bold',
    );
  });

  test('deve substituir classes conflitantes do Tailwind (twMerge)', () => {
    // p-8 deve substituir p-4
    expect(cn('p-4', 'font-bold', 'p-8')).toBe('font-bold p-8');
    // px-6 deve substituir px-2
    expect(cn('px-2 py-2', 'px-6')).toBe('py-2 px-6');
    // bg-blue-500 deve substituir bg-red-500
    expect(cn('bg-red-500', 'text-white', 'bg-blue-500')).toBe(
      'text-white bg-blue-500',
    );
  });
});

[cite_start]// Testes para formatCurrency (Especificado no Plano [cite: 65])
describe('formatCurrency', () => {
  test('deve formatar zero corretamente', () => {
    expect(formatCurrency(0)).toBe('R$ 0,00');
  });

  test('deve formatar um valor com centavos (ex: 12345 -> R$ 123,45)', () => {
    expect(formatCurrency(12345)).toBe('R$ 123,45');
  });

  test('deve formatar um valor negativo', () => {
    expect(formatCurrency(-5025)).toBe('-R$ 50,25');
  });

  test('deve formatar um valor de apenas centavos (ex: 89 -> R$ 0,89)', () => {
    expect(formatCurrency(89)).toBe('R$ 0,89');
  });

  test('deve formatar um valor "cheio" (ex: 7500 -> R$ 75,00)', () => {
    expect(formatCurrency(7500)).toBe('R$ 75,00');
  });

  test('deve adicionar separador de milhar corretamente', () => {
    expect(formatCurrency(1234567)).toBe('R$ 12.345,67');
  });

  test('deve lidar com valores grandes', () => {
    expect(formatCurrency(9876543210)).toBe('R$ 98.765.432,10');
  });
});

// Testes para formatDate
describe('formatDate', () => {
  test('deve formatar uma data a partir de uma string (YYYY-MM-DD)', () => {
    expect(formatDate('2025-10-25')).toBe('25/10/2025');
  });

  test('deve formatar uma data a partir de um objeto Date', () => {
    // Mês 9 = Outubro (0-indexed)
    const date = new Date(2025, 9, 25, 14, 30, 0);
    expect(formatDate(date)).toBe('25/10/2025');
  });

  test('deve lidar corretamente com o início do ano (string)', () => {
    // A implementação (T00:00:00) previne que problemas de fuso
    // revertam a data para o dia 31/12 do ano anterior.
    expect(formatDate('2024-01-01')).toBe('01/01/2024');
  });

  test('deve lidar corretamente com o final do ano (Date)', () => {
    const date = new Date(2023, 11, 31); // Mês 11 = Dezembro
    expect(formatDate(date)).toBe('31/12/2023');
  });
});