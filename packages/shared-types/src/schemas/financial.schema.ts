import { z } from 'zod';

// Schema para criação (CreateFinancialEntrySchema)
// Aplicando validações de borda (DSpP 2.16 - Design Seguro por Padrão)
export const CreateFinancialEntrySchema = z.object({
  description: z
    .string()
    .min(1, { message: 'A descrição é obrigatória.' }), 
  amount: z
    .number()
    .positive({ message: 'O valor deve ser um número positivo.' }), 
  type: z.enum(['receita', 'despesa']), 
  // Refatorado para camelCase (Passo 2: O Contrato)
  entryType: z.enum(['pontual', 'fixa']), 
  // Refatorado para camelCase e mantendo coerção robusta
  entryDate: z.coerce.date({
    errorMap: () => ({ message: 'Data inválida.' }),
  }),
});

// Schema completo (FinancialEntrySchema)
// Inclui campos gerenciados pelo banco de dados (ex: id, timestamps)
export const FinancialEntrySchema = CreateFinancialEntrySchema.extend({
  id: z.number().int().positive(),
  // Refatorado para camelCase (Audit fields)
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// Exporta os tipos inferidos para uso em toda a aplicação
// Centraliza o conhecimento (DRY 2.2) [cite: 18]
export type FinancialEntry = z.infer<typeof FinancialEntrySchema>;
export type CreateFinancialEntryInput = z.infer<
  typeof CreateFinancialEntrySchema
>;