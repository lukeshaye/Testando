import { describe, it, expect } from 'vitest';
// Nota: Assume-se que o arquivo de schema foi atualizado para suportar startTime/endTime
// conforme solicitado no plano de correção.
import { AppointmentFormSchema, AppointmentSchema } from './appointment.schema';

describe('Appointment Schemas', () => {
  const baseDate = new Date();
  baseDate.setHours(0, 0, 0, 0); // Normaliza a data para evitar ruído nos testes

  // Refatorado para alinhar com o contrato da API (Strings "HH:MM")
  // Isso resolve a inconsistência citada no plano (Frontend enviando Date vs API esperando String)
  const validFormData = {
    clientId: 1,
    professionalId: 2,
    serviceId: 3,
    appointmentDate: baseDate,
    startTime: '14:00', // Mudança crítica: Uso de string explícita para evitar Timezone bug
    endTime: '14:30',   // Mudança crítica: Uso de string explícita
    price: 100.0,
    notes: 'Cliente pediu para não usar secador.',
  };

  const validDbData = {
    ...validFormData,
    id: 1,
    // Princípio 2.2 (DRY) e Padrão Ouro: camelCase mantido
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // --- Testes para AppointmentFormSchema ---
  describe('AppointmentFormSchema', () => {
    it('should validate correctly formatted form data with time strings', () => {
      // Princípio 2.15 (Testabilidade Explícita): Valida o "Caminho Feliz"
      const result = AppointmentFormSchema.safeParse(validFormData);
      expect(result.success).toBe(true);
    });

    it('should fail if endTime is before startTime (.refine)', () => {
      const invalidData = {
        ...validFormData,
        startTime: '14:30',
        endTime: '14:00', // Inválido: termina antes de começar
      };
      const result = AppointmentFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      
      // Verifica se o erro está associado ao campo endTime ou ao root do refine
      expect(
        result.error.issues.some((issue) => 
          issue.path.includes('endTime') || issue.path.includes('startTime')
        ),
      ).toBe(true);
    });

    it('should fail if time format is invalid', () => {
      const invalidData = {
        ...validFormData,
        startTime: '25:00', // Hora inexistente
      };
      const result = AppointmentFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(
        result.error.issues.some((issue) => issue.path.includes('startTime')),
      ).toBe(true);
    });

    it('should fail if clientId is not a positive number', () => {
      const invalidData = { ...validFormData, clientId: 0 };
      const result = AppointmentFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(
        result.error.issues.some((issue) => issue.path.includes('clientId')),
      ).toBe(true);
    });

    it('should fail if professionalId is not a positive number', () => {
      const invalidData = { ...validFormData, professionalId: -1 };
      const result = AppointmentFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(
        result.error.issues.some((issue) =>
          issue.path.includes('professionalId'),
        ),
      ).toBe(true);
    });

    it('should fail if serviceId is not a positive number', () => {
      const invalidData = { ...validFormData, serviceId: 0 };
      const result = AppointmentFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(
        result.error.issues.some((issue) => issue.path.includes('serviceId')),
      ).toBe(true);
    });

    it('should fail if price is not positive', () => {
      const invalidData = { ...validFormData, price: 0 };
      const result = AppointmentFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(
        result.error.issues.some((issue) => issue.path.includes('price')),
      ).toBe(true);
    });

    it('should fail if appointmentDate is not a valid date', () => {
      const invalidData = {
        ...validFormData,
        appointmentDate: 'não é uma data' as any,
      };
      const result = AppointmentFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(
        result.error.issues.some((issue) =>
          issue.path.includes('appointmentDate'),
        ),
      ).toBe(true);
    });
  });

  // --- Testes para AppointmentSchema ---
  describe('AppointmentSchema', () => {
    it('should validate a full appointment object (aligned with API contract)', () => {
      const result = AppointmentSchema.safeParse(validDbData);
      expect(result.success).toBe(true);
    });

    it('should fail if id is missing', () => {
      const invalidData = { ...validDbData };
      delete (invalidData as any).id;
      const result = AppointmentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(
        result.error.issues.some((issue) => issue.path.includes('id')),
      ).toBe(true);
    });

    it('should still enforce the .refine() rule on the DB object', () => {
      const invalidData = {
        ...validDbData,
        startTime: '10:00',
        endTime: '09:59', // Inválido
      };
      const result = AppointmentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      // O path do erro pode variar dependendo de como o superRefine foi implementado
      expect(
        result.error.issues.some((issue) => issue.path.includes('endTime') || issue.path.includes('startTime')),
      ).toBe(true);
    });
  });
});