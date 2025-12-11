import { describe, it, expect } from 'vitest';
import { AppointmentFormSchema, AppointmentSchema } from './appointment.schema';

// [Princípio 2.15 - PTE] Testabilidade Explícita:
// Este arquivo de teste serve como documentação viva do contrato da API.
// Ele garante que as regras de negócio (horários, formatos) sejam validadas antes de chegar ao Handler.

describe('Appointment Schemas Integration Tests', () => {
  // Normalização de data base para consistência nos testes
  const baseDate = new Date();
  baseDate.setHours(0, 0, 0, 0);

  // [Princípio 2.2 - DRY] Centralização dos dados válidos para reuso
  // Alinhado ao Plano: Usa strings explícitas 'HH:MM' conforme esperado pela API.
  const validFormData = {
    clientId: 1,
    professionalId: 2,
    serviceId: 3,
    appointmentDate: baseDate,
    startTime: '14:00', 
    endTime: '14:30',   
    price: 100.0,
    notes: 'Cliente pediu para não usar secador.',
  };

  const validDbData = {
    ...validFormData,
    id: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // --- Suite: Validação de Entrada (Form/API Contract) ---
  describe('AppointmentFormSchema (Input Contract)', () => {
    
    // 1. Caminho Feliz
    it('should validate correctly formatted form data with "HH:MM" strings', () => {
      const result = AppointmentFormSchema.safeParse(validFormData);
      expect(result.success).toBe(true);
    });

    // 2. Validação Lógica de Negócio (Cross-field Validation)
    // [Plano de Correção]: Garante que lógica de término > início funciona.
    it('should fail if endTime is before startTime', () => {
      const invalidData = {
        ...validFormData,
        startTime: '14:30',
        endTime: '14:00', // Inválido: viagem no tempo
      };
      const result = AppointmentFormSchema.safeParse(invalidData);
      
      expect(result.success).toBe(false);
      // Verifica se o erro foi capturado pelo refine
      expect(
        result.error?.issues.some((issue) => 
          issue.path.includes('endTime') || issue.message.includes('término')
        ),
      ).toBe(true);
    });

    it('should fail if endTime is equal to startTime (zero duration)', () => {
      const invalidData = {
        ...validFormData,
        startTime: '14:00',
        endTime: '14:00', // Inválido: duração zero
      };
      const result = AppointmentFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    // 3. Validação de Formato (Regex e Tipagem)
    // [Plano de Correção]: Cobertura rigorosa do Regex "HH:MM".
    it('should fail if startTime has invalid hour (e.g., 25:00)', () => {
      const invalidData = { ...validFormData, startTime: '25:00' };
      const result = AppointmentFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toMatch(/formato/i); // Espera mensagem sobre formato
    });

    it('should fail if endTime has invalid minutes (e.g., 14:60)', () => {
      const invalidData = { ...validFormData, endTime: '14:60' };
      const result = AppointmentFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should fail if time format is random string', () => {
      const invalidData = { ...validFormData, startTime: 'uma hora qualquer' };
      const result = AppointmentFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    // [Plano de Correção]: Proteção contra o bug do Frontend enviando Date
    // [Princípio 2.16 - DSpP]: Input validation estrito.
    it('should fail if startTime is provided as a Date object instead of String', () => {
      const invalidData = { 
        ...validFormData, 
        startTime: new Date() as any // Simula o erro do Frontend antigo
      };
      const result = AppointmentFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(
        result.error?.issues.some((issue) => issue.code === 'invalid_type')
      ).toBe(true);
    });

    // 4. Validação de Campos Obrigatórios e Tipos Numéricos
    it('should fail if IDs are not positive numbers', () => {
      const invalidData = { ...validFormData, clientId: 0, professionalId: -5 };
      const result = AppointmentFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error?.issues.length).toBeGreaterThanOrEqual(2);
    });

    it('should fail if price is zero or negative', () => {
      const invalidData = { ...validFormData, price: 0 };
      const result = AppointmentFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  // --- Suite: Validação de Objeto de Domínio (DB) ---
  describe('AppointmentSchema (Domain/DB Object)', () => {
    it('should validate a full appointment object (aligned with API contract)', () => {
      const result = AppointmentSchema.safeParse(validDbData);
      expect(result.success).toBe(true);
    });

    it('should fail if id is missing', () => {
      const { id, ...invalidData } = validDbData;
      const result = AppointmentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    // [Princípio 2.2 - DRY]: A regra de negócio (start < end) também deve valer para o objeto de domínio
    it('should still enforce the time logic rule on the DB object', () => {
      const invalidData = {
        ...validDbData,
        startTime: '10:00',
        endTime: '09:00', // Dados corrompidos ou lógica errada no banco
      };
      const result = AppointmentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});