/*
ARQUIVO: /packages/db/migrations/0000_initial_schema.sql
*/

CREATE TYPE "financial_type" AS ENUM ('receita', 'despesa');
--> statement-breakpoint
CREATE TYPE "financial_entry_type" AS ENUM ('pontual', 'fixa');
--> statement-breakpoint
CREATE TYPE "gender" AS ENUM ('masculino', 'feminino', 'outro');
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"email" text,
	"notes" text,
	"birth_date" date,
	"gender" "gender"
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "professionals" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"color" text,
	"salary" integer,
	"commission_rate" numeric,
	"work_start_time" time,
	"work_end_time" time,
	"lunch_start_time" time,
	"lunch_end_time" time
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "services" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price" integer NOT NULL,
	"duration" integer NOT NULL,
	"color" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price" integer NOT NULL,
	"quantity" integer NOT NULL,
	"image_url" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "appointments" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"client_id" integer NOT NULL,
	"professional_id" integer NOT NULL,
	"service_id" integer NOT NULL,
	"price" integer NOT NULL,
	"appointment_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone NOT NULL,
	"attended" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "financial_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"description" text NOT NULL,
	"amount" integer NOT NULL,
	"type" "financial_type" NOT NULL,
	"entry_type" "financial_entry_type" NOT NULL,
	"entry_date" date NOT NULL,
	"appointment_id" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "business_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"work_start_time" time,
	"work_end_time" time,
	"lunch_start_time" time,
	"lunch_end_time" time
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "business_exceptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"exception_date" date NOT NULL,
	"work_start_time" time,
	"work_end_time" time,
	"lunch_start_time" time,
	"lunch_end_time" time,
	"is_closed" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "professional_schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"professional_id" integer NOT NULL,
	"day_of_week" integer NOT NULL,
	"work_start_time" time,
	"work_end_time" time,
	"lunch_start_time" time,
	"lunch_end_time" time
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "professional_exceptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"professional_id" integer NOT NULL,
	"exception_date" date NOT NULL,
	"work_start_time" time,
	"work_end_time" time,
	"lunch_start_time" time,
	"lunch_end_time" time,
	"is_off" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "professional_absences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"professional_id" integer NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"reason" text
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "clients" ADD CONSTRAINT "clients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "professionals" ADD CONSTRAINT "professionals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "services" ADD CONSTRAINT "services_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "products" ADD CONSTRAINT "products_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointments" ADD CONSTRAINT "appointments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointments" ADD CONSTRAINT "appointments_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointments" ADD CONSTRAINT "appointments_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointments" ADD CONSTRAINT "appointments_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "business_settings" ADD CONSTRAINT "business_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "business_exceptions" ADD CONSTRAINT "business_exceptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "professional_schedules" ADD CONSTRAINT "professional_schedules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "professional_schedules" ADD CONSTRAINT "professional_schedules_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "professional_exceptions" ADD CONSTRAINT "professional_exceptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "professional_exceptions" ADD CONSTRAINT "professional_exceptions_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "professional_absences" ADD CONSTRAINT "professional_absences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "professional_absences" ADD CONSTRAINT "professional_absences_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "clients_user_id_idx" ON "clients" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "professionals_user_id_idx" ON "professionals" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "services_user_id_idx" ON "services" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_user_id_idx" ON "products" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appointments_user_id_idx" ON "appointments" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appointments_client_id_idx" ON "appointments" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appointments_professional_id_idx" ON "appointments" ("professional_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appointments_service_id_idx" ON "appointments" ("service_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "financial_entries_user_id_idx" ON "financial_entries" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "financial_entries_appointment_id_idx" ON "financial_entries" ("appointment_id");