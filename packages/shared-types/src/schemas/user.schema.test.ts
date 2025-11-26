import { describe, it, expect } from 'vitest/globals';
import { UserSchema } from './user.schema';

[cite_start]// [cite: 127] Como (PTE 2.15): Testar validação de uuid e email.
describe('UserSchema', () => {
  it('should validate a correct user object', () => {
    const validUser = {
      id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      email: 'user@example.com',
    };
    const result = UserSchema.safeParse(validUser);
    expect(result.success).toBe(true);
  });

  [cite_start]// [cite: 127] Testar validação de uuid
  it('should fail validation if id is not a valid uuid', () => {
    const invalidUser = {
      id: 'not-a-uuid',
      email: 'user@example.com',
    };
    const result = UserSchema.safeParse(invalidUser);
    expect(result.success).toBe(false);
    expect(result.error?.errors[0].message).toBe('Invalid uuid');
  });

  [cite_start]// [cite: 127] Testar validação de email
  it('should fail validation if email is invalid', () => {
    const invalidUser = {
      id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      email: 'invalid-email',
    };
    const result = UserSchema.safeParse(invalidUser);
    expect(result.success).toBe(false);
    expect(result.error?.errors[0].message).toBe('Invalid email');
  });

  it('should fail validation if email is missing', () => {
    const invalidUser = {
      id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    };
    const result = UserSchema.safeParse(invalidUser);
    expect(result.success).toBe(false);
  });
});