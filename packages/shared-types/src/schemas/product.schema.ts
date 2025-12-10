import { z } from 'zod';

/**
 * Schema para criação de um novo produto.
 * Não inclui 'id' pois é gerado pelo banco de dados.
 * Refatoração Passo 2: Campos convertidos para camelCase (image_url -> imageUrl).
 */
export const CreateProductSchema = z.object({
  name: z.string().min(1, { message: 'Nome é obrigatório' }),
  price: z.number().positive({ message: 'Preço deve ser um valor positivo' }),
  quantity: z
    .number()
    .int({ message: 'Quantidade deve ser um número inteiro' })
    .min(0, { message: 'Quantidade não pode ser negativa' }),
  imageUrl: z // Alterado de image_url para imageUrl para seguir o padrão camelCase no código
    .union([
      z.literal(''),
      z.string().url({ message: 'URL da imagem inválida' }).refine(
        (val) => /^https?:\/\//.test(val),
        { message: 'URL da imagem inválida' }
      ),
    ]),
});

/**
 * Schema completo do produto, incluindo 'id'.
 * Representa o objeto como ele trafega na aplicação (Backend <-> Frontend).
 */
export const ProductSchema = CreateProductSchema.extend({
  id: z.number().int().positive(),
  // Opcional: Se você adicionou createdAt/updatedAt no Passo 1 (DB),
  // é recomendável adicioná-los aqui também para tipagem completa.
  // createdAt: z.date().optional(),
  // updatedAt: z.date().optional(),
});

// Tipos inferidos para uso no frontend e backend
export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type Product = z.infer<typeof ProductSchema>;