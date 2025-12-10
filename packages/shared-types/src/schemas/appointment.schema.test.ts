import { describe, it, expect } from 'vitest';
import { AppointmentFormSchema, AppointmentSchema } from './appointment.schema';

describe('Appointment Schemas', () => {
  const baseDate = new Date();
  
  // Refatorado para camelCase conforme Passo 2 (O Contrato)
  const validFormData = {
    clientId: 1,
    professionalId: 2,
    serviceId: 3,
    appointmentDate: baseDate,
    endDate: new Date(baseDate.getTime() + 30 * 60000), // 30 minutos depois
    price: 100.0,
    notes: 'Cliente pediu para não usar secador.',
  };

  const validDbData = {
    ...validFormData,
    id: 1,
    createdAt: new Date(), // Padrão Ouro: camelCase no código
    updatedAt: new Date(), // Padrão Ouro: camelCase no código
  };

  // --- Testes para AppointmentFormSchema ---
  describe('AppointmentFormSchema', () => {
    it('should validate correctly formatted form data', () => {
      const result = AppointmentFormSchema.safeParse(validFormData);
      expect(result.success).toBe(true);
    });

    it('should fail if endDate is before appointmentDate (.refine)', () => {
      const invalidData = {
        ...validFormData,
        endDate: new Date(baseDate.getTime() - 30 * 60000), // 30 minutos antes
      };
      const result = AppointmentFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      // Atualizado para verificar o path em camelCase
      expect(
        result.error.issues.some((issue) => issue.path.includes('endDate')),
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

    it('should fail if any ID is not a number', () => {
      const invalidData = {
        ...validFormData,
        clientId: '1' as any, // Força o tipo errado
      };
      const result = AppointmentFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(
        result.error.issues.some((issue) => issue.path.includes('clientId')),
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
    it('should validate a full appointment object (e.g., from DB mapped to camelCase)', () => {
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

    it('should still enforce the .refine() rule', () => {
      const invalidData = {
        ...validDbData,
        endDate: new Date(baseDate.getTime() - 1), // 1ms antes
      };
      const result = AppointmentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(
        result.error.issues.some((issue) => issue.path.includes('endDate')),
      ).toBe(true);
    });
  });
});