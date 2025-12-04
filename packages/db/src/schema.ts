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
  relations,
  primaryKey,
  foreignKey,
  index,
} from 'drizzle-orm/pg-core';
import { relations as drizzleRelations } from 'drizzle-orm';

// --- ENUMS ---
// [cite: 57]
export const financialTypeEnum = pgEnum('financial_type', ['receita', 'despesa']);
// [cite: 57]
export const financialEntryTypeEnum = pgEnum('financial_entry_type', [
  'pontual',
  'fixa',
]);
// [cite: 52]
export const genderEnum = pgEnum('gender', ['masculino', 'feminino', 'outro']);

// --- TABELA DE AUTENTICAÇÃO (Externa) ---
// [cite: 51]
// Definindo a tabela auth.users para que possamos referenciá-la em chaves estrangeiras.
export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey(),
    // ... outros campos do auth.users se necessário para consulta, mas o ID é o suficiente para FKs
  },
  (table) => {
    return {
      schema: 'auth',
    };
  },
);

// --- TABELAS PRINCIPAIS ---

// Tabela de Clientes [cite: 52]
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
  },
  (table) => ({
    userIdx: index('clients_user_id_idx').on(table.userId),
  }),
);

// Tabela de Profissionais [cite: 53]
export const professionals = pgTable(
  'professionals',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
color: text('color'), // [cite: 53]
salary: integer('salary'), // [cite: 53] (em centavos)
commissionRate: numeric('commission_rate'), // [cite: 53]
workStartTime: time('work_start_time'), // [cite: 53]
workEndTime: time('work_end_time'), // [cite: 53]
lunchStartTime: time('lunch_start_time'), // [cite: 53]
lunchEndTime: time('lunch_end_time'), // [cite: 53]
  },
  (table) => ({
    userIdx: index('professionals_user_id_idx').on(table.userId),
  }),
);

// Tabela de Serviços [cite: 54]
export const services = pgTable(
  'services',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
price: integer('price').notNull(), // [cite: 54] (em centavos)
duration: integer('duration').notNull(), // [cite: 54] (em minutos)
color: text('color'), // [cite: 54]
  },
  (table) => ({
    userIdx: index('services_user_id_idx').on(table.userId),
  }),
);

// Tabela de Produtos [cite: 55]
export const products = pgTable(
  'products',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
price: integer('price').notNull(), // [cite: 55] (em centavos)
quantity: integer('quantity').notNull(), // [cite: 55]
imageUrl: text('image_url'), // [cite: 55]
  },
  (table) => ({
    userIdx: index('products_user_id_idx').on(table.userId),
  }),
);

// Tabela de Agendamentos [cite: 56]
export const appointments = pgTable(
  'appointments',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    clientId: integer('client_id')
      .notNull()
.references(() => clients.id, { onDelete: 'set null' }), // [cite: 56]
    professionalId: integer('professional_id')
      .notNull()
.references(() => professionals.id, { onDelete: 'set null' }), // [cite: 56]
    serviceId: integer('service_id')
      .notNull()
.references(() => services.id, { onDelete: 'set null' }), // [cite: 56]
price: integer('price').notNull(), // [cite: 56] (em centavos)
appointmentDate: timestamp('appointment_date', { withTimezone: true }).notNull(), // [cite: 56]
endDate: timestamp('end_date', { withTimezone: true }).notNull(), // [cite: 56]
attended: boolean('attended').default(false), // [cite: 56]
  },
  (table) => ({
    userIdx: index('appointments_user_id_idx').on(table.userId),
    clientIdIdx: index('appointments_client_id_idx').on(table.clientId),
    professionalIdIdx: index('appointments_professional_id_idx').on(
      table.professionalId,
    ),
    serviceIdIdx: index('appointments_service_id_idx').on(table.serviceId),
  }),
);

// Tabela de Lançamentos Financeiros [cite: 57]
export const financialEntries = pgTable(
  'financial_entries',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    description: text('description').notNull(),
amount: integer('amount').notNull(), // [cite: 57] (em centavos)
type: financialTypeEnum('type').notNull(), // [cite: 57]
entryType: financialEntryTypeEnum('entry_type').notNull(), // [cite: 57]
entryDate: date('entry_date').notNull(), // [cite: 57]
    appointmentId: integer('appointment_id').references(() => appointments.id, {
      onDelete: 'set null',
}), // [cite: 57]
  },
  (table) => ({
    userIdx: index('financial_entries_user_id_idx').on(table.userId),
    appointmentIdIdx: index('financial_entries_appointment_id_idx').on(
      table.appointmentId,
    ),
  }),
);

// --- TABELAS DE CONFIGURAÇÃO --- [cite: 58]

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
});

// Exceções do Negócio (dias fechados, horários especiais)
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
  dayOfWeek: integer('day_of_week').notNull(), // 0 = Domingo, 1 = Segunda, etc.
  workStartTime: time('work_start_time'),
  workEndTime: time('work_end_time'),
  lunchStartTime: time('lunch_start_time'),
  lunchEndTime: time('lunch_end_time'),
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
});

// Ausências/Férias dos Profissionais [cite: 58]
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
});

// --- RELAÇÕES (DRIZZLE) --- [cite: 59]

export const clientsRelations = drizzleRelations(clients, ({ many }) => ({
  appointments: many(appointments),
}));

export const professionalsRelations = drizzleRelations(
  professionals,
  ({ many }) => ({
    appointments: many(appointments),
    schedules: many(professionalSchedules),
    exceptions: many(professionalExceptions),
    absences: many(professionalAbsences),
  }),
);

export const servicesRelations = drizzleRelations(services, ({ many }) => ({
  appointments: many(appointments),
}));

export const appointmentsRelations = drizzleRelations(
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

export const financialEntriesRelations = drizzleRelations(
  financialEntries,
  ({ one }) => ({
    appointment: one(appointments, {
      fields: [financialEntries.appointmentId],
      references: [appointments.id],
    }),
  }),
);

export const professionalSchedulesRelations = drizzleRelations(
  professionalSchedules,
  ({ one }) => ({
    professional: one(professionals, {
      fields: [professionalSchedules.professionalId],
      references: [professionals.id],
    }),
  }),
);

export const professionalExceptionsRelations = drizzleRelations(
  professionalExceptions,
  ({ one }) => ({
    professional: one(professionals, {
      fields: [professionalExceptions.professionalId],
      references: [professionals.id],
    }),
  }),
);

export const professionalAbsencesRelations = drizzleRelations(
  professionalAbsences,
  ({ one }) => ({
    professional: one(professionals, {
      fields: [professionalAbsences.professionalId],
      references: [professionals.id],
    }),
  }),
);