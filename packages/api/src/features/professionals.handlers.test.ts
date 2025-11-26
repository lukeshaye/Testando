import { vi, describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { Context } from 'hono';
import { eq, and } from 'drizzle-orm';
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

// Mock dependencies
vi.mock('@db/schema', () => ({
  professionals: 'professionals_table_mock'
}));

// Mock drizzle-orm operators to verify calls
vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('drizzle-orm')>();
  return {
    ...actual,
    eq: vi.fn((col, val) => `eq(${col}, ${val})`),
    and: vi.fn((...args) => `and(${args.join(', ')})`),
  };
});

// Mock data
const mockUser: AuthUser = {
  id: 'user-123',
  email: 'test@example.com',
};

const mockProfessional = {
  id: 'prof-1',
  userId: 'user-123',
  name: 'Dr. Test',
  email: 'test@prof.com',
  phone: '123456789',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockProfessionalsList = [mockProfessional];

// Mocks for Drizzle chain 
const mockReturning = vi.fn();
const mockWhere = vi.fn();
// update().set().where()
const mockSet = vi.fn(() => ({ where: mockWhere }));
// insert().values().returning()
const mockValues = vi.fn(() => ({ returning: mockReturning }));
// select().from().where()
const mockFrom = vi.fn(() => ({ where: mockWhere }));
// delete().where().returning() (handler adds returning)
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
 * Testes unitários para os handlers.
 */
describe('professionals.handlers', () => {

  // Use fake timers to control 'new Date()' for update tests
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 0, 1));
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Reset context
    mockContext = {
      var: {
        db: mockDb, // 
        user: mockUser, // 
      },
      json: mockJson,
      req: mockReq,
    } as unknown as Context<{ Variables: Variables }>;

    // Reset mock implementations
    mockWhere.mockResolvedValue(mockProfessionalsList); // Default for GET
    mockReturning.mockResolvedValue([mockProfessional]); // Default for C/U/D
    mockDeleteWhere.mockResolvedValue({ returning: mockReturning }); // Default for Delete
  });

  it('getProfessionals should fetch professionals for the user', async () => {
    await getProfessionals(mockContext);

    expect(mockDb.select).toHaveBeenCalled(); // 
    expect(mockFrom).toHaveBeenCalledWith(professionals);
    expect(mockWhere).toHaveBeenCalledWith(`eq(professionals_table_mock.userId, ${mockUser.id})`);
    expect(mockJson).toHaveBeenCalledWith(mockProfessionalsList);
  });

  it('getProfessionalById should fetch a specific professional', async () => {
    mockReq.param.mockReturnValue('prof-1');
    mockWhere.mockResolvedValue([mockProfessional]);

    await getProfessionalById(mockContext);

    expect(mockReq.param).toHaveBeenCalledWith('id');
    expect(mockWhere).toHaveBeenCalledWith(`and(eq(professionals_table_mock.id, prof-1), eq(professionals_table_mock.userId, ${mockUser.id}))`);
    expect(mockJson).toHaveBeenCalledWith(mockProfessional);
  });

  it('getProfessionalById should return 404 if not found', async () => {
    mockReq.param.mockReturnValue('prof-999');
    mockWhere.mockResolvedValue([]); // Not found

    await getProfessionalById(mockContext);

    expect(mockWhere).toHaveBeenCalled();
    expect(mockJson).toHaveBeenCalledWith({ error: 'Professional not found' }, 404);
  });

  it('createProfessional should create a new professional', async () => {
    const newProfessionalInput = { name: 'New Prof', email: 'new@prof.com' };
    mockReq.valid.mockReturnValue(newProfessionalInput);

    await createProfessional(mockContext);

    expect(mockReq.valid).toHaveBeenCalledWith('json');
    expect(mockDb.insert).toHaveBeenCalledWith(professionals); // 
    expect(mockValues).toHaveBeenCalledWith({
      ...newProfessionalInput,
      userId: mockUser.id,
    });
    expect(mockReturning).toHaveBeenCalled();
    expect(mockJson).toHaveBeenCalledWith(mockProfessional, 201);
  });

  it('updateProfessional should update an existing professional', async () => {
    const updates = { name: 'Updated Name' };
    mockReq.param.mockReturnValue('prof-1');
    mockReq.valid.mockReturnValue(updates);
    mockWhere.mockReturnValue({ returning: mockReturning }); // update().set().where().returning()

    await updateProfessional(mockContext);

    expect(mockReq.param).toHaveBeenCalledWith('id');
    expect(mockReq.valid).toHaveBeenCalledWith('json');
    expect(mockDb.update).toHaveBeenCalledWith(professionals);
    expect(mockSet).toHaveBeenCalledWith({
      ...updates,
      updatedAt: new Date(), // Uses fake timer
    });
    expect(mockWhere).toHaveBeenCalledWith(`and(eq(professionals_table_mock.id, prof-1), eq(professionals_table_mock.userId, ${mockUser.id}))`);
    expect(mockReturning).toHaveBeenCalled();
    expect(mockJson).toHaveBeenCalledWith(mockProfessional);
  });

  it('deleteProfessional should delete a professional', async () => {
    mockReq.param.mockReturnValue('prof-1');
    
    // Configura o mock para a cadeia delete().where().returning()
    mockDeleteWhere.mockReturnValue({ returning: mockReturning });
    mockDelete.mockReturnValue({ where: mockDeleteWhere });

    await deleteProfessional(mockContext);

    expect(mockReq.param).toHaveBeenCalledWith('id');
    expect(mockDb.delete).toHaveBeenCalledWith(professionals);
    expect(mockDeleteWhere).toHaveBeenCalledWith(`and(eq(professionals_table_mock.id, prof-1), eq(professionals_table_mock.userId, ${mockUser.id}))`);
    expect(mockReturning).toHaveBeenCalled();
    expect(mockJson).toHaveBeenCalledWith({ message: 'Professional deleted successfully' }, 200);
  });
});