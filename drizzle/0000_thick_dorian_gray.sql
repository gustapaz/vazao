CREATE TABLE `quotas` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `records` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`recipe` text NOT NULL,
	`token_hash` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`published` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`unlock_at` integer DEFAULT 0 NOT NULL,
	CONSTRAINT "record_revision" CHECK("records"."revision" BETWEEN 1 AND 30),
	CONSTRAINT "record_public" CHECK("records"."published" IN (0,1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `records_token_hash_unique` ON `records` (`token_hash`);--> statement-breakpoint
CREATE INDEX `record_expiry` ON `records` (`expires_at`);