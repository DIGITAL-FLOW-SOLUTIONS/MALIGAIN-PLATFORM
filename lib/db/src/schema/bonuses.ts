import { pgTable, text, serial, timestamp, decimal, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const bonusTiersTable = pgTable("bonus_tiers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  requiredReferrals: integer("required_referrals").notNull(),
  bonusAmount: decimal("bonus_amount", { precision: 12, scale: 2 }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const insertBonusTierSchema = createInsertSchema(bonusTiersTable).omit({ id: true });
export type InsertBonusTier = z.infer<typeof insertBonusTierSchema>;
export type BonusTier = typeof bonusTiersTable.$inferSelect;

export const bonusHistoryTable = pgTable("bonus_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  tierId: integer("tier_id").notNull().references(() => bonusTiersTable.id),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  claimedAt: timestamp("claimed_at").notNull().defaultNow(),
});

export const insertBonusHistorySchema = createInsertSchema(bonusHistoryTable).omit({ id: true, claimedAt: true });
export type InsertBonusHistory = z.infer<typeof insertBonusHistorySchema>;
export type BonusHistory = typeof bonusHistoryTable.$inferSelect;

export const tournamentsTable = pgTable("tournaments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  endsAt: timestamp("ends_at").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  prizes: text("prizes").notNull().default("[]"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTournamentSchema = createInsertSchema(tournamentsTable).omit({ id: true, createdAt: true });
export type InsertTournament = z.infer<typeof insertTournamentSchema>;
export type Tournament = typeof tournamentsTable.$inferSelect;
