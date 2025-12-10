import { describe, it, expect } from 'vitest';
import { UserSchema } from './user.schema';

describe('UserSchema', () => {
  it('should validate a correct user object', () => {
    const validUser = {
      // CamelCase obrigatório (Passo 2 do plano)
      id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      email: 'user@example.com',
      
      // Colunas de auditoria obrigatórias (Passo 1 do plano)
      // Necessário para cumprir o contrato completo do banco de dados
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const result = UserSchema.safeParse(validUser);
    expect(result.success).toBe(true);
  });

  it('should fail validation if id is not a valid uuid', () => {
    const invalidUser = {
      id: 'not-a-uuid',
      email: 'user@example.com',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = UserSchema.safeParse(invalidUser);
    expect(result.success).toBe(false);
    expect(result.error?.errors[0].message).toBe('Invalid uuid');
  });

  it('should fail validation if email is invalid', () => {
    const invalidUser = {
      id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      email: 'invalid-email',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = UserSchema.safeParse(invalidUser);
    expect(result.success).toBe(false);
    expect(result.error?.errors[0].message).toBe('Invalid email');
  });

  it('should fail validation if email is missing', () => {
    const invalidUser = {
      id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      // email is missing
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = UserSchema.safeParse(invalidUser);
    expect(result.success).toBe(false);
  });
});