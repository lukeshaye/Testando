import { Context } from 'hono';
import { eq, and } from 'drizzle-orm';
import { Variables } from '../types';
import { professionals } from '@db/schema'; // Assumido do Módulo 2
import { 
  CreateProfessionalSchema, 
  UpdateProfessionalSchema 
} from '@shared/types'; // Assumido do Módulo 1

type Professional = typeof professionals.$inferSelect;

/**
 * (Handler) Busca todos os profissionais do usuário logado.
 * Aplica RLS (Tenancy) baseado no c.var.user.id.
 * 
 */
export const getProfessionals = async (c: Context<{ Variables: Variables }>) => {
  const user = c.var.user; 
  
  try {
    const data = await c.var.db.select().from(professionals) 
      .where(eq(professionals.userId, user.id)); 
    
    return c.json(data); 
  } catch (error) {
    console.error(error);
    return c.json({ error: 'Failed to fetch professionals' }, 500);
  }
};

/**
 * (Handler) Busca um profissional específico pelo ID.
 * Aplica RLS (Tenancy) garantindo que o profissional pertença ao usuário logado.
 * 
 */
export const getProfessionalById = async (c: Context<{ Variables: Variables }>) => {
  const user = c.var.user;
  const id = c.req.param('id');

  try {
    const data = await c.var.db.select().from(professionals) 
      .where(
        and(
          eq(professionals.id, id),
          eq(professionals.userId, user.id) 
        )
      );

    if (data.length === 0) {
      return c.json({ error: 'Professional not found' }, 404);
    }
    return c.json(data[0]);
  } catch (error) {
    console.error(error);
    return c.json({ error: 'Failed to fetch professional' }, 500);
  }
};

/**
 * (Handler) Cria um novo profissional.
 * Associa o novo profissional ao usuário logado (c.var.user.id).
 * 
 */
export const createProfessional = async (c: Context<{ Variables: Variables }>) => {
  // O tipo é inferido pelo zValidator aplicado na rota 
  const newProfessional = c.req.valid('json') as typeof CreateProfessionalSchema._type;
  const user = c.var.user; 

  try {
    const data = await c.var.db.insert(professionals) 
      .values({
        ...newProfessional,
        userId: user.id, 
      })
      .returning(); 
      
    return c.json(data[0], 201); 
  } catch (error) {
    console.error(error);
    return c.json({ error: 'Failed to create professional' }, 500);
  }
};

/**
 * (Handler) Atualiza um profissional existente.
 * Aplica RLS (Tenancy) garantindo que o profissional pertença ao usuário logado.
 * 
 */
export const updateProfessional = async (c: Context<{ Variables: Variables }>) => {
  const id = c.req.param('id');
  // O tipo é inferido pelo zValidator aplicado na rota 
  const updatedValues = c.req.valid('json') as typeof UpdateProfessionalSchema._type;
  const user = c.var.user;

  try {
    const data = await c.var.db.update(professionals) 
      .set({
        ...updatedValues,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(professionals.id, id),
          eq(professionals.userId, user.id) 
        )
      )
      .returning();

    if (data.length === 0) {
      return c.json({ error: 'Professional not found' }, 404);
    }
    return c.json(data[0]);
  } catch (error) {
    console.error(error);
    return c.json({ error: 'Failed to update professional' }, 500);
  }
};

/**
 * (Handler) Exclui um profissional.
 * Aplica RLS (Tenancy) garantindo que o profissional pertença ao usuário logado.
 * 
 */
export const deleteProfessional = async (c: Context<{ Variables: Variables }>) => {
  const id = c.req.param('id');
  const user = c.var.user;

  try {
    const data = await c.var.db.delete(professionals) 
      .where(
        and(
          eq(professionals.id, id),
          eq(professionals.userId, user.id) 
        )
      )
      .returning();

    if (data.length === 0) {
      return c.json({ error: 'Professional not found' }, 404);
    }
    return c.json({ message: 'Professional deleted successfully' }, 200);
  } catch (error) {
    console.error(error);
    return c.json({ error: 'Failed to delete professional' }, 500);
  }
};