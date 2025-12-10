import { z } from 'zod';

/**
 * Schema para criação de um novo serviço.
 * Não inclui 'id' nem campos de auditoria pois são gerados pelo banco.
 * Segue o Princípio 2.2 (DRY) centralizando as regras de validação.
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
  // Se no futuro for necessário adicionar 'commission_rate', 
  // deve ser adicionado aqui como 'commissionRate' (camelCase).
});

/**
 * Schema completo do serviço, incluindo 'id' e auditoria.
 * Representa o objeto como ele existe no banco de dados, mas com chaves em camelCase.
 * Alinhado com o Passo 1 (Colunas de Auditoria).
 */
export const ServiceSchema = CreateServiceSchema.extend({
  id: z.number().int().positive(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Tipos inferidos para uso no frontend e backend
export type CreateServiceInput = z.infer<typeof CreateServiceSchema>;
export type Service = z.infer<typeof ServiceSchema>;