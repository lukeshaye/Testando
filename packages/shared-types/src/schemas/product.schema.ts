import { z } from 'zod';

/**
 * Schema para criação de um novo produto.
 * Não inclui 'id' pois é gerado pelo banco de dados.
 */
export const CreateProductSchema = z.object({
  name: z.string().min(1, { message: 'Nome é obrigatório' }),
  price: z.number().positive({ message: 'Preço deve ser um valor positivo' }),
  quantity: z
    .number()
    .int({ message: 'Quantidade deve ser um número inteiro' })
    .min(0, { message: 'Quantidade não pode ser negativa' }),
  image_url: z
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
 * Representa o objeto como ele existe no banco de dados.
 */
export const ProductSchema = CreateProductSchema.extend({
  id: z.number().int().positive(),
});

// Tipos inferidos para uso no frontend e backend
export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type Product = z.infer<typeof ProductSchema>;