CREATE TABLE `assessment_results` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`anonymous_id` text NOT NULL,
	`scale` text NOT NULL,
	`raw_score` integer NOT NULL,
	`normalized_score` integer NOT NULL,
	`answers_json` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
