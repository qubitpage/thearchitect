CREATE TYPE "public"."agent_task_status" AS ENUM('pending', 'running', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."agent_task_type" AS ENUM('analyze_spending', 'compliance_check', 'risk_assessment', 'document_review', 'anomaly_detection', 'policy_recommendation');--> statement-breakpoint
CREATE TYPE "public"."audit_severity" AS ENUM('info', 'warning', 'critical');--> statement-breakpoint
CREATE TYPE "public"."compliance_pack" AS ENUM('general', 'hipaa', 'soc2', 'finance', 'custom');--> statement-breakpoint
CREATE TYPE "public"."enterprise_status_enum" AS ENUM('active', 'trial', 'suspended', 'deactivated');--> statement-breakpoint
CREATE TYPE "public"."enterprise_tier" AS ENUM('pilot', 'starter', 'professional', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."inspection_direction" AS ENUM('ingress', 'egress');--> statement-breakpoint
CREATE TYPE "public"."jurisdiction_status" AS ENUM('candidate', 'pilot', 'active', 'paused', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."ledger_classification" AS ENUM('public', 'pseudonymized', 'classified');--> statement-breakpoint
CREATE TYPE "public"."module_status" AS ENUM('live', 'building', 'planned');--> statement-breakpoint
CREATE TYPE "public"."policy_action" AS ENUM('ALLOW', 'DENY', 'LOG', 'HUMAN_REVIEW', 'QUARANTINE', 'RATE_LIMIT');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('accepted', 'pending_review', 'quarantined', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."risk_level" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TABLE "agent_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enterprise_id" uuid NOT NULL,
	"type" "agent_task_type" NOT NULL,
	"input" text NOT NULL,
	"context" jsonb DEFAULT '{}'::jsonb,
	"status" "agent_task_status" DEFAULT 'pending' NOT NULL,
	"result" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seq" serial NOT NULL,
	"type" varchar(64) NOT NULL,
	"summary" text NOT NULL,
	"severity" "audit_severity" DEFAULT 'info' NOT NULL,
	"reference_id" uuid,
	"reference_table" varchar(64),
	"enterprise_id" uuid,
	"hash" varchar(64) NOT NULL,
	"previous_hash" varchar(64) NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "corpledger_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enterprise_id" uuid NOT NULL,
	"department" varchar(128) NOT NULL,
	"counterparty" varchar(255) NOT NULL,
	"amount" bigint NOT NULL,
	"currency" varchar(8) DEFAULT 'EUR' NOT NULL,
	"category" varchar(64) NOT NULL,
	"purpose" text NOT NULL,
	"approved_by" varchar(255),
	"status" "review_status" DEFAULT 'pending_review' NOT NULL,
	"risk_score" integer DEFAULT 0 NOT NULL,
	"flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dpi_inspections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor" varchar(255) NOT NULL,
	"direction" "inspection_direction" NOT NULL,
	"action" "policy_action" NOT NULL,
	"risk_score" integer DEFAULT 0 NOT NULL,
	"matched_rules" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"redacted_preview" text DEFAULT '' NOT NULL,
	"enterprise_id" uuid,
	"policy_pack" "compliance_pack",
	"lobster_trap_meta" jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enterprises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(64) NOT NULL,
	"domain" varchar(255) NOT NULL,
	"tier" "enterprise_tier" DEFAULT 'pilot' NOT NULL,
	"status" "enterprise_status_enum" DEFAULT 'trial' NOT NULL,
	"compliance_pack" "compliance_pack" DEFAULT 'general' NOT NULL,
	"api_key_hash" varchar(64) NOT NULL,
	"contact_email" varchar(255) NOT NULL,
	"industry" varchar(128) NOT NULL,
	"agent_quota" integer DEFAULT 50 NOT NULL,
	"agents_used" integer DEFAULT 0 NOT NULL,
	"monthly_budget" bigint DEFAULT 0,
	"current_spend" bigint DEFAULT 0,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_bus" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seq" serial NOT NULL,
	"event_type" varchar(128) NOT NULL,
	"source_module" varchar(64) NOT NULL,
	"payload" jsonb NOT NULL,
	"processed" boolean DEFAULT false NOT NULL,
	"processed_by" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "govledger_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"jurisdiction_id" uuid,
	"jurisdiction_name" varchar(255) NOT NULL,
	"institution" varchar(255) NOT NULL,
	"counterparty" varchar(255) NOT NULL,
	"amount" bigint NOT NULL,
	"currency" varchar(8) DEFAULT 'EUR' NOT NULL,
	"category" varchar(64) NOT NULL,
	"purpose" text NOT NULL,
	"classification" "ledger_classification" DEFAULT 'public' NOT NULL,
	"status" "review_status" DEFAULT 'pending_review' NOT NULL,
	"risk_score" integer DEFAULT 0 NOT NULL,
	"flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"submitted_by" uuid,
	"reviewed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "impact_ledger_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_name" varchar(255) NOT NULL,
	"sector" varchar(64) NOT NULL,
	"jurisdiction_id" uuid,
	"jurisdiction_name" varchar(255) NOT NULL,
	"reporting_period" varchar(16) NOT NULL,
	"emissions_tons_co2e" real DEFAULT 0 NOT NULL,
	"water_m3" real DEFAULT 0 NOT NULL,
	"waste_kg" real DEFAULT 0 NOT NULL,
	"labor_incidents" integer DEFAULT 0 NOT NULL,
	"animal_welfare_score" real DEFAULT 100 NOT NULL,
	"biodiversity_impact" real DEFAULT 0 NOT NULL,
	"supply_chain_risk" real DEFAULT 0 NOT NULL,
	"community_displacement" integer DEFAULT 0 NOT NULL,
	"tax_transparency_score" real DEFAULT 100 NOT NULL,
	"verification_status" "review_status" DEFAULT 'pending_review' NOT NULL,
	"risk_score" integer DEFAULT 0 NOT NULL,
	"flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"enterprise_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jurisdictions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"region" varchar(128) NOT NULL,
	"governance_model" varchar(128) NOT NULL,
	"population" bigint DEFAULT 0 NOT NULL,
	"status" "jurisdiction_status" DEFAULT 'candidate' NOT NULL,
	"modules" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "merit_evaluations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enterprise_id" uuid NOT NULL,
	"candidate_id" varchar(128) NOT NULL,
	"position_title" varchar(255) NOT NULL,
	"department" varchar(128) NOT NULL,
	"peer_score" real DEFAULT 0 NOT NULL,
	"metrics_score" real DEFAULT 0 NOT NULL,
	"feedback_score" real DEFAULT 0 NOT NULL,
	"composite_score" real DEFAULT 0 NOT NULL,
	"bias_flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"evaluation_period" varchar(16) NOT NULL,
	"status" "review_status" DEFAULT 'pending_review' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_milestones" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"phase" varchar(64) NOT NULL,
	"horizon" varchar(64) NOT NULL,
	"goal" text NOT NULL,
	"status" "module_status" DEFAULT 'planned' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_modules" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" varchar(128) NOT NULL,
	"summary" text NOT NULL,
	"status" "module_status" DEFAULT 'planned' NOT NULL,
	"owner" varchar(128) NOT NULL,
	"version" varchar(32),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proposal_id" uuid NOT NULL,
	"voter_id" varchar(128) NOT NULL,
	"voter_type" varchar(32) NOT NULL,
	"delegated_from" varchar(128),
	"vote" varchar(16) NOT NULL,
	"weight" real DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "voting_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enterprise_id" uuid NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text NOT NULL,
	"category" varchar(64) NOT NULL,
	"proposed_by" varchar(255) NOT NULL,
	"required_quorum" real DEFAULT 0.5 NOT NULL,
	"employee_weight" real DEFAULT 0.2 NOT NULL,
	"votes_for" integer DEFAULT 0 NOT NULL,
	"votes_against" integer DEFAULT 0 NOT NULL,
	"votes_abstain" integer DEFAULT 0 NOT NULL,
	"total_eligible" integer DEFAULT 0 NOT NULL,
	"status" varchar(32) DEFAULT 'open' NOT NULL,
	"closes_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_tasks" ADD CONSTRAINT "agent_tasks_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corpledger_transactions" ADD CONSTRAINT "corpledger_transactions_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "govledger_transactions" ADD CONSTRAINT "govledger_transactions_jurisdiction_id_jurisdictions_id_fk" FOREIGN KEY ("jurisdiction_id") REFERENCES "public"."jurisdictions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "impact_ledger_entries" ADD CONSTRAINT "impact_ledger_entries_jurisdiction_id_jurisdictions_id_fk" FOREIGN KEY ("jurisdiction_id") REFERENCES "public"."jurisdictions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merit_evaluations" ADD CONSTRAINT "merit_evaluations_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_proposal_id_voting_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."voting_proposals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voting_proposals" ADD CONSTRAINT "voting_proposals_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_agent_enterprise" ON "agent_tasks" USING btree ("enterprise_id");--> statement-breakpoint
CREATE INDEX "idx_agent_status" ON "agent_tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_agent_type" ON "agent_tasks" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_agent_created" ON "agent_tasks" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_audit_type" ON "audit_events" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_audit_severity" ON "audit_events" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "idx_audit_enterprise" ON "audit_events" USING btree ("enterprise_id");--> statement-breakpoint
CREATE INDEX "idx_audit_created" ON "audit_events" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_audit_seq" ON "audit_events" USING btree ("seq");--> statement-breakpoint
CREATE INDEX "idx_corpledger_enterprise" ON "corpledger_transactions" USING btree ("enterprise_id");--> statement-breakpoint
CREATE INDEX "idx_corpledger_status" ON "corpledger_transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_corpledger_category" ON "corpledger_transactions" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_corpledger_created" ON "corpledger_transactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_dpi_action" ON "dpi_inspections" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_dpi_enterprise" ON "dpi_inspections" USING btree ("enterprise_id");--> statement-breakpoint
CREATE INDEX "idx_dpi_created" ON "dpi_inspections" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_dpi_direction" ON "dpi_inspections" USING btree ("direction");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_enterprise_slug" ON "enterprises" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_enterprise_domain" ON "enterprises" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "idx_enterprise_status" ON "enterprises" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_enterprise_tier" ON "enterprises" USING btree ("tier");--> statement-breakpoint
CREATE INDEX "idx_event_type" ON "event_bus" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "idx_event_source" ON "event_bus" USING btree ("source_module");--> statement-breakpoint
CREATE INDEX "idx_event_processed" ON "event_bus" USING btree ("processed");--> statement-breakpoint
CREATE INDEX "idx_event_created" ON "event_bus" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_govledger_jurisdiction" ON "govledger_transactions" USING btree ("jurisdiction_id");--> statement-breakpoint
CREATE INDEX "idx_govledger_status" ON "govledger_transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_govledger_category" ON "govledger_transactions" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_govledger_created" ON "govledger_transactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_govledger_risk" ON "govledger_transactions" USING btree ("risk_score");--> statement-breakpoint
CREATE INDEX "idx_impact_sector" ON "impact_ledger_entries" USING btree ("sector");--> statement-breakpoint
CREATE INDEX "idx_impact_jurisdiction" ON "impact_ledger_entries" USING btree ("jurisdiction_id");--> statement-breakpoint
CREATE INDEX "idx_impact_status" ON "impact_ledger_entries" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX "idx_impact_enterprise" ON "impact_ledger_entries" USING btree ("enterprise_id");--> statement-breakpoint
CREATE INDEX "idx_impact_period" ON "impact_ledger_entries" USING btree ("reporting_period");--> statement-breakpoint
CREATE INDEX "idx_jurisdictions_status" ON "jurisdictions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_jurisdictions_region" ON "jurisdictions" USING btree ("region");--> statement-breakpoint
CREATE INDEX "idx_merit_enterprise" ON "merit_evaluations" USING btree ("enterprise_id");--> statement-breakpoint
CREATE INDEX "idx_merit_department" ON "merit_evaluations" USING btree ("department");--> statement-breakpoint
CREATE INDEX "idx_merit_period" ON "merit_evaluations" USING btree ("evaluation_period");--> statement-breakpoint
CREATE INDEX "idx_votes_proposal" ON "votes" USING btree ("proposal_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_votes_unique" ON "votes" USING btree ("proposal_id","voter_id");--> statement-breakpoint
CREATE INDEX "idx_voting_enterprise" ON "voting_proposals" USING btree ("enterprise_id");--> statement-breakpoint
CREATE INDEX "idx_voting_status" ON "voting_proposals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_voting_category" ON "voting_proposals" USING btree ("category");