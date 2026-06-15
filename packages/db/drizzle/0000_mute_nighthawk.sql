CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(120) NOT NULL,
	"type" varchar(16) NOT NULL,
	"currency" varchar(3) NOT NULL,
	"institution" varchar(120),
	"last4" varchar(4),
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"category" varchar(32) NOT NULL,
	"limit" bigint NOT NULL,
	"currency" varchar(3) NOT NULL,
	"period" varchar(16) DEFAULT 'monthly' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(32) NOT NULL,
	"label" varchar(64) NOT NULL,
	"kind" varchar(16) NOT NULL,
	"icon" varchar(64) NOT NULL,
	"color" varchar(7) NOT NULL,
	"is_default" boolean DEFAULT true NOT NULL,
	"user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fx_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"base" varchar(3) NOT NULL,
	"quote" varchar(3) NOT NULL,
	"date" varchar(10) NOT NULL,
	"rate" varchar(32) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fx_rates_base_quote_date_uniq" UNIQUE("base","quote","date")
);
--> statement-breakpoint
CREATE TABLE "group_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "group_members_group_person_uniq" UNIQUE("group_id","person_id")
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(120) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"email" varchar(255) NOT NULL,
	"avatar_url" varchar(1024),
	"default_currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"locale" varchar(16) DEFAULT 'en-US' NOT NULL,
	"timezone" varchar(64) DEFAULT 'UTC' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"merchant" varchar(200),
	"amount" bigint NOT NULL,
	"currency" varchar(3) NOT NULL,
	"fx_base_currency" varchar(3),
	"fx_base_amount" bigint,
	"fx_rate" varchar(32),
	"fx_as_of" varchar(10),
	"category" varchar(32) NOT NULL,
	"account_id" uuid,
	"occurred_at" timestamp with time zone NOT NULL,
	"note" varchar(1000),
	"status" varchar(16) NOT NULL,
	"source" varchar(16) DEFAULT 'manual' NOT NULL,
	"receipt_id" uuid,
	"split_id" uuid,
	"recurring_id" uuid,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recurring_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"merchant" varchar(200),
	"amount" bigint NOT NULL,
	"currency" varchar(3) NOT NULL,
	"category" varchar(32) NOT NULL,
	"account_id" uuid,
	"cadence" varchar(16) NOT NULL,
	"interval" bigint DEFAULT 1 NOT NULL,
	"next_run_at" timestamp with time zone NOT NULL,
	"last_run_at" timestamp with time zone,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"image_key" varchar(1024) NOT NULL,
	"status" varchar(16) NOT NULL,
	"merchant" varchar(200),
	"total" bigint,
	"currency" varchar(3),
	"purchased_at" timestamp with time zone,
	"ocr" jsonb,
	"transaction_id" uuid,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "people" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(120) NOT NULL,
	"email" varchar(255),
	"avatar_url" varchar(1024),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "splits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"transaction_id" uuid,
	"group_id" uuid,
	"mode" varchar(16) NOT NULL,
	"total" bigint NOT NULL,
	"currency" varchar(3) NOT NULL,
	"payer_id" uuid NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "split_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"split_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"amount" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"from_person_id" uuid NOT NULL,
	"to_person_id" uuid NOT NULL,
	"amount" bigint NOT NULL,
	"currency" varchar(3) NOT NULL,
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"settled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" varchar(32) NOT NULL,
	"title" varchar(200) NOT NULL,
	"body" varchar(1000),
	"data" jsonb,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monthly_summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"month" varchar(7) NOT NULL,
	"currency" varchar(3) NOT NULL,
	"total_income" bigint NOT NULL,
	"total_expense" bigint NOT NULL,
	"net" bigint NOT NULL,
	"by_category" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"top_merchant" varchar(200),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "monthly_summaries_user_month_uniq" UNIQUE("user_id","month")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_rules" ADD CONSTRAINT "recurring_rules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_rules" ADD CONSTRAINT "recurring_rules_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "splits" ADD CONSTRAINT "splits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "splits" ADD CONSTRAINT "splits_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "splits" ADD CONSTRAINT "splits_payer_id_people_id_fk" FOREIGN KEY ("payer_id") REFERENCES "public"."people"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "split_shares" ADD CONSTRAINT "split_shares_split_id_splits_id_fk" FOREIGN KEY ("split_id") REFERENCES "public"."splits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "split_shares" ADD CONSTRAINT "split_shares_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_from_person_id_people_id_fk" FOREIGN KEY ("from_person_id") REFERENCES "public"."people"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_to_person_id_people_id_fk" FOREIGN KEY ("to_person_id") REFERENCES "public"."people"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_summaries" ADD CONSTRAINT "monthly_summaries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_user_created_idx" ON "accounts" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "budgets_user_category_idx" ON "budgets" USING btree ("user_id","category");--> statement-breakpoint
CREATE INDEX "categories_user_idx" ON "categories" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "fx_rates_pair_date_idx" ON "fx_rates" USING btree ("base","quote","date");--> statement-breakpoint
CREATE INDEX "group_members_group_idx" ON "group_members" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "group_members_person_idx" ON "group_members" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "groups_user_created_idx" ON "groups" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "txn_user_occurred_idx" ON "transactions" USING btree ("user_id","occurred_at");--> statement-breakpoint
CREATE INDEX "txn_account_idx" ON "transactions" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "recurring_user_created_idx" ON "recurring_rules" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "recurring_next_run_idx" ON "recurring_rules" USING btree ("next_run_at");--> statement-breakpoint
CREATE INDEX "receipts_user_created_idx" ON "receipts" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "people_user_created_idx" ON "people" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "splits_user_created_idx" ON "splits" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "splits_transaction_idx" ON "splits" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "split_shares_split_idx" ON "split_shares" USING btree ("split_id");--> statement-breakpoint
CREATE INDEX "split_shares_person_idx" ON "split_shares" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "settlements_user_created_idx" ON "settlements" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_user_created_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "monthly_summaries_user_idx" ON "monthly_summaries" USING btree ("user_id","month");