/**
 * @file /packages/api/src/features/products/products.handlers.ts
 * @overview Handlers da feature 'products', responsáveis pela lógica de negócios.
 * @description Implementação CRUD seguindo o padrão ouro:
 * - Banco: snake_case (gerenciado pelo Drizzle Schema)
 * - Código: camelCase (Zod e TypeScript)
 * - Tenancy: Obrigatório em todas as operações via user.id
 */

import { Context } from 'hono';
import { eq, and } from 'drizzle-orm'; // Importado 'and' para queries compostas seguras
import { Variables } from '../../types';
import { products } from '@db/schema'; 

type HandlerContext = Context<{ Variables: Variables }>;

/**
 * Handler para buscar todos os produtos do usuário logado.
 */
export const getProducts = async (c: HandlerContext) => {
  const user = c.var.user;
  
  // O Drizzle retornará as chaves em camelCase automaticamente
  // se o schema.ts (Passo 1) estiver configurado com alias.
  const data = await c.var.db.select()
    .from(products)
    .where(eq(products.userId, user.id)); // Tenancy enforcement

  return c.json(data);
};

/**
 * Handler para buscar um produto específico pelo ID.
 */
export const getProductById = async (c: HandlerContext) => {
  const user = c.var.user;
  const { id } = c.req.param();

  const data = await c.var.db.select()
    .from(products)
    // USO CORRETO: 'and()' em vez de '&&' para gerar SQL válido
    .where(and(
      eq(products.id, id),
      eq(products.userId, user.id)
    ))
    .limit(1);

  if (!data.length) {
    return c.json({ error: 'Product not found' }, 404);
  }
  return c.json(data[0]);
};

/**
 * Handler para criar um novo produto.
 * @description Recebe camelCase do Zod e passa direto para o Drizzle.
 */
export const createProduct = async (c: HandlerContext) => {
  // 'newProduct' já vem em camelCase graças ao schema Zod (Passo 2)
  const newProduct = c.req.valid('json'); 
  const user = c.var.user;

  const data = await c.var.db.insert(products)
    .values({
      ...newProduct,
      userId: user.id // Garante que o produto pertença ao usuário logado
    })
    .returning();

  return c.json(data[0], 201);
};

/**
 * Handler para atualizar um produto existente.
 */
export const updateProduct = async (c: HandlerContext) => {
  const user = c.var.user;
  const { id } = c.req.param();
  // 'updatedValues' em camelCase (ex: { stockQuantity: 10 })
  const updatedValues = c.req.valid('json'); 

  const data = await c.var.db.update(products)
    .set(updatedValues) // Drizzle mapeia automaticamente para snake_case no banco
    .where(and(
      eq(products.id, id),
      eq(products.userId, user.id)
    ))
    .returning();

  if (!data.length) {
    return c.json({ error: 'Product not found' }, 404);
  }
  return c.json(data[0]);
};

/**
 * Handler para deletar um produto.
 */
export const deleteProduct = async (c: HandlerContext) => {
  const user = c.var.user;
  const { id } = c.req.param();

  const data = await c.var.db.delete(products)
    .where(and(
      eq(products.id, id),
      eq(products.userId, user.id)
    ))
    .returning();

  if (!data.length) {
    return c.json({ error: 'Product not found' }, 404);
  }
  return c.json({ message: 'Product deleted successfully' });
};