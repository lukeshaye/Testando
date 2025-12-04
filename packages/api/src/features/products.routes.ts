/**
 * @file /packages/api/src/features/products/products.routes.ts
 * @overview Definição de rotas Hono para a feature 'products'.
 * @description Este arquivo é responsável apenas pelo roteamento[cite: 101].
 *
 * @see - Arquivo: /packages/api/src/features/clients/clients.routes.ts (Usado como Templo)
 * @see - De Onde: Rotas de src/worker/index.ts.
 * @see - O Quê: Definir rotas Hono para a feature.
 * @see - Features: appointments, clients, financial, products...
 * @see - Arquivos: *.routes.ts.
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware } from '../../core/auth'; // [cite: 102]
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from './products.handlers'; // [cite: 104]

// NOTA: Os schemas Zod vêm do Módulo 1[cite: 8, 103].
// O caminho de importação exato depende da estrutura final do monorepo (ex: @salonflow/schemas).
// Usando um caminho de placeholder relativo assumido.
import {
  CreateProductSchema,
  UpdateProductSchema,
} from '../../schemas/product.schema';

const productsRoutes = new Hono();

// Aplicar o middleware de autenticação a todas as rotas de produtos [cite: 102]
productsRoutes.use('*', authMiddleware);

// Rotas da API
productsRoutes.get('/', getProducts);

productsRoutes.post(
  '/',
zValidator('json', CreateProductSchema), // [cite: 103]
  createProduct
);

productsRoutes.get('/:id', getProductById);

productsRoutes.put(
  '/:id',
zValidator('json', UpdateProductSchema), // [cite: 103]
  updateProduct
);

productsRoutes.delete('/:id', deleteProduct);

export { productsRoutes };