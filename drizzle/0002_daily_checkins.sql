CREATE TABLE `daily_checkins` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`anonymous_id` text NOT NULL,
	`mood` integer NOT NULL,
	`sleep_hours` integer NOT NULL,
	`sleep_quality` integer NOT NULL,
	`stress` integer NOT NULL,
	`energy` integer NOT NULL,
	`exercised` integer NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_daily_checkins_anonymous_created` ON `daily_checkins` (`anonymous_id`,`created_at`);
