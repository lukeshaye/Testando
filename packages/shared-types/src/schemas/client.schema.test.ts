import { describe, it, expect } from 'vitest';
import { ClientSchema, CreateClientSchema } from './client.schema';

describe('ClientSchema', () => {
  const validClientData = {
    id: 1,
    name: 'João da Silva',
    email: 'joao.silva@example.com',
    phone: '11999998888',
    birth_date: '1990-01-15T00:00:00.000Z',
    gender: 'masculino',
    how_found: 'indicação',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it('deve validar um cliente completo com sucesso', () => {
    const result = ClientSchema.safeParse(validClientData);
    expect(result.success).toBe(true);
  });

  it('deve falhar se o nome estiver vazio', () => {
    const invalidData = { ...validClientData, name: '' };
    const result = ClientSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(
      'Nome do cliente é obrigatório',
    );
  });

  it('deve falhar se o email for inválido', () => {
    const invalidData = { ...validClientData, email: 'joao.silva' };
    const result = ClientSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('Email inválido');
  });

  it('deve falhar se a data de nascimento for futura', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);

    const invalidData = {
      ...validClientData,
      birth_date: futureDate.toISOString(),
    };
    const result = ClientSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(
      'Data de nascimento não pode ser no futuro',
    );
  });

  it('deve falhar se o gênero for inválido', () => {
    const invalidData = { ...validClientData, gender: 'não-binário' };
    const result = ClientSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    // A mensagem de erro do Zod para enum é mais complexa, apenas checamos a falha
  });
});

describe('CreateClientSchema', () => {
  const validCreateData = {
    name: 'Maria Souza',
    email: 'maria.souza@example.com',
    phone: '21988887777',
    birth_date: '1985-05-20T00:00:00.000Z',
    gender: 'feminino',
    how_found: 'google',
  };

  it('deve validar dados de criação de cliente com sucesso', () => {
    const result = CreateClientSchema.safeParse(validCreateData);
    expect(result.success).toBe(true);
  });

  it('deve falhar se o nome estiver faltando (schema de criação)', () => {
    const { name, ...invalidData } = validCreateData; // Remove o nome
    const result = CreateClientSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain('name');
  });

  it('deve falhar se o email for inválido (schema de criação)', () => {
    const invalidData = { ...validCreateData, email: 'invalid-email' };
    const result = CreateClientSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('Email inválido');
  });
});