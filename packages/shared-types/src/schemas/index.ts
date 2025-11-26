import { z } from 'zod';
// Exportar todos os schemas
export * from './appointment.schema';
export * from './auth.schema';
export * from './client.schema';
export * from './financial.schema';
export * from './product.schema';
export * from './professional.schema';
export * from './service.schema';
export * from './settings.schema';
export * from './user.schema';

// NOTA: Exportar tipos inferidos (exemplo para Client)
// (Fazer isso dentro de cada arquivo de schema individual é melhor para SoC)
// Exemplo em client.schema.ts:
// export const ClientSchema = z.object(...);
// export type Client = z.infer<typeof ClientSchema>;