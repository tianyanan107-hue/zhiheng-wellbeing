import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const assessmentResults = sqliteTable(
  "assessment_results",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    anonymousId: text("anonymous_id").notNull(),
    scale: text("scale").notNull(),
    rawScore: integer("raw_score").notNull(),
    normalizedScore: integer("normalized_score").notNull(),
    answersJson: text("answers_json").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_assessment_results_anonymous_scale_created").on(
      table.anonymousId,
      table.scale,
      table.createdAt,
    ),
  ],
);

export const dailyCheckins = sqliteTable(
  "daily_checkins",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    anonymousId: text("anonymous_id").notNull(),
    mood: integer("mood").notNull(),
    sleepHours: integer("sleep_hours").notNull(),
    sleepQuality: integer("sleep_quality").notNull(),
    stress: integer("stress").notNull(),
    energy: integer("energy").notNull(),
    exercised: integer("exercised", { mode: "boolean" }).notNull(),
    note: text("note").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("idx_daily_checkins_anonymous_created").on(table.anonymousId, table.createdAt)],
);
