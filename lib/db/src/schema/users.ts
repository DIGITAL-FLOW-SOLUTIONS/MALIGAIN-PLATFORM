import { pgTable, text, serial, timestamp, decimal, integer, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userStatusEnum = pgEnum("user_status", ["active", "inactive", "suspended"]);

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  phone: text("phone"),
  country: text("country"),
  referralCode: text("referral_code").notNull().unique(),
  referredBy: integer("referred_by"),
  status: userStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

export const walletTable = pgTable("wallet", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  teamEarnings: decimal("team_earnings", { precision: 12, scale: 2 }).notNull().default("0"),
  mainWallet: decimal("main_wallet", { precision: 12, scale: 2 }).notNull().default("0"),
  totalWithdrawn: decimal("total_withdrawn", { precision: 12, scale: 2 }).notNull().default("0"),
  totalEarned: decimal("total_earned", { precision: 12, scale: 2 }).notNull().default("0"),
  todayEarnings: decimal("today_earnings", { precision: 12, scale: 2 }).notNull().default("0"),
  affiliateBalance: decimal("affiliate_balance", { precision: 12, scale: 2 }).notNull().default("0"),
  commissions: decimal("commissions", { precision: 12, scale: 2 }).notNull().default("0"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertWalletSchema = createInsertSchema(walletTable).omit({ id: true, updatedAt: true });
export type InsertWallet = z.infer<typeof insertWalletSchema>;
export type Wallet = typeof walletTable.$inferSelect;

export const transactionTypeEnum = pgEnum("transaction_type", ["withdrawal", "recharge", "bonus", "commission", "referral"]);
export const transactionStatusEnum = pgEnum("transaction_status", ["pending", "completed", "failed"]);

export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  type: transactionTypeEnum("type").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  status: transactionStatusEnum("status").notNull().default("pending"),
  description: text("description").notNull(),
  phoneNumber: text("phone_number"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTransactionSchema = createInsertSchema(transactionsTable).omit({ id: true, createdAt: true });
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactionsTable.$inferSelect;
