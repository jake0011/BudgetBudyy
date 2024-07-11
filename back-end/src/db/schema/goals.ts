import {
  pgTable,
  serial,
  varchar,
  timestamp,
  unique,
  doublePrecision,
  boolean,
} from "drizzle-orm/pg-core";

export const goals = pgTable("goals", {
  goalsId: serial("goalsId").primaryKey(),
  title: varchar("title", { length: 256 }).notNull().unique(),
  description: varchar("description", { length: 1024 }),
  amount: doublePrecision("amount").default(0.0).notNull(),
  percentageToGoal: doublePrecision("percentageToGoal").default(0.0),
  isGoalReached: boolean("isGoalReached").default(false),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});
