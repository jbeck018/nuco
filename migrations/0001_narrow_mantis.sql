CREATE TABLE "organization_token_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid,
	"model_id" varchar(50) NOT NULL,
	"provider" varchar(20) NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"estimated_cost" integer DEFAULT 0 NOT NULL,
	"query_id" varchar(100),
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"metadata" json
);
--> statement-breakpoint
ALTER TABLE "organization_token_usage" ADD CONSTRAINT "organization_token_usage_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_token_usage" ADD CONSTRAINT "organization_token_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "org_token_usage_org_id_idx" ON "organization_token_usage" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "org_token_usage_timestamp_idx" ON "organization_token_usage" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "org_token_usage_user_id_idx" ON "organization_token_usage" USING btree ("user_id");