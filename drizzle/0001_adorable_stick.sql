CREATE TYPE "public"."contract_status" AS ENUM('draft', 'active', 'completed', 'disputed', 'terminated');--> statement-breakpoint
CREATE TYPE "public"."identity_verification_status" AS ENUM('unverified', 'pending', 'verified', 'suspended', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."labor_skill_level" AS ENUM('beginner', 'intermediate', 'advanced', 'expert');--> statement-breakpoint
CREATE TYPE "public"."service_request_status" AS ENUM('submitted', 'processing', 'approved', 'rejected', 'completed');--> statement-breakpoint
CREATE TABLE "digital_identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"jurisdiction_id" uuid,
	"display_name" varchar(255) NOT NULL,
	"identifier_hash" varchar(64) NOT NULL,
	"identity_type" varchar(32) NOT NULL,
	"verification_status" "identity_verification_status" DEFAULT 'unverified' NOT NULL,
	"verified_at" timestamp with time zone,
	"verified_by" varchar(255),
	"services" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gov_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"jurisdiction_id" uuid,
	"name" varchar(255) NOT NULL,
	"category" varchar(64) NOT NULL,
	"description" text NOT NULL,
	"required_documents" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"estimated_days" integer DEFAULT 30 NOT NULL,
	"fee" bigint DEFAULT 0 NOT NULL,
	"fee_currency" varchar(8) DEFAULT 'USD' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "labor_contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"worker_id" uuid NOT NULL,
	"employer_id" uuid,
	"employer_name" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"skills" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"hourly_rate" real NOT NULL,
	"currency" varchar(8) DEFAULT 'USD' NOT NULL,
	"hours_per_week" integer DEFAULT 40 NOT NULL,
	"total_hours_logged" real DEFAULT 0 NOT NULL,
	"total_paid" bigint DEFAULT 0 NOT NULL,
	"status" "contract_status" DEFAULT 'draft' NOT NULL,
	"fairness_score" real DEFAULT 50 NOT NULL,
	"flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "labor_disputes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"filed_by" varchar(32) NOT NULL,
	"reason" varchar(64) NOT NULL,
	"description" text NOT NULL,
	"status" varchar(32) DEFAULT 'open' NOT NULL,
	"resolution" text,
	"resolved_by" varchar(255),
	"resolved_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_id" uuid NOT NULL,
	"identity_id" uuid NOT NULL,
	"status" "service_request_status" DEFAULT 'submitted' NOT NULL,
	"submitted_documents" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notes" text,
	"processed_by" varchar(255),
	"processed_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "worker_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identity_id" uuid,
	"display_name" varchar(255) NOT NULL,
	"jurisdiction_id" uuid,
	"skills" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"hourly_rate" real,
	"currency" varchar(8) DEFAULT 'USD' NOT NULL,
	"available_hours_per_week" integer DEFAULT 40 NOT NULL,
	"reputation_score" real DEFAULT 50 NOT NULL,
	"total_contracts" integer DEFAULT 0 NOT NULL,
	"completed_contracts" integer DEFAULT 0 NOT NULL,
	"dispute_rate" real DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "digital_identities" ADD CONSTRAINT "digital_identities_jurisdiction_id_jurisdictions_id_fk" FOREIGN KEY ("jurisdiction_id") REFERENCES "public"."jurisdictions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gov_services" ADD CONSTRAINT "gov_services_jurisdiction_id_jurisdictions_id_fk" FOREIGN KEY ("jurisdiction_id") REFERENCES "public"."jurisdictions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "labor_contracts" ADD CONSTRAINT "labor_contracts_worker_id_worker_profiles_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."worker_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "labor_disputes" ADD CONSTRAINT "labor_disputes_contract_id_labor_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."labor_contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_service_id_gov_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."gov_services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_identity_id_digital_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."digital_identities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worker_profiles" ADD CONSTRAINT "worker_profiles_identity_id_digital_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."digital_identities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worker_profiles" ADD CONSTRAINT "worker_profiles_jurisdiction_id_jurisdictions_id_fk" FOREIGN KEY ("jurisdiction_id") REFERENCES "public"."jurisdictions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_identity_hash" ON "digital_identities" USING btree ("identifier_hash");--> statement-breakpoint
CREATE INDEX "idx_identity_jurisdiction" ON "digital_identities" USING btree ("jurisdiction_id");--> statement-breakpoint
CREATE INDEX "idx_identity_status" ON "digital_identities" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX "idx_identity_type" ON "digital_identities" USING btree ("identity_type");--> statement-breakpoint
CREATE INDEX "idx_gov_services_jurisdiction" ON "gov_services" USING btree ("jurisdiction_id");--> statement-breakpoint
CREATE INDEX "idx_gov_services_category" ON "gov_services" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_gov_services_active" ON "gov_services" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_labor_worker" ON "labor_contracts" USING btree ("worker_id");--> statement-breakpoint
CREATE INDEX "idx_labor_employer" ON "labor_contracts" USING btree ("employer_id");--> statement-breakpoint
CREATE INDEX "idx_labor_status" ON "labor_contracts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_labor_fairness" ON "labor_contracts" USING btree ("fairness_score");--> statement-breakpoint
CREATE INDEX "idx_labor_created" ON "labor_contracts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_dispute_contract" ON "labor_disputes" USING btree ("contract_id");--> statement-breakpoint
CREATE INDEX "idx_dispute_status" ON "labor_disputes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_dispute_filed_by" ON "labor_disputes" USING btree ("filed_by");--> statement-breakpoint
CREATE INDEX "idx_service_req_service" ON "service_requests" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "idx_service_req_identity" ON "service_requests" USING btree ("identity_id");--> statement-breakpoint
CREATE INDEX "idx_service_req_status" ON "service_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_service_req_created" ON "service_requests" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_worker_identity" ON "worker_profiles" USING btree ("identity_id");--> statement-breakpoint
CREATE INDEX "idx_worker_jurisdiction" ON "worker_profiles" USING btree ("jurisdiction_id");--> statement-breakpoint
CREATE INDEX "idx_worker_reputation" ON "worker_profiles" USING btree ("reputation_score");--> statement-breakpoint
CREATE INDEX "idx_worker_active" ON "worker_profiles" USING btree ("is_active");