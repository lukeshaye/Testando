/**
 * @file /packages/api/src/features/products/products.handlers.ts
 * @overview Handlers da feature 'products', responsáveis pela lógica de negócios.
 * @description Esta é a implementação da lógica de CRUD para produtos,
 * migrada de 'src/shared/store.ts' para o backend.
 *
 * @see - Arquivo: /packages/api/src/features/clients/clients.handlers.ts (Usado como Templo)
 * @see - Features: appointments, clients, financial, products...
 * @see - De Onde: Lógica de src/shared/store.ts e src/worker/index.ts.
 * @see - Como: Todos os handlers devem usar sintaxe Drizzle (c.var.db) e aplicar user_id.
 */

import { Context } from 'hono';
import { eq } from 'drizzle-orm';
import { Variables } from '../../types';
import { products } from '@db/schema'; // Assumindo que o schema do Módulo 2 está em 'db/schema'

type HandlerContext = Context<{ Variables: Variables }>;

/**
 * Handler para buscar todos os produtos do usuário logado.
 * @see (Padrão getClients)
 */
export const getProducts = async (c: HandlerContext) => {
  const user = c.var.user; // 
  const data = await c.var.db.select() // 
    .from(products)
    .where(eq(products.userId, user.id)); // (Aplicação de Tenancy)

  return c.json(data); // 
};

/**
 * Handler para buscar um produto específico pelo ID.
 */
export const getProductById = async (c: HandlerContext) => {
  const user = c.var.user;
  const { id } = c.req.param();

  const data = await c.var.db.select()
    .from(products)
    .where(eq(products.id, id) && eq(products.userId, user.id)) // 
    .limit(1);

  if (!data.length) {
    return c.json({ error: 'Product not found' }, 404);
  }
  return c.json(data[0]);
};

/**
 * Handler para criar um novo produto.
 * @see (Padrão createClient)
 */
export const createProduct = async (c: HandlerContext) => {
  const newProduct = c.req.valid('json'); // 
  const user = c.var.user; // 

  const data = await c.var.db.insert(products) // 
    .values({
      ...newProduct,
      userId: user.id // (Aplicação de Tenancy)
    })
    .returning(); // 

  return c.json(data[0], 201); // 
};

/**
 * Handler para atualizar um produto existente.
 */
export const updateProduct = async (c: HandlerContext) => {
  const user = c.var.user;
  const { id } = c.req.param();
  const updatedValues = c.req.valid('json');

  const data = await c.var.db.update(products)
    .set(updatedValues)
    .where(eq(products.id, id) && eq(products.userId, user.id)) // 
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
    .where(eq(products.id, id) && eq(products.userId, user.id)) // 
    .returning();

  if (!data.length) {
    return c.json({ error: 'Product not found' }, 404);
  }
  return c.json({ message: 'Product deleted successfully' });
};