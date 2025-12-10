import { describe, it, expect } from 'vitest';
import { CreateServiceSchema, ServiceSchema } from './service.schema';

describe('CreateServiceSchema', () => {
  // Mantém apenas os campos necessários para criação (sem ID ou auditoria)
  // Certifica-se de que tudo está em camelCase (name, price, duration, color)
  const validData = {
    name: 'Corte de Cabelo',
    price: 50.0,
    duration: 30, // camelCase: garante que não é duration_minutes
    color: '#FF0000',
  };

  it('should validate correct service data', () => {
    const result = CreateServiceSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should fail if name is empty', () => {
    const invalidData = { ...validData, name: '' };
    const result = CreateServiceSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain('obrigatório');
  });

  it('should fail if price is zero', () => {
    const invalidData = { ...validData, price: 0 };
    const result = CreateServiceSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain('positivo');
  });

  it('should fail if price is negative', () => {
    const invalidData = { ...validData, price: -10 };
    const result = CreateServiceSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain('positivo');
  });

  it('should fail if duration is not an integer', () => {
    const invalidData = { ...validData, duration: 30.5 };
    const result = CreateServiceSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain('inteiro');
  });

  it('should fail if duration is negative', () => {
    const invalidData = { ...validData, duration: -30 };
    const result = CreateServiceSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain('positivo');
  });

  it('should fail if color format is invalid (short)', () => {
    const invalidData = { ...validData, color: '#FFF' };
    const result = CreateServiceSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain('hexadecimal');
  });

  it('should fail if color format is invalid (no hash)', () => {
    const invalidData = { ...validData, color: 'FF0000' };
    const result = CreateServiceSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain('hexadecimal');
  });

  it('should fail if color format is invalid (invalid chars)', () => {
    const invalidData = { ...validData, color: '#GG0000' };
    const result = CreateServiceSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain('hexadecimal');
  });
});

describe('ServiceSchema', () => {
  // Atualizado para refletir o Objeto Completo vindo do Banco (Passo 1 + Passo 2)
  const validService = {
    id: 1,
    name: 'Manicure',
    price: 35.0,
    duration: 45,
    color: '#00FF00',
    // Adicionado campos de auditoria obrigatórios pelo Padrão Ouro (Passo 1)
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('should validate correct full service data (including id and audit fields)', () => {
    const result = ServiceSchema.safeParse(validService);
    expect(result.success).toBe(true);
  });

  it('should fail if id is missing', () => {
    const { id, ...invalidData } = validService;
    const result = ServiceSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should fail if id is not a positive integer', () => {
    const invalidData = { ...validService, id: -1 };
    const result = ServiceSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  // Campos de auditoria agora são esperados no retorno completo
  it('should fail if createdAt is missing in full schema', () => {
    const { createdAt, ...invalidData } = validService;
    const result = ServiceSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should fail if name is invalid (inherited check)', () => {
    const invalidData = { ...validService, name: '' };
    const result = ServiceSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should fail if price is invalid (inherited check)', () => {
    const invalidData = { ...validService, price: -100 };
    const result = ServiceSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});