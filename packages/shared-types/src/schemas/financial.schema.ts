import { z } from 'zod';

// Schema para criação (CreateFinancialEntrySchema)
// Aplicando validações de borda (DSpP 2.16)
export const CreateFinancialEntrySchema = z.object({
  description: z
    .string()
    .min(1, { message: 'A descrição é obrigatória.' }), // 
  amount: z
    .number()
    .positive({ message: 'O valor deve ser um número positivo.' }), // 
  type: z.enum(['receita', 'despesa']), // 
  entry_type: z.enum(['pontual', 'fixa']), // 
  entry_date: z.coerce.date({
    // (coerce é mais robusto para DSpP)
    errorMap: () => ({ message: 'Data inválida.' }),
  }),
});

// Schema completo (FinancialEntrySchema)
// Inclui campos gerenciados pelo banco de dados (ex: id, timestamps)
export const FinancialEntrySchema = CreateFinancialEntrySchema.extend({
  id: z.number().int().positive(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

// Exporta os tipos inferidos para uso em toda a aplicação
export type FinancialEntry = z.infer<typeof FinancialEntrySchema>;
export type CreateFinancialEntryInput = z.infer<
  typeof CreateFinancialEntrySchema
>;