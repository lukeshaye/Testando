import { describe, it, expect } from 'vitest';
import {
  ProfessionalSchema,
  CreateProfessionalSchema,
} from './professional.schema';

describe('CreateProfessionalSchema', () => {
  // Refatorado para camelCase
  const validCreateData = {
    name: 'Dr. Roberta',
    email: 'roberta@example.com',
    phone: '11987654321',
    color: '#FF00FF',
    salary: 5000.5,
    commissionRate: 10.5,     // De commission_rate para commissionRate
    workStartTime: '09:00',   // De work_start_time para workStartTime
    workEndTime: '18:00',     // De work_end_time para workEndTime
    lunchStartTime: '12:00',  // De lunch_start_time para lunchStartTime
    lunchEndTime: '13:00',    // De lunch_end_time para lunchEndTime
  };

  it('deve validar dados de criação de profissional com sucesso', () => {
    const result = CreateProfessionalSchema.safeParse(validCreateData);
    expect(result.success, result.error?.message).toBe(true);
  });

  it('deve permitir campos de tempo nulos', () => {
    const dataWithNullTimes = {
      ...validCreateData,
      workStartTime: null,   // Atualizado
      lunchStartTime: null,  // Atualizado
    };
    const result = CreateProfessionalSchema.safeParse(dataWithNullTimes);
    expect(result.success).toBe(true);
  });

  it('deve falhar se o nome estiver vazio', () => {
    const invalidData = { ...validCreateData, name: '' };
    const result = CreateProfessionalSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(
      'Nome do profissional é obrigatório',
    );
  });

  it('deve falhar se a cor for inválida (sem #)', () => {
    const invalidData = { ...validCreateData, color: 'FF00FF' };
    const result = CreateProfessionalSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain('hexadecimal');
  });

  it('deve falhar se a cor for inválida (comprimento)', () => {
    const invalidData = { ...validCreateData, color: '#FF0' };
    const result = CreateProfessionalSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain('hexadecimal');
  });

  it('deve falhar se o salário for negativo', () => {
    const invalidData = { ...validCreateData, salary: -100 };
    const result = CreateProfessionalSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(
      'Salário deve ser um valor positivo',
    );
  });

  it('deve falhar se a comissão for negativa', () => {
    const invalidData = { ...validCreateData, commissionRate: -1 }; // Atualizado
    const result = CreateProfessionalSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('Comissão não pode ser negativa');
  });

  it('deve falhar se a comissão for maior que 100', () => {
    const invalidData = { ...validCreateData, commissionRate: 101 }; // Atualizado
    const result = CreateProfessionalSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('Comissão não pode exceder 100');
  });

  it('deve falhar se workStartTime tiver formato HH:MM inválido (hora)', () => {
    const invalidData = { ...validCreateData, workStartTime: '24:00' }; // Atualizado
    const result = CreateProfessionalSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('Formato HH:MM inválido');
  });

  it('deve falhar se lunchStartTime tiver formato HH:MM inválido (minuto)', () => {
    const invalidData = { ...validCreateData, lunchStartTime: '12:60' }; // Atualizado
    const result = CreateProfessionalSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('Formato HH:MM inválido');
  });

  it('deve falhar se workEndTime tiver formato HH:MM inválido (formato)', () => {
    const invalidData = { ...validCreateData, workEndTime: '9:00' }; // Atualizado
    const result = CreateProfessionalSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('Formato HH:MM inválido');
  });
});

describe('ProfessionalSchema', () => {
  // Refatorado para camelCase
  const validProfessionalData = {
    id: 1,
    name: 'Carlos Lima',
    email: 'carlos.lima@example.com',
    phone: null,
    color: '#00FF00',
    salary: 4500,
    commissionRate: 15,       // De commission_rate para commissionRate
    workStartTime: '08:30',   // De work_start_time para workStartTime
    workEndTime: '17:30',     // De work_end_time para workEndTime
    lunchStartTime: '11:30',  // De lunch_start_time para lunchStartTime
    lunchEndTime: '12:30',    // De lunch_end_time para lunchEndTime
    createdAt: new Date().toISOString(), // De created_at para createdAt
    updatedAt: new Date().toISOString(), // De updated_at para updatedAt
  };

  it('deve validar um profissional completo com sucesso', () => {
    const result = ProfessionalSchema.safeParse(validProfessionalData);
    expect(result.success, result.error?.message).toBe(true);
  });

  it('deve falhar se o ID for inválido (não positivo)', () => {
    const invalidData = { ...validProfessionalData, id: 0 };
    const result = ProfessionalSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(
      'Number must be greater than 0',
    );
  });

  it('deve falhar se createdAt for inválido', () => {
    const invalidData = { ...validProfessionalData, createdAt: 'ontem' }; // Atualizado
    const result = ProfessionalSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('Data de criação inválida');
  });
});