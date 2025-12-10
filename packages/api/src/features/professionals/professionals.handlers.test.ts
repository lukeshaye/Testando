import { vi, describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { Context } from 'hono';
import { professionals } from '@db/schema'; // Mocked
import type { Variables } from '../../types';
import type { AuthUser } from '../../core/auth.adapter';
import {
  getProfessionals,
  getProfessionalById,
  createProfessional,
  updateProfessional,
  deleteProfessional
} from './professionals.handlers';

// ---------------------------------------------------------------------
// Mock dependencies - Estrutura Drizzle "Padrão Ouro"
// Simula o mapeamento camelCase (código) -> snake_case (banco)
// ---------------------------------------------------------------------
vi.mock('@db/schema', () => {
  const mockProfessionalsTable = {
    // Colunas mapeadas explicitamente conforme Passo 1
    id: { name: 'id', table: { name: 'professionals' } },
    userId: { name: 'user_id', table: { name: 'professionals' } },
    name: { name: 'name', table: { name: 'professionals' } },
    email: { name: 'email', table: { name: 'professionals' } },
    phone: { name: 'phone', table: { name: 'professionals' } },
    createdAt: { name: 'created_at', table: { name: 'professionals' } },
    updatedAt: { name: 'updated_at', table: { name: 'professionals' } },
  };
  return {
    professionals: mockProfessionalsTable
  };
});

// Mock drizzle-orm operators
vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('drizzle-orm')>();
  return {
    ...actual,
    eq: vi.fn((col, val) => {
      // Simula a geração de SQL usando o nome da coluna no banco (snake_case)
      const colName = typeof col === 'object' && col !== null && 'name' in col ? col.name : String(col);
      return `eq(${colName}, ${val})`;
    }),
    and: vi.fn((...args) => {
      const argStrings = args.map(arg => {
        if (typeof arg === 'string' && arg.startsWith('eq(')) {
          return arg;
        }
        return String(arg);
      });
      return `and(${argStrings.join(', ')})`;
    }),
  };
});

// ---------------------------------------------------------------------
// Mock Data (Sempre em camelCase no lado do JS)
// ---------------------------------------------------------------------
const mockUser: AuthUser = {
  id: 'user-123',
  email: 'test@example.com',
};

const mockProfessional = {
  id: 'prof-1',
  userId: 'user-123', // camelCase property
  name: 'Dr. Test',
  email: 'test@prof.com',
  phone: '123456789',
  createdAt: new Date('2024-01-01'), // Audit field
  updatedAt: new Date('2024-01-01'), // Audit field
};

const mockProfessionalsList = [mockProfessional];

// ---------------------------------------------------------------------
// Mocks for Drizzle Chain
// ---------------------------------------------------------------------
const mockReturning = vi.fn();
const mockWhere = vi.fn();

// update().set().where()
const mockSet = vi.fn(() => ({ where: mockWhere }));

// insert().values().returning()
const mockValues = vi.fn(() => ({ returning: mockReturning }));

// select().from().where()
const mockFrom = vi.fn(() => ({ where: mockWhere }));

// delete().where().returning()
const mockDeleteWhere = vi.fn(() => ({ returning: mockReturning }));
const mockDelete = vi.fn(() => ({ where: mockDeleteWhere }));

// Mock db client 
const mockDb = {
  select: vi.fn(() => ({ from: mockFrom })),
  insert: vi.fn(() => ({ values: mockValues })),
  update: vi.fn(() => ({ set: mockSet })),
  delete: vi.fn(mockDelete),
};

// Mocks for Hono context
const mockJson = vi.fn();
const mockReq = {
  param: vi.fn(),
  valid: vi.fn(),
};
let mockContext: any;

/**
 * Testes unitários para os handlers (Professionals).
 */
describe('professionals.handlers', () => {

  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 0, 1)); // Mock current time for updatedAt tests
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.clearAllMocks();

    mockContext = {
      var: {
        db: mockDb,
        user: mockUser,
      },
      json: mockJson,
      req: mockReq,
    } as unknown as Context<{ Variables: Variables }>;

    // Default responses
    mockWhere.mockResolvedValue(mockProfessionalsList); 
    mockReturning.mockResolvedValue([mockProfessional]); 
    mockDeleteWhere.mockResolvedValue({ returning: mockReturning });
  });

  it('getProfessionals should fetch professionals for the user', async () => {
    await getProfessionals(mockContext);

    expect(mockDb.select).toHaveBeenCalled();
    expect(mockFrom).toHaveBeenCalledWith(professionals);
    // Verifica se a query usou a coluna 'user_id' (snake_case) vinda do schema mapeado
    expect(mockWhere).toHaveBeenCalledWith(`eq(user_id, ${mockUser.id})`);
    expect(mockJson).toHaveBeenCalledWith(mockProfessionalsList);
  });

  it('getProfessionalById should fetch a specific professional', async () => {
    mockReq.param.mockReturnValue('prof-1');
    mockWhere.mockResolvedValue([mockProfessional]);

    await getProfessionalById(mockContext);

    expect(mockReq.param).toHaveBeenCalledWith('id');
    // Verifica 'id' e 'user_id' (snake_case)
    expect(mockWhere).toHaveBeenCalledWith(`and(eq(id, prof-1), eq(user_id, ${mockUser.id}))`);
    expect(mockJson).toHaveBeenCalledWith(mockProfessional);
  });

  it('getProfessionalById should return 404 if not found', async () => {
    mockReq.param.mockReturnValue('prof-999');
    mockWhere.mockResolvedValue([]); 

    await getProfessionalById(mockContext);

    expect(mockWhere).toHaveBeenCalled();
    expect(mockJson).toHaveBeenCalledWith({ error: 'Professional not found' }, 404);
  });

  it('createProfessional should create a new professional', async () => {
    const newProfessionalInput = { name: 'New Prof', email: 'new@prof.com', phone: '99999999' };
    mockReq.valid.mockReturnValue(newProfessionalInput);

    await createProfessional(mockContext);

    expect(mockReq.valid).toHaveBeenCalledWith('json');
    expect(mockDb.insert).toHaveBeenCalledWith(professionals);
    
    // Verifica se o objeto passado para values() está em camelCase (Passo 3)
    // O Drizzle cuidará da conversão para snake_case internamente baseado no schema
    expect(mockValues).toHaveBeenCalledWith({
      ...newProfessionalInput,
      userId: mockUser.id, // camelCase
    });
    
    expect(mockReturning).toHaveBeenCalled();
    expect(mockJson).toHaveBeenCalledWith(mockProfessional, 201);
  });

  it('updateProfessional should update an existing professional', async () => {
    const updates = { name: 'Updated Name' };
    mockReq.param.mockReturnValue('prof-1');
    mockReq.valid.mockReturnValue(updates);
    mockWhere.mockReturnValue({ returning: mockReturning }); 

    await updateProfessional(mockContext);

    expect(mockReq.param).toHaveBeenCalledWith('id');
    expect(mockReq.valid).toHaveBeenCalledWith('json');
    expect(mockDb.update).toHaveBeenCalledWith(professionals);
    
    // Verifica se o set() recebeu camelCase e incluiu updatedAt
    expect(mockSet).toHaveBeenCalledWith({
      ...updates,
      updatedAt: new Date(), // Deve usar camelCase aqui também
    });
    
    // O where clause deve usar as colunas mapeadas (snake_case)
    expect(mockWhere).toHaveBeenCalledWith(`and(eq(id, prof-1), eq(user_id, ${mockUser.id}))`);
    expect(mockReturning).toHaveBeenCalled();
    expect(mockJson).toHaveBeenCalledWith(mockProfessional);
  });

  it('deleteProfessional should delete a professional', async () => {
    mockReq.param.mockReturnValue('prof-1');
    
    mockDeleteWhere.mockReturnValue({ returning: mockReturning });
    mockDelete.mockReturnValue({ where: mockDeleteWhere });

    await deleteProfessional(mockContext);

    expect(mockReq.param).toHaveBeenCalledWith('id');
    expect(mockDb.delete).toHaveBeenCalledWith(professionals);
    
    // Verifica where clause com snake_case
    expect(mockDeleteWhere).toHaveBeenCalledWith(`and(eq(id, prof-1), eq(user_id, ${mockUser.id}))`);
    expect(mockReturning).toHaveBeenCalled();
    expect(mockJson).toHaveBeenCalledWith({ message: 'Professional deleted successfully' }, 200);
  });
});