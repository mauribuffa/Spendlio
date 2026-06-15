ALTER TABLE "receipts" ADD COLUMN "sha256" varchar(64);--> statement-breakpoint
CREATE INDEX "receipts_user_sha256_idx" ON "receipts" USING btree ("user_id","sha256");