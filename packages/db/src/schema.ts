import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  boolean,
  pgEnum,
  date,
  time,
  numeric,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// --- ENUMS ---
export const financialTypeEnum = pgEnum('financial_type', ['receita', 'despesa']);
export const financialEntryTypeEnum = pgEnum('financial_entry_type', [
  'pontual',
  'fixa',
]);
export const genderEnum = pgEnum('gender', ['masculino', 'feminino', 'outro']);

// --- TABELA DE AUTENTICAÇÃO (Externa / Supabase) ---
export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey(),
  },
  (table) => {
    return {
      schema: 'auth',
    };
  },
);

// --- TABELAS PRINCIPAIS ---

// Tabela de Clientes
export const clients = pgTable(
  'clients',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    phone: text('phone'),
    email: text('email'),
    notes: text('notes'),
    birthDate: date('birth_date'),
    gender: genderEnum('gender'),
    
    // Auditoria
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('clients_user_id_idx').on(table.userId),
  }),
);

// Tabela de Profissionais
export const professionals = pgTable(
  'professionals',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    color: text('color'),
    salary: integer('salary'), // em centavos
    commissionRate: numeric('commission_rate'),
    workStartTime: time('work_start_time'),
    workEndTime: time('work_end_time'),
    lunchStartTime: time('lunch_start_time'),
    lunchEndTime: time('lunch_end_time'),

    // Auditoria
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('professionals_user_id_idx').on(table.userId),
  }),
);

// Tabela de Serviços
export const services = pgTable(
  'services',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    price: integer('price').notNull(), // em centavos
    duration: integer('duration').notNull(), // em minutos
    color: text('color'),

    // Auditoria
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('services_user_id_idx').on(table.userId),
  }),
);

// Tabela de Produtos
export const products = pgTable(
  'products',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    price: integer('price').notNull(), // em centavos
    quantity: integer('quantity').notNull(),
    imageUrl: text('image_url'),

    // Auditoria
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('products_user_id_idx').on(table.userId),
  }),
);

// Tabela de Agendamentos
export const appointments = pgTable(
  'appointments',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    clientId: integer('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'set null' }),
    professionalId: integer('professional_id')
      .notNull()
      .references(() => professionals.id, { onDelete: 'set null' }),
    serviceId: integer('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'set null' }),
    
    price: integer('price').notNull(), // em centavos
    appointmentDate: timestamp('appointment_date', { withTimezone: true }).notNull(),
    endDate: timestamp('end_date', { withTimezone: true }).notNull(),
    attended: boolean('attended').default(false),

    // Auditoria
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('appointments_user_id_idx').on(table.userId),
    clientIdIdx: index('appointments_client_id_idx').on(table.clientId),
    professionalIdIdx: index('appointments_professional_id_idx').on(table.professionalId),
    serviceIdIdx: index('appointments_service_id_idx').on(table.serviceId),
  }),
);

// Tabela de Lançamentos Financeiros
export const financialEntries = pgTable(
  'financial_entries',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    description: text('description').notNull(),
    amount: integer('amount').notNull(), // em centavos
    type: financialTypeEnum('type').notNull(),
    entryType: financialEntryTypeEnum('entry_type').notNull(),
    entryDate: date('entry_date').notNull(),
    appointmentId: integer('appointment_id').references(() => appointments.id, {
      onDelete: 'set null',
    }),

    // Auditoria
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('financial_entries_user_id_idx').on(table.userId),
    appointmentIdIdx: index('financial_entries_appointment_id_idx').on(table.appointmentId),
  }),
);

// --- TABELAS DE CONFIGURAÇÃO ---

// Configurações do Negócio
export const businessSettings = pgTable('business_settings', {
  id: serial('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  workStartTime: time('work_start_time'),
  workEndTime: time('work_end_time'),
  lunchStartTime: time('lunch_start_time'),
  lunchEndTime: time('lunch_end_time'),

  // Auditoria
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Exceções do Negócio
export const businessExceptions = pgTable('business_exceptions', {
  id: serial('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  exceptionDate: date('exception_date').notNull(),
  workStartTime: time('work_start_time'),
  workEndTime: time('work_end_time'),
  lunchStartTime: time('lunch_start_time'),
  lunchEndTime: time('lunch_end_time'),
  isClosed: boolean('is_closed').default(false),

  // Auditoria
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Horários Padrão dos Profissionais
export const professionalSchedules = pgTable('professional_schedules', {
  id: serial('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  professionalId: integer('professional_id')
    .notNull()
    .references(() => professionals.id, { onDelete: 'cascade' }),
  dayOfWeek: integer('day_of_week').notNull(), // 0 = Domingo, 1 = Segunda...
  workStartTime: time('work_start_time'),
  workEndTime: time('work_end_time'),
  lunchStartTime: time('lunch_start_time'),
  lunchEndTime: time('lunch_end_time'),

  // Auditoria
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Exceções de Horário dos Profissionais
export const professionalExceptions = pgTable('professional_exceptions', {
  id: serial('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  professionalId: integer('professional_id')
    .notNull()
    .references(() => professionals.id, { onDelete: 'cascade' }),
  exceptionDate: date('exception_date').notNull(),
  workStartTime: time('work_start_time'),
  workEndTime: time('work_end_time'),
  lunchStartTime: time('lunch_start_time'),
  lunchEndTime: time('lunch_end_time'),
  isOff: boolean('is_off').default(false),

  // Auditoria
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Ausências/Férias dos Profissionais
export const professionalAbsences = pgTable('professional_absences', {
  id: serial('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  professionalId: integer('professional_id')
    .notNull()
    .references(() => professionals.id, { onDelete: 'cascade' }),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  reason: text('reason'),

  // Auditoria
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// --- RELAÇÕES (DRIZZLE) ---

export const clientsRelations = relations(clients, ({ many }) => ({
  appointments: many(appointments),
}));

export const professionalsRelations = relations(
  professionals,
  ({ many }) => ({
    appointments: many(appointments),
    schedules: many(professionalSchedules),
    exceptions: many(professionalExceptions),
    absences: many(professionalAbsences),
  }),
);

export const servicesRelations = relations(services, ({ many }) => ({
  appointments: many(appointments),
}));

export const appointmentsRelations = relations(
  appointments,
  ({ one, many }) => ({
    client: one(clients, {
      fields: [appointments.clientId],
      references: [clients.id],
    }),
    professional: one(professionals, {
      fields: [appointments.professionalId],
      references: [professionals.id],
    }),
    service: one(services, {
      fields: [appointments.serviceId],
      references: [services.id],
    }),
    financialEntries: many(financialEntries),
  }),
);

export const financialEntriesRelations = relations(
  financialEntries,
  ({ one }) => ({
    appointment: one(appointments, {
      fields: [financialEntries.appointmentId],
      references: [appointments.id],
    }),
  }),
);

export const professionalSchedulesRelations = relations(
  professionalSchedules,
  ({ one }) => ({
    professional: one(professionals, {
      fields: [professionalSchedules.professionalId],
      references: [professionals.id],
    }),
  }),
);

export const professionalExceptionsRelations = relations(
  professionalExceptions,
  ({ one }) => ({
    professional: one(professionals, {
      fields: [professionalExceptions.professionalId],
      references: [professionals.id],
    }),
  }),
);

export const professionalAbsencesRelations = relations(
  professionalAbsences,
  ({ one }) => ({
    professional: one(professionals, {
      fields: [professionalAbsences.professionalId],
      references: [professionals.id],
    }),
  }),
);