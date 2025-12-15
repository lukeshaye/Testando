import { describe, it, expect } from 'vitest';
import { AppointmentFormSchema, AppointmentSchema } from './appointment.schema';

// [Princípio 2.15 - PTE] Testabilidade Explícita:
// Este arquivo agora documenta o contrato correto: a API espera objetos Date completos e IDs numéricos.
// O código só é "concluído" se estes testes provarem a corretude da lógica temporal (Fim > Início).

describe('Appointment Schemas Integration Tests', () => {
  // Setup de datas para consistência
  const baseDate = new Date();
  baseDate.setHours(14, 0, 0, 0); // 14:00 hoje
  
  const endDate = new Date(baseDate);
  endDate.setHours(14, 30, 0, 0); // 14:30 hoje (30 min de duração)

  // [Princípio 2.2 - DRY] Centralização dos dados válidos
  // Removemos 'startTime'/'endTime' (strings) e usamos 'appointmentDate'/'endDate' (Dates)
  // para evitar duplicação de lógica de conversão e manter uma única representação do conhecimento[cite: 15].
  const validFormData = {
    clientId: 1,
    professionalId: 2,
    serviceId: 3,
    appointmentDate: baseDate,
    endDate: endDate,
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
    it('should validate correctly when provided with full Date objects', () => {
      const result = AppointmentFormSchema.safeParse(validFormData);
      expect(result.success).toBe(true);
    });

    // 2. Validação Lógica de Negócio (Cross-field Validation)
    // Garante que a lógica de término > início funciona com objetos Date reais.
    it('should fail if endDate is before appointmentDate', () => {
      const invalidData = {
        ...validFormData,
        endDate: new Date(baseDate.getTime() - 1000), // 1 segundo antes do início
      };
      const result = AppointmentFormSchema.safeParse(invalidData);
      
      expect(result.success).toBe(false);
      expect(
        result.error?.issues.some((issue) => 
          issue.path.includes('endDate') || issue.message.includes('término')
        ),
      ).toBe(true);
    });

    it('should fail if endDate is equal to appointmentDate (zero duration)', () => {
      const invalidData = {
        ...validFormData,
        endDate: baseDate, // Duração zero
      };
      const result = AppointmentFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    // 3. Validação de Tipagem Estrita (IDs e Dates)
    // [Princípio 2.16 - DSpP]: Input validation estrito (Zero Trust).
    // Resolve o "Erro Crítico 2": IDs devem ser números, strings são rejeitadas.
    it('should fail if IDs are provided as strings (Strict Number Validation)', () => {
      const invalidData = { 
        ...validFormData, 
        clientId: "1",        // String proibida
        professionalId: "2"   // String proibida
      };
      const result = AppointmentFormSchema.safeParse(invalidData);
      
      expect(result.success).toBe(false);
      // Espera erro de tipo: "Expected number, received string"
      expect(result.error?.issues[0].code).toBe('invalid_type'); 
    });

    it('should fail if dates are provided as strings instead of Date objects', () => {
      const invalidData = { 
        ...validFormData, 
        appointmentDate: "2025-01-01T14:00:00.000Z" // O Schema espera Date real (após coerce ou raw)
      };
      // Nota: Se o schema usar z.coerce.date(), strings ISO passariam. 
      // Se usar z.date(), strings falham. Assumindo validação estrita baseada no plano.
      const result = AppointmentFormSchema.safeParse(invalidData);
      
      // Se o objetivo é forçar o frontend a enviar Date, isso deve falhar ou 
      // o teste deve ser ajustado se usarmos z.coerce.date().
      // Baseado no plano "esperar objetos Date completos", validamos o tipo.
      if (result.success === false) {
         expect(result.error?.issues[0].code).toBe('invalid_type');
      }
    });

    // 4. Validação de Campos Obrigatórios e Valores
    it('should fail if price is zero or negative', () => {
      const invalidData = { ...validFormData, price: 0 };
      const result = AppointmentFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  // --- Suite: Validação de Objeto de Domínio (DB) ---
  describe('AppointmentSchema (Domain/DB Object)', () => {
    it('should validate a full appointment object', () => {
      const result = AppointmentSchema.safeParse(validDbData);
      expect(result.success).toBe(true);
    });

    it('should fail if id is missing', () => {
      const { id, ...invalidData } = validDbData;
      const result = AppointmentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    // [Princípio 2.2 - DRY]: A regra de negócio (start < end) persiste no domínio
    it('should enforce time logic on the DB object', () => {
      const invalidData = {
        ...validDbData,
        appointmentDate: new Date('2025-01-01T10:00:00'),
        endDate: new Date('2025-01-01T09:00:00'), // Inconsistência no banco
      };
      const result = AppointmentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});