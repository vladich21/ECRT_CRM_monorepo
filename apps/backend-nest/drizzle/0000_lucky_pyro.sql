CREATE TABLE "auth_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"code_hash" varchar(255) NOT NULL,
	"type" varchar(20) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid,
	"entity_type" varchar(255) NOT NULL,
	"entity_id" uuid NOT NULL,
	"message" text NOT NULL,
	"html" text,
	"user_id" uuid,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"number" varchar(255),
	"cipher" varchar(255),
	"date_signed" date,
	"partner_id" uuid,
	"description" text,
	"start_date" date,
	"end_date" date,
	"amount_excl_vat" numeric(19, 2),
	"vat_rate" numeric(5, 2),
	"amount_vat" numeric(19, 2),
	"amount_incl_vat" numeric(19, 2),
	"category_id" uuid,
	"responsible_id" uuid,
	"project_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"state_id" uuid NOT NULL,
	"contract_type_id" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"is_deleted" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255),
	"short_name" varchar(255),
	"parent_id" uuid,
	"manager_id" uuid,
	"is_active" boolean,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entitytype" varchar(255) NOT NULL,
	"table_id" uuid,
	"name" varchar(255) NOT NULL,
	"type" varchar(255) NOT NULL,
	"size" integer,
	"uploadedby_id" uuid,
	"uploaded_at" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "partner_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid,
	"full_name" varchar(255),
	"position" varchar(255),
	"phone" varchar(255),
	"email" varchar(255),
	"is_primary" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "partners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255),
	"short_name" varchar(255),
	"inn" varchar(12),
	"kpp" varchar(9),
	"ogrn" varchar(15),
	"legal_address" text,
	"actual_address" text,
	"phone" varchar(255),
	"email" varchar(255),
	"website" varchar(255),
	"status_id" uuid,
	"category_id" uuid,
	"comment" text,
	"partner_economic_category_id" uuid,
	"is_key_supplier" boolean DEFAULT false,
	"is_targeted" boolean DEFAULT false,
	"legal_check_passed" boolean DEFAULT false,
	"questionnaire_filled" boolean DEFAULT false,
	"initial_assessment_done" boolean DEFAULT false,
	"rating" numeric(3, 2),
	"next_audit_date" date,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"is_deleted" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patent_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patent_id" uuid,
	"grant_number" varchar(255),
	"grant_date" date,
	"office" varchar(255),
	"status" varchar(50),
	"renewal_date" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "patents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"registration_number" varchar(255),
	"registration_date" date,
	"registration_number_cir" varchar(255),
	"registration_date_cir" date,
	"application_number" varchar(255),
	"name" varchar(255) NOT NULL,
	"department_id" uuid NOT NULL,
	"contract_id" uuid,
	"project_id" uuid,
	"kd_number" varchar(255),
	"intellectual_property_type_id" uuid,
	"intellectprop_id" uuid,
	"status_id" uuid,
	"responsible_for_patenting_id" uuid,
	"created_by" uuid,
	"updated_by" uuid,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(255),
	"name" varchar(255),
	"short_name" varchar(255),
	"description" text,
	"start_date" date,
	"end_date" date,
	"manager_id" uuid,
	"status" varchar(255),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"created_by" uuid,
	"updated_by" uuid,
	"is_deleted" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ref_contract_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "ref_contract_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "ref_contract_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255),
	"description" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "ref_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "ref_intellectual_property_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "ref_partner_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "ref_partner_competencies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(1000),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "ref_partner_economic_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255),
	"code" varchar(50),
	"description" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "ref_partner_statuses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "ref_partner_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "ref_patent_application_areas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255),
	"code" varchar(50),
	"description" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ref_patent_statuses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "ref_supplier_evaluation_criteria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(64) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"weight" numeric(6, 4) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "rel_partners_competencies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid,
	"competence_id" uuid
);
--> statement-breakpoint
CREATE TABLE "rel_partners_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid,
	"type_id" uuid
);
--> statement-breakpoint
CREATE TABLE "rel_patents_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patent_id" uuid,
	"user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rel_patents_application_areas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patent_id" uuid,
	"area_id" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "rel_users_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"group_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_evaluation_criterion_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evaluation_id" uuid NOT NULL,
	"criterion_id" uuid NOT NULL,
	"score" numeric(4, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "supplier_evaluations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"project_id" uuid,
	"scope" varchar(20) DEFAULT 'project' NOT NULL,
	"status" varchar(20) NOT NULL,
	"weighted_score" numeric(5, 2) NOT NULL,
	"category" varchar(1) NOT NULL,
	"evaluated_at" date NOT NULL,
	"next_reevaluation_date" date,
	"comment" text,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "supplier_partner_project_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"source_evaluation_id" uuid,
	"reason" varchar(64),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"password_hash" varchar(255),
	"must_change_password" boolean DEFAULT false,
	"two_factor_enabled" boolean DEFAULT false,
	"last_login_at" timestamp with time zone,
	"last_name" varchar(50),
	"first_name" varchar(50),
	"middle_name" varchar(50),
	"email" varchar(100),
	"phone" varchar(20),
	"department_id" uuid,
	"position_id" uuid,
	"is_active" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "auth_codes_user_type_idx" ON "auth_codes" USING btree ("user_id","type","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "files_entitytype" ON "files" USING btree ("entitytype","table_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "ref_supplier_eval_criteria_code_uidx" ON "ref_supplier_evaluation_criteria" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "supplier_eval_scores_eval_criterion_uidx" ON "supplier_evaluation_criterion_scores" USING btree ("evaluation_id","criterion_id");--> statement-breakpoint
CREATE INDEX "supplier_eval_scores_evaluation_idx" ON "supplier_evaluation_criterion_scores" USING btree ("evaluation_id");--> statement-breakpoint
CREATE INDEX "supplier_evaluations_partner_idx" ON "supplier_evaluations" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX "supplier_evaluations_project_idx" ON "supplier_evaluations" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "supplier_evaluations_partner_scope_status_idx" ON "supplier_evaluations" USING btree ("partner_id","scope","status");--> statement-breakpoint
CREATE INDEX "supplier_evaluations_partner_project_status_idx" ON "supplier_evaluations" USING btree ("partner_id","project_id","status");--> statement-breakpoint
CREATE INDEX "supplier_evaluations_next_reeval_idx" ON "supplier_evaluations" USING btree ("next_reevaluation_date");--> statement-breakpoint
CREATE INDEX "supplier_partner_project_blocks_pair_active_idx" ON "supplier_partner_project_blocks" USING btree ("partner_id","project_id","is_active");--> statement-breakpoint
CREATE INDEX "supplier_partner_project_blocks_project_idx" ON "supplier_partner_project_blocks" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");