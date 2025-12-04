import { z } from 'zod';

/**
 * Schema para criação de um novo serviço.
 * Não inclui 'id' pois é gerado pelo banco de dados.
 */
export const CreateServiceSchema = z.object({
  name: z.string().min(1, { message: 'Nome é obrigatório' }),
  price: z.number().positive({ message: 'Preço deve ser um valor positivo' }),
  duration: z
    .number()
    .int({ message: 'Duração deve ser um número inteiro em minutos' })
    .positive({ message: 'Duração deve ser um valor positivo' }),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, {
      message: 'Cor deve estar no formato hexadecimal (ex: #FFFFFF)',
    }),
  // commission_rate não foi especificado no plano para este schema
});

/**
 * Schema completo do serviço, incluindo 'id'.
 * Representa o objeto como ele existe no banco de dados.
 */
export const ServiceSchema = CreateServiceSchema.extend({
  id: z.number().int().positive(),
});

// Tipos inferidos para uso no frontend e backend
export type CreateServiceInput = z.infer<typeof CreateServiceSchema>;
export type Service = z.infer<typeof ServiceSchema>;