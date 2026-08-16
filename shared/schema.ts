import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, primaryKey, boolean, jsonb } from "drizzle-orm/pg-core";
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
  lastActivityAt: timestamp("last_activity_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const demonstrations = pgTable("demonstrations", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  publicId: varchar("public_id", { length: 12 }).notNull().unique(),
  title: text("title").notNull(),
  status: text("status").notNull().default("draft"),
  createdBy: varchar("created_by", { length: 255 }).notNull().references(() => users.id),
  supportUrl: text("support_url"),
  supportLabel: text("support_label"),
  scheduledAt: timestamp("scheduled_at"),
  locationName: text("location_name"),
  meetingPoint: text("meeting_point"),
  arrivalNote: text("arrival_note"),
  registrationEnabled: boolean("registration_enabled").notNull().default(false),
  registrationCapacity: integer("registration_capacity"),
  registrationClosesAt: timestamp("registration_closes_at", { withTimezone: true }),
  registrationClosed: boolean("registration_closed").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const chants = pgTable("chants", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  demonstrationId: varchar("demonstration_id", { length: 255 }).notNull().references(() => demonstrations.id, { onDelete: "cascade" }),
  orderIndex: integer("order_index").notNull(),
  callText: text("call_text").notNull().default(""),
  responseText: text("response_text").notNull().default(""),
  cycles: integer("cycles").notNull().default(1),
  leaderDuration: integer("leader_duration").notNull().default(4),
  peopleDuration: integer("people_duration").notNull().default(3),
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
  cycleDelay: integer("cycle_delay").notNull().default(500),
  eventDurationMinutes: integer("event_duration_minutes").notNull().default(300),
  liveStartedAt: timestamp("live_started_at"),
  liveControllerUserId: varchar("live_controller_user_id", { length: 255 }).references(() => users.id, { onDelete: "set null" }),
  liveControlClaimedAt: timestamp("live_control_claimed_at"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const viewSessions = pgTable("view_sessions", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  demonstrationId: varchar("demonstration_id", { length: 255 }).notNull().references(() => demonstrations.id, { onDelete: "cascade" }),
  sessionId: text("session_id").notNull(),
  firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).defaultNow().notNull(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),
  disconnectedAt: timestamp("disconnected_at", { withTimezone: true }),
});

export const eventRegistrations = pgTable("event_registrations", {
  demonstrationId: varchar("demonstration_id", { length: 255 }).notNull().references(() => demonstrations.id, { onDelete: "cascade" }),
  sessionId: text("session_id").notNull(),
  status: text("status").notNull().default("confirmed"),
  registeredAt: timestamp("registered_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.demonstrationId, table.sessionId] }),
}));

export const audienceQuestions = pgTable("audience_questions", {
  id: varchar("id", { length: 255 }).primaryKey(),
  demonstrationId: varchar("demonstration_id", { length: 255 }).notNull().references(() => demonstrations.id, { onDelete: "cascade" }),
  sessionId: text("session_id").notNull(),
  text: text("text").notNull(),
  status: text("status").notNull().default("open"),
  organizerResponse: text("organizer_response"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

export const audienceQuestionVotes = pgTable("audience_question_votes", {
  questionId: varchar("question_id", { length: 255 }).notNull().references(() => audienceQuestions.id, { onDelete: "cascade" }),
  sessionId: text("session_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.questionId, table.sessionId] }),
}));

export const safetyChecks = pgTable("safety_checks", {
  id: varchar("id", { length: 255 }).primaryKey(),
  demonstrationId: varchar("demonstration_id", { length: 255 }).notNull().references(() => demonstrations.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  message: text("message").notNull(),
  instruction: text("instruction").notNull(),
  status: text("status").notNull().default("open"),
  resolutionMessage: text("resolution_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  closedAt: timestamp("closed_at"),
});

export const safetyCheckResponses = pgTable("safety_check_responses", {
  safetyCheckId: varchar("safety_check_id", { length: 255 }).notNull().references(() => safetyChecks.id, { onDelete: "cascade" }),
  sessionId: text("session_id").notNull(),
  response: text("response").notNull(),
  note: text("note"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.safetyCheckId, table.sessionId] }),
}));

export const assistanceRequests = pgTable("assistance_requests", {
  id: varchar("id", { length: 255 }).primaryKey(),
  demonstrationId: varchar("demonstration_id", { length: 255 }).notNull().references(() => demonstrations.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  message: text("message").notNull(),
  sessionId: text("session_id").notNull(),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
});

export const conductReports = pgTable("conduct_reports", {
  id: varchar("id", { length: 255 }).primaryKey(),
  demonstrationId: varchar("demonstration_id", { length: 255 }).notNull().references(() => demonstrations.id, { onDelete: "cascade" }),
  sessionId: text("session_id").notNull(),
  category: text("category").notNull(),
  urgency: text("urgency").notNull().default("follow_up"),
  details: text("details").notNull(),
  status: text("status").notNull().default("open"),
  organizerResponse: text("organizer_response"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  acknowledgedAt: timestamp("acknowledged_at"),
  resolvedAt: timestamp("resolved_at"),
});

export const runSheetItems = pgTable("run_sheet_items", {
  id: varchar("id", { length: 255 }).primaryKey(),
  demonstrationId: varchar("demonstration_id", { length: 255 }).notNull().references(() => demonstrations.id, { onDelete: "cascade" }),
  orderIndex: integer("order_index").notNull(),
  kind: text("kind").notNull().default("custom"),
  title: text("title").notNull(),
  participantNote: text("participant_note"),
  plannedDurationMinutes: integer("planned_duration_minutes").notNull().default(10),
  status: text("status").notNull().default("pending"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type RunSheetTemplateStage = {
  kind: "arrival" | "welcome" | "chant" | "speaker" | "movement" | "break" | "closing" | "custom";
  title: string;
  participantNote: string | null;
  plannedDurationMinutes: number;
};

export const runSheetTemplates = pgTable("run_sheet_templates", {
  id: varchar("id", { length: 255 }).primaryKey(),
  ownerUserId: varchar("owner_user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull().default("custom"),
  stages: jsonb("stages").$type<RunSheetTemplateStage[]>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, lastActivityAt: true });
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
export type StoredEventRegistration = typeof eventRegistrations.$inferSelect;
export type StoredAudienceQuestionRow = typeof audienceQuestions.$inferSelect;
export type StoredSafetyCheck = typeof safetyChecks.$inferSelect;
export type StoredSafetyCheckResponse = typeof safetyCheckResponses.$inferSelect;
export type StoredAssistanceRequest = typeof assistanceRequests.$inferSelect;
export type StoredConductReport = typeof conductReports.$inferSelect;
export type StoredRunSheetItem = typeof runSheetItems.$inferSelect;
export type StoredRunSheetTemplate = typeof runSheetTemplates.$inferSelect;
