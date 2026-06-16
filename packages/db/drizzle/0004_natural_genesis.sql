CREATE TABLE "dead_letters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"queue" varchar(32) NOT NULL,
	"job_id" varchar(200),
	"payload" jsonb NOT NULL,
	"error" text,
	"redriven_at" timestamp with time zone,
	"failed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "dedupe_key" varchar(200);--> statement-breakpoint
CREATE INDEX "dead_letters_queue_failed_idx" ON "dead_letters" USING btree ("queue","failed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "txn_recurring_occurred_idx" ON "transactions" USING btree ("recurring_id","occurred_at") WHERE "transactions"."recurring_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_user_type_dedupe_idx" ON "notifications" USING btree ("user_id","type","dedupe_key") WHERE "notifications"."dedupe_key" is not null;