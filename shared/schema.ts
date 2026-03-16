import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, primaryKey, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: text("role").notNull().default("admin"),
  avatarUrl: text("avatar_url"),
  passwordHash: text("password_hash"),
  emailVerified: boolean("email_verified").notNull().default(false),
  verificationToken: text("verification_token"),
  verificationTokenExpires: timestamp("verification_token_expires"),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const demonstrations = pgTable("demonstrations", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  publicId: varchar("public_id", { length: 12 }).notNull().unique(),
  title: text("title").notNull(),
  status: text("status").notNull().default("draft"),
  createdBy: varchar("created_by", { length: 255 }).notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const chants = pgTable("chants", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  demonstrationId: varchar("demonstration_id", { length: 255 }).notNull().references(() => demonstrations.id, { onDelete: "cascade" }),
  orderIndex: integer("order_index").notNull(),
  callText: text("call_text").notNull().default(""),
  responseText: text("response_text").notNull().default(""),
});

export const demoAdmins = pgTable("demo_admins", {
  demonstrationId: varchar("demonstration_id", { length: 255 }).notNull().references(() => demonstrations.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
}, (table) => ({
  pk: primaryKey({ columns: [table.demonstrationId, table.userId] }),
}));

export const demoState = pgTable("demo_state", {
  demonstrationId: varchar("demonstration_id", { length: 255 }).primaryKey().references(() => demonstrations.id, { onDelete: "cascade" }),
  currentChantId: varchar("current_chant_id", { length: 255 }).references(() => chants.id),
  autoRotate: boolean("auto_rotate").notNull().default(false),
  rotationInterval: integer("rotation_interval").notNull().default(60),
  cycleCount: integer("cycle_count").notNull().default(1),
  leaderDuration: integer("leader_duration").notNull().default(4),
  peopleDuration: integer("people_duration").notNull().default(3),
  currentPhase: text("current_phase").notNull().default("leader"),
  currentCycle: integer("current_cycle").notNull().default(1),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const viewSessions = pgTable("view_sessions", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  demonstrationId: varchar("demonstration_id", { length: 255 }).notNull().references(() => demonstrations.id, { onDelete: "cascade" }),
  sessionId: text("session_id").notNull(),
  firstSeenAt: timestamp("first_seen_at").defaultNow().notNull(),
  lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertDemonstrationSchema = createInsertSchema(demonstrations).omit({ id: true, createdAt: true, publicId: true });
export const insertChantSchema = createInsertSchema(chants).omit({ id: true });
export const insertDemoAdminSchema = createInsertSchema(demoAdmins);

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Demonstration = typeof demonstrations.$inferSelect;
export type InsertDemonstration = z.infer<typeof insertDemonstrationSchema>;
export type Chant = typeof chants.$inferSelect;
export type InsertChant = z.infer<typeof insertChantSchema>;
export type DemoAdmin = typeof demoAdmins.$inferSelect;
export type DemoState = typeof demoState.$inferSelect;
export type ViewSession = typeof viewSessions.$inferSelect;
