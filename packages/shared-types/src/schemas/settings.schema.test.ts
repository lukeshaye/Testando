import { describe, it, expect } from 'vitest'
import {
  BusinessHoursSchema,
  BusinessExceptionSchema,
} from './settings.schema'

describe('BusinessHoursSchema', () => {
  // Refatorado para camelCase conforme Passo 2 do plano
  const validBusinessHour = {
    id: 1,
    dayOfWeek: 1, // Anteriormente: day_of_week
    startTime: '09:00', // Anteriormente: start_time
    endTime: '18:00',   // Anteriormente: end_time
    companyId: 'uuid-company-1', // Anteriormente: company_id
  }

  it('should validate a correct business hour entry', () => {
    const result = BusinessHoursSchema.safeParse(validBusinessHour)
    expect(result.success).toBe(true)
  })

  it('should accept null startTime and endTime', () => {
    const result = BusinessHoursSchema.safeParse({
      ...validBusinessHour,
      startTime: null,
      endTime: null,
    })
    expect(result.success).toBe(true)
  })

  it('should fail if dayOfWeek is less than 0', () => {
    const result = BusinessHoursSchema.safeParse({
      ...validBusinessHour,
      dayOfWeek: -1,
    })
    expect(result.success).toBe(false)
    expect(result.error.issues[0].message).toContain('mínimo 0')
  })

  it('should fail if dayOfWeek is greater than 6', () => {
    const result = BusinessHoursSchema.safeParse({
      ...validBusinessHour,
      dayOfWeek: 7,
    })
    expect(result.success).toBe(false)
    expect(result.error.issues[0].message).toContain('máximo 6')
  })

  it('should fail if startTime has invalid time format (regex)', () => {
    const result = BusinessHoursSchema.safeParse({
      ...validBusinessHour,
      startTime: '25:00',
    })
    expect(result.success).toBe(false)
    expect(result.error.issues[0].message).toContain('Formato HH:MM inválido')
  })

  it('should fail if endTime has invalid time format (regex)', () => {
    const result = BusinessHoursSchema.safeParse({
      ...validBusinessHour,
      endTime: '18:60',
    })
    expect(result.success).toBe(false)
    expect(result.error.issues[0].message).toContain('Formato HH:MM inválido')
  })
})

describe('BusinessExceptionSchema', () => {
  // Refatorado para camelCase conforme Passo 2 do plano
  const validException = {
    id: 1,
    exceptionDate: '2025-12-25', // Anteriormente: exception_date
    description: 'Natal',
    startTime: '10:00', // Anteriormente: start_time
    endTime: '14:00',   // Anteriormente: end_time
    companyId: 'uuid-company-1', // Anteriormente: company_id
  }

  it('should validate a correct business exception entry', () => {
    const result = BusinessExceptionSchema.safeParse(validException)
    expect(result.success).toBe(true)
  })

  it('should fail if exceptionDate is not a valid date string', () => {
    const result = BusinessExceptionSchema.safeParse({
      ...validException,
      exceptionDate: '2025-13-01', // Mês inválido
    })
    expect(result.success).toBe(false)
    expect(result.error.issues[0].message).toContain('Data inválida')
  })

  it('should fail if description is empty', () => {
    const result = BusinessExceptionSchema.safeParse({
      ...validException,
      description: '',
    })
    expect(result.success).toBe(false)
    expect(result.error.issues[0].message).toContain('Descrição é obrigatória')
  })

  it('should fail if startTime has invalid time format (regex)', () => {
    const result = BusinessExceptionSchema.safeParse({
      ...validException,
      startTime: 'abc',
    })
    expect(result.success).toBe(false)
    expect(result.error.issues[0].message).toContain('Formato HH:MM inválido')
  })

  it('should fail if endTime has invalid time format (regex)', () => {
    const result = BusinessExceptionSchema.safeParse({
      ...validException,
      endTime: '09:99',
    })
    expect(result.success).toBe(false)
    expect(result.error.issues[0].message).toContain('Formato HH:MM inválido')
  })
})