import {
  type User, type InsertUser,
  type Demonstration, type InsertDemonstration,
  type Chant, type InsertChant,
  type DemoState, type DemoAdmin,
  type RunSheetTemplateStage,
  users, demonstrations, chants, demoAdmins, demoState, viewSessions, eventRegistrations,
  safetyChecks, safetyCheckResponses, assistanceRequests, conductReports, runSheetItems, runSheetTemplates,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, asc, desc, inArray, isNull, or, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

type UserUpdate = Partial<InsertUser & {
  emailVerified: boolean;
  verificationToken: string | null;
  verificationTokenExpires: Date | null;
  passwordHash: string | null;
  passwordResetToken: string | null;
  passwordResetExpires: Date | null;
  lastActivityAt: Date;
}>;

export type UserDemoStats = {
  userId: string;
  demonstrationCount: number;
  lastDemonstrationAt: Date | null;
};

export type UserSummary = Pick<User, "id" | "email" | "name">;

export type RepeatDemonstrationOptions = {
  title: string;
  scheduledAt: Date | null;
  copyChants: boolean;
  copyLogistics: boolean;
  copySupport: boolean;
};

export type RepeatDemonstrationResult = {
  demo: Demonstration;
  copiedChants: number;
  copiedLogistics: boolean;
  copiedSupport: boolean;
  eventDurationMinutes: number;
};

export type SafetyCheckKind = "route_change" | "separation" | "weather" | "accessibility" | "general";
export type SafetyCheckResponseType = "ok" | "need_help" | "leaving" | "not_sure";
export type AssistanceType = "accessibility" | "connection" | "safety" | "organizer";
export type ConductReportCategory = "harassment" | "unsafe_behavior" | "privacy" | "misinformation" | "other";
export type ConductReportUrgency = "urgent" | "follow_up";
export type ConductReportStatus = "open" | "acknowledged" | "resolved";
export type RunSheetItemKind = "arrival" | "welcome" | "chant" | "speaker" | "movement" | "break" | "closing" | "custom";
export type RunSheetItemStatus = "pending" | "active" | "completed" | "skipped";
export type RunSheetTransition = "start" | "advance" | "skip" | "reopen";

export type AttendanceTimelinePoint = {
  startedAt: Date;
  firstJoins: number;
  returnVisits: number;
};

export type AttendanceSummary = {
  uniqueParticipants: number;
  totalVisits: number;
  returningParticipants: number;
  reconnectVisits: number;
  peakConcurrent: number;
  observedSeconds: number;
  firstJoinAt: Date | null;
  lastSeenAt: Date | null;
  timeline: AttendanceTimelinePoint[];
};

export type ParticipantAttendanceReceipt = {
  firstJoinAt: Date;
  lastSeenAt: Date;
  visitCount: number;
  observedSeconds: number;
};

export type EventRegistrationSettings = {
  enabled: boolean;
  capacity: number | null;
  closesAt: Date | null;
  manuallyClosed: boolean;
};

export type EventRegistrationSummary = EventRegistrationSettings & {
  closed: boolean;
  confirmed: number;
  waitlisted: number;
  available: number | null;
  overCapacity: number;
  confirmedAttended: number;
  turnoutRate: number | null;
};

export type ParticipantRegistrationReceipt = {
  status: "confirmed" | "waitlisted";
  registeredAt: Date;
  updatedAt: Date;
  waitlistPosition: number | null;
};

export type StoredSafetyCheckResponse = {
  sessionId: string;
  response: SafetyCheckResponseType;
  note: string | null;
  updatedAt: Date;
};

export type StoredSafetyCheck = {
  id: string;
  demoId: string;
  kind: SafetyCheckKind;
  message: string;
  instruction: string;
  status: "open" | "closed";
  responses: StoredSafetyCheckResponse[];
  resolutionMessage: string | null;
  createdAt: Date;
  closedAt: Date | null;
};

export type StoredAssistanceRequest = {
  id: string;
  demoId: string;
  type: AssistanceType;
  message: string;
  sessionId: string;
  status: "open" | "resolved";
  createdAt: Date;
  resolvedAt: Date | null;
};

export type StoredConductReport = {
  id: string;
  demoId: string;
  sessionId: string;
  category: ConductReportCategory;
  urgency: ConductReportUrgency;
  details: string;
  status: ConductReportStatus;
  organizerResponse: string | null;
  createdAt: Date;
  updatedAt: Date;
  acknowledgedAt: Date | null;
  resolvedAt: Date | null;
};

export type StoredRunSheetItem = {
  id: string;
  demoId: string;
  orderIndex: number;
  kind: RunSheetItemKind;
  title: string;
  participantNote: string | null;
  plannedDurationMinutes: number;
  status: RunSheetItemStatus;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type StoredRunSheetTemplate = {
  id: string;
  ownerUserId: string;
  name: string;
  description: string | null;
  category: string;
  stages: RunSheetTemplateStage[];
  createdAt: Date;
  updatedAt: Date;
};

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByVerificationToken(token: string): Promise<User | undefined>;
  getUserByPasswordResetToken(token: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(userId: string, data: UserUpdate): Promise<User | undefined>;
  touchUserActivity(userId: string): Promise<void>;
  getAllUsers(): Promise<User[]>;
  getUsersByIds(userIds: string[]): Promise<UserSummary[]>;
  getUserDemoStats(): Promise<UserDemoStats[]>;
  updateUserRole(userId: string, role: string): Promise<void>;
  deleteUser(userId: string): Promise<void>;
  getUserCount(): Promise<number>;

  createDemonstration(data: InsertDemonstration): Promise<Demonstration>;
  repeatDemonstration(sourceId: string, createdBy: string, options: RepeatDemonstrationOptions): Promise<RepeatDemonstrationResult>;
  getDemonstration(id: string): Promise<Demonstration | undefined>;
  getDemonstrationByPublicId(publicId: string): Promise<Demonstration | undefined>;
  getDemonstrations(userId: string, role: string): Promise<Demonstration[]>;
  getLiveDemonstrations(): Promise<Demonstration[]>;
  updateDemoStatus(id: string, status: string): Promise<void>;
  updateDemoTitle(id: string, title: string): Promise<Demonstration | undefined>;
  updateDemoSupport(id: string, data: { supportUrl: string | null; supportLabel: string | null }): Promise<Demonstration | undefined>;
  updateDemoLogistics(id: string, data: { scheduledAt: Date | null; locationName: string | null; meetingPoint: string | null; arrivalNote: string | null }): Promise<Demonstration | undefined>;

  startViewSession(demonstrationId: string, sessionHash: string): Promise<string>;
  touchViewSession(viewSessionId: string): Promise<void>;
  endViewSession(viewSessionId: string): Promise<void>;
  getAttendanceSummary(demonstrationId: string): Promise<AttendanceSummary>;
  getParticipantAttendance(demonstrationId: string, sessionHash: string): Promise<ParticipantAttendanceReceipt | null>;
  deleteParticipantAttendance(demonstrationId: string, sessionHash: string): Promise<number>;
  updateEventRegistrationSettings(demonstrationId: string, settings: EventRegistrationSettings): Promise<EventRegistrationSummary>;
  getEventRegistrationSummary(demonstrationId: string): Promise<EventRegistrationSummary>;
  getParticipantRegistration(demonstrationId: string, sessionHash: string): Promise<ParticipantRegistrationReceipt | null>;
  reserveEventPlace(demonstrationId: string, sessionHash: string): Promise<ParticipantRegistrationReceipt>;
  cancelEventRegistration(demonstrationId: string, sessionHash: string): Promise<{ canceled: boolean; promoted: number }>;

  getChants(demonstrationId: string): Promise<Chant[]>;
  addChant(data: InsertChant): Promise<Chant>;
  updateChant(id: string, data: Partial<InsertChant>): Promise<Chant | undefined>;
  deleteChant(id: string): Promise<void>;
  reorderChants(demonstrationId: string, chantId: string, direction: "up" | "down"): Promise<void>;

  getDemoState(demonstrationId: string): Promise<DemoState | undefined>;
  setCurrentChant(demonstrationId: string, chantId: string): Promise<void>;
  initDemoState(demonstrationId: string): Promise<void>;
  setRotationPhase(demonstrationId: string, currentPhase: "leader" | "people", currentCycle: number): Promise<void>;
  updateAutoRotation(demonstrationId: string, autoRotate: boolean, rotationInterval: number, cycleCount: number, leaderDuration: number, peopleDuration: number, cycleDelay: number): Promise<void>;
  updateEventDuration(demonstrationId: string, eventDurationMinutes: number): Promise<void>;
  setLiveStartedAt(demonstrationId: string, startTime: Date): Promise<void>;
  resetLiveStartedAt(demonstrationId: string): Promise<void>;
  claimLiveControl(demonstrationId: string, userId: string, force?: boolean): Promise<DemoState | undefined>;
  transferLiveControl(demonstrationId: string, actingUserId: string, targetUserId: string, force?: boolean): Promise<DemoState | undefined>;
  releaseLiveControl(demonstrationId: string, actingUserId: string, force?: boolean): Promise<DemoState | undefined>;
  
  deleteDemonstration(id: string): Promise<void>;
  addDemoAdmin(demonstrationId: string, userId: string): Promise<void>;
  removeDemoAdmin(demonstrationId: string, userId: string): Promise<void>;
  getDemoAdmins(demonstrationId: string): Promise<DemoAdmin[]>;
  isDemoAdmin(demonstrationId: string, userId: string): Promise<boolean>;

  getSafetyChecks(demonstrationId: string): Promise<StoredSafetyCheck[]>;
  createSafetyCheck(demonstrationId: string, data: { kind: SafetyCheckKind; message: string; instruction: string }): Promise<StoredSafetyCheck>;
  closeSafetyCheck(demonstrationId: string, safetyCheckId: string, resolutionMessage: string): Promise<StoredSafetyCheck | undefined>;
  upsertSafetyCheckResponse(demonstrationId: string, safetyCheckId: string, data: { sessionId: string; response: SafetyCheckResponseType; note: string | null }): Promise<{ check: StoredSafetyCheck; created: boolean } | undefined>;
  getAssistanceRequests(demonstrationId: string): Promise<StoredAssistanceRequest[]>;
  createAssistanceRequest(demonstrationId: string, data: { type: AssistanceType; message: string; sessionId: string }): Promise<{ request: StoredAssistanceRequest; created: boolean }>;
  resolveAssistanceRequest(demonstrationId: string, requestId: string): Promise<StoredAssistanceRequest | undefined>;
  getConductReports(demonstrationId: string): Promise<StoredConductReport[]>;
  getParticipantConductReports(demonstrationId: string, sessionId: string): Promise<StoredConductReport[]>;
  createConductReport(demonstrationId: string, data: { sessionId: string; category: ConductReportCategory; urgency: ConductReportUrgency; details: string }): Promise<{ report: StoredConductReport; created: boolean }>;
  updateConductReport(demonstrationId: string, reportId: string, data: { status: ConductReportStatus; organizerResponse: string | null }): Promise<StoredConductReport | undefined>;
  getRunSheetItems(demonstrationId: string): Promise<StoredRunSheetItem[]>;
  createRunSheetItem(demonstrationId: string, data: { kind: RunSheetItemKind; title: string; participantNote: string | null; plannedDurationMinutes: number }): Promise<StoredRunSheetItem>;
  updateRunSheetItem(demonstrationId: string, itemId: string, data: { kind: RunSheetItemKind; title: string; participantNote: string | null; plannedDurationMinutes: number }): Promise<StoredRunSheetItem | undefined>;
  moveRunSheetItem(demonstrationId: string, itemId: string, direction: "up" | "down"): Promise<StoredRunSheetItem[]>;
  deleteRunSheetItem(demonstrationId: string, itemId: string): Promise<boolean>;
  transitionRunSheetItem(demonstrationId: string, itemId: string, transition: RunSheetTransition): Promise<StoredRunSheetItem[]>;
  getRunSheetTemplates(ownerUserId: string): Promise<StoredRunSheetTemplate[]>;
  getRunSheetTemplate(ownerUserId: string, templateId: string): Promise<StoredRunSheetTemplate | undefined>;
  createRunSheetTemplate(ownerUserId: string, data: { name: string; description: string | null; category: string; stages: RunSheetTemplateStage[] }): Promise<StoredRunSheetTemplate>;
  deleteRunSheetTemplate(ownerUserId: string, templateId: string): Promise<boolean>;
  applyRunSheetTemplate(demonstrationId: string, stages: RunSheetTemplateStage[], mode: "replace" | "append"): Promise<StoredRunSheetItem[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }


  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.verificationToken, token));
    return user;
  }

  async getUserByPasswordResetToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.passwordResetToken, token));
    return user;
  }

  async createUser(data: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(data).returning();
    return user;
  }

  async updateUser(userId: string, data: UserUpdate): Promise<User | undefined> {
    const [user] = await db.update(users).set(data).where(eq(users.id, userId)).returning();
    return user;
  }

  async touchUserActivity(userId: string): Promise<void> {
    await db.update(users).set({ lastActivityAt: new Date() }).where(eq(users.id, userId));
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(asc(users.createdAt));
  }

  async getUsersByIds(userIds: string[]): Promise<UserSummary[]> {
    if (userIds.length === 0) return [];

    return db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
      })
      .from(users)
      .where(inArray(users.id, userIds));
  }

  async getUserDemoStats(): Promise<UserDemoStats[]> {
    const rows = await db
      .select({
        userId: users.id,
        demonstrationCount: sql<number>`count(distinct ${demonstrations.id})`,
        lastDemonstrationAt: sql<Date | null>`max(${demonstrations.createdAt})`,
      })
      .from(users)
      .leftJoin(demoAdmins, eq(demoAdmins.userId, users.id))
      .leftJoin(
        demonstrations,
        sql`${demonstrations.createdBy} = ${users.id} OR ${demonstrations.id} = ${demoAdmins.demonstrationId}`,
      )
      .groupBy(users.id);

    return rows.map((row) => ({
      userId: row.userId,
      demonstrationCount: Number(row.demonstrationCount),
      lastDemonstrationAt: row.lastDemonstrationAt,
    }));
  }

  async updateUserRole(userId: string, role: string): Promise<void> {
    await db.update(users).set({ role }).where(eq(users.id, userId));
  }

  async deleteUser(userId: string): Promise<void> {
    await db.delete(users).where(eq(users.id, userId));
  }

  async getUserCount(): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)` }).from(users);
    return Number(result.count);
  }

  async createDemonstration(data: InsertDemonstration): Promise<Demonstration> {
    const publicId = nanoid(8);
    const [demo] = await db.insert(demonstrations).values({ ...data, publicId }).returning();
    return demo;
  }

  async getDemonstration(id: string): Promise<Demonstration | undefined> {
    const [demo] = await db.select().from(demonstrations).where(eq(demonstrations.id, id));
    return demo;
  }

  async getDemonstrationByPublicId(publicId: string): Promise<Demonstration | undefined> {
    const [demo] = await db.select().from(demonstrations).where(eq(demonstrations.publicId, publicId));
    return demo;
  }

  async getDemonstrations(userId: string, role: string): Promise<Demonstration[]> {
    if (role === "super_admin") {
      return db.select().from(demonstrations).orderBy(desc(demonstrations.createdAt));
    }
    const adminLinks = await db.select().from(demoAdmins).where(eq(demoAdmins.userId, userId));
    const adminDemoIds = adminLinks.map((a) => a.demonstrationId);

    const allDemos = await db.select().from(demonstrations)
      .where(
        adminDemoIds.length > 0
          ? sql`${demonstrations.id} IN (${sql.join(adminDemoIds.map(id => sql`${id}`), sql`, `)}) OR ${demonstrations.createdBy} = ${userId}`
          : eq(demonstrations.createdBy, userId)
      )
      .orderBy(desc(demonstrations.createdAt));
    return allDemos;
  }

  async getLiveDemonstrations(): Promise<Demonstration[]> {
    return db.select().from(demonstrations).where(eq(demonstrations.status, "live"));
  }

  async updateDemoTitle(id: string, title: string): Promise<Demonstration | undefined> {
    const [demo] = await db.update(demonstrations).set({ title }).where(eq(demonstrations.id, id)).returning();
    return demo;
  }

  async startViewSession(demonstrationId: string, sessionHash: string): Promise<string> {
    const id = nanoid();
    const now = new Date();
    await db.insert(viewSessions).values({ id, demonstrationId, sessionId: sessionHash, firstSeenAt: now, lastSeenAt: now });
    return id;
  }

  async touchViewSession(viewSessionId: string): Promise<void> {
    await db.update(viewSessions).set({ lastSeenAt: new Date() }).where(eq(viewSessions.id, viewSessionId));
  }

  async endViewSession(viewSessionId: string): Promise<void> {
    const now = new Date();
    await db.update(viewSessions).set({ lastSeenAt: now, disconnectedAt: now }).where(eq(viewSessions.id, viewSessionId));
  }

  async getAttendanceSummary(demonstrationId: string): Promise<AttendanceSummary> {
    const visits = await db.select().from(viewSessions)
      .where(eq(viewSessions.demonstrationId, demonstrationId))
      .orderBy(asc(viewSessions.firstSeenAt));
    const sessions = new Map<string, number>();
    const timeline = new Map<number, { firstJoins: number; returnVisits: number }>();
    const sweep: Array<{ at: number; delta: number }> = [];
    let observedSeconds = 0;

    for (const visit of visits) {
      const priorVisits = sessions.get(visit.sessionId) ?? 0;
      sessions.set(visit.sessionId, priorVisits + 1);
      const bucket = new Date(visit.firstSeenAt);
      bucket.setMinutes(0, 0, 0);
      const bucketTime = bucket.getTime();
      const point = timeline.get(bucketTime) ?? { firstJoins: 0, returnVisits: 0 };
      if (priorVisits === 0) point.firstJoins += 1;
      else point.returnVisits += 1;
      timeline.set(bucketTime, point);

      const start = visit.firstSeenAt.getTime();
      const end = Math.max(start, (visit.disconnectedAt ?? visit.lastSeenAt).getTime());
      observedSeconds += Math.min(86_400, Math.max(0, Math.round((end - start) / 1_000)));
      sweep.push({ at: start, delta: 1 }, { at: end, delta: -1 });
    }

    sweep.sort((a, b) => a.at - b.at || b.delta - a.delta);
    let concurrent = 0;
    let peakConcurrent = 0;
    for (const event of sweep) {
      concurrent += event.delta;
      peakConcurrent = Math.max(peakConcurrent, concurrent);
    }

    return {
      uniqueParticipants: sessions.size,
      totalVisits: visits.length,
      returningParticipants: Array.from(sessions.values()).filter((count) => count > 1).length,
      reconnectVisits: Math.max(0, visits.length - sessions.size),
      peakConcurrent,
      observedSeconds,
      firstJoinAt: visits[0]?.firstSeenAt ?? null,
      lastSeenAt: visits.reduce<Date | null>((latest, visit) => !latest || visit.lastSeenAt > latest ? visit.lastSeenAt : latest, null),
      timeline: Array.from(timeline.entries()).sort(([a], [b]) => a - b).slice(-12).map(([startedAt, point]) => ({ startedAt: new Date(startedAt), ...point })),
    };
  }

  async getParticipantAttendance(demonstrationId: string, sessionHash: string): Promise<ParticipantAttendanceReceipt | null> {
    const visits = await db.select().from(viewSessions).where(and(
      eq(viewSessions.demonstrationId, demonstrationId),
      eq(viewSessions.sessionId, sessionHash),
    )).orderBy(asc(viewSessions.firstSeenAt));
    if (visits.length === 0) return null;
    const observedSeconds = visits.reduce((total, visit) => {
      const end = Math.max(visit.firstSeenAt.getTime(), (visit.disconnectedAt ?? visit.lastSeenAt).getTime());
      return total + Math.min(86_400, Math.max(0, Math.round((end - visit.firstSeenAt.getTime()) / 1_000)));
    }, 0);
    return {
      firstJoinAt: visits[0].firstSeenAt,
      lastSeenAt: visits.reduce((latest, visit) => visit.lastSeenAt > latest ? visit.lastSeenAt : latest, visits[0].lastSeenAt),
      visitCount: visits.length,
      observedSeconds,
    };
  }

  async deleteParticipantAttendance(demonstrationId: string, sessionHash: string): Promise<number> {
    const deleted = await db.delete(viewSessions).where(and(
      eq(viewSessions.demonstrationId, demonstrationId),
      eq(viewSessions.sessionId, sessionHash),
    )).returning({ id: viewSessions.id });
    return deleted.length;
  }

  private registrationClosed(demo: Demonstration, now = new Date()): boolean {
    return !demo.registrationEnabled
      || demo.status === "ended"
      || demo.registrationClosed
      || Boolean(demo.registrationClosesAt && demo.registrationClosesAt.getTime() <= now.getTime());
  }

  async getEventRegistrationSummary(demonstrationId: string): Promise<EventRegistrationSummary> {
    const demo = await this.getDemonstration(demonstrationId);
    if (!demo) throw new Error("DEMONSTRATION_NOT_FOUND");
    const rows = await db.select({ status: eventRegistrations.status, count: sql<number>`count(*)` })
      .from(eventRegistrations)
      .where(eq(eventRegistrations.demonstrationId, demonstrationId))
      .groupBy(eventRegistrations.status);
    const confirmed = Number(rows.find((row) => row.status === "confirmed")?.count ?? 0);
    const waitlisted = Number(rows.find((row) => row.status === "waitlisted")?.count ?? 0);
    const attendedResult = await db.execute(sql`
      SELECT count(*)::int AS count
      FROM event_registrations registration
      WHERE registration.demonstration_id = ${demonstrationId}
        AND registration.status = 'confirmed'
        AND EXISTS (
          SELECT 1 FROM view_sessions visit
          WHERE visit.demonstration_id = registration.demonstration_id
            AND visit.session_id = registration.session_id
        )
    `);
    const confirmedAttended = Number((attendedResult.rows[0] as { count?: number | string } | undefined)?.count ?? 0);
    const capacity = demo.registrationCapacity;
    return {
      enabled: demo.registrationEnabled,
      capacity,
      closesAt: demo.registrationClosesAt,
      manuallyClosed: demo.registrationClosed,
      closed: this.registrationClosed(demo),
      confirmed,
      waitlisted,
      available: capacity === null ? null : Math.max(0, capacity - confirmed),
      overCapacity: capacity === null ? 0 : Math.max(0, confirmed - capacity),
      confirmedAttended,
      turnoutRate: confirmed > 0 ? Math.round((confirmedAttended / confirmed) * 100) : null,
    };
  }

  async updateEventRegistrationSettings(demonstrationId: string, settings: EventRegistrationSettings): Promise<EventRegistrationSummary> {
    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT id FROM demonstrations WHERE id = ${demonstrationId} FOR UPDATE`);
      const [demo] = await tx.update(demonstrations).set({
        registrationEnabled: settings.enabled,
        registrationCapacity: settings.capacity,
        registrationClosesAt: settings.closesAt,
        registrationClosed: settings.manuallyClosed,
      }).where(eq(demonstrations.id, demonstrationId)).returning();
      if (!demo) throw new Error("DEMONSTRATION_NOT_FOUND");
      if (!settings.enabled || settings.capacity === null) return;
      const [confirmedRow] = await tx.select({ count: sql<number>`count(*)` }).from(eventRegistrations).where(and(
        eq(eventRegistrations.demonstrationId, demonstrationId),
        eq(eventRegistrations.status, "confirmed"),
      ));
      const available = Math.max(0, settings.capacity - Number(confirmedRow?.count ?? 0));
      if (available === 0) return;
      const promote = await tx.select({ sessionId: eventRegistrations.sessionId }).from(eventRegistrations).where(and(
        eq(eventRegistrations.demonstrationId, demonstrationId),
        eq(eventRegistrations.status, "waitlisted"),
      )).orderBy(asc(eventRegistrations.registeredAt)).limit(available);
      if (promote.length > 0) {
        await tx.update(eventRegistrations).set({ status: "confirmed", updatedAt: new Date() }).where(and(
          eq(eventRegistrations.demonstrationId, demonstrationId),
          inArray(eventRegistrations.sessionId, promote.map((row) => row.sessionId)),
        ));
      }
    });
    return this.getEventRegistrationSummary(demonstrationId);
  }

  async getParticipantRegistration(demonstrationId: string, sessionHash: string): Promise<ParticipantRegistrationReceipt | null> {
    const [registration] = await db.select().from(eventRegistrations).where(and(
      eq(eventRegistrations.demonstrationId, demonstrationId),
      eq(eventRegistrations.sessionId, sessionHash),
    ));
    if (!registration) return null;
    let waitlistPosition: number | null = null;
    if (registration.status === "waitlisted") {
      const waitlist = await db.select({ sessionId: eventRegistrations.sessionId }).from(eventRegistrations).where(and(
        eq(eventRegistrations.demonstrationId, demonstrationId),
        eq(eventRegistrations.status, "waitlisted"),
      )).orderBy(asc(eventRegistrations.registeredAt));
      const index = waitlist.findIndex((row) => row.sessionId === sessionHash);
      waitlistPosition = index >= 0 ? index + 1 : null;
    }
    return {
      status: registration.status === "waitlisted" ? "waitlisted" : "confirmed",
      registeredAt: registration.registeredAt,
      updatedAt: registration.updatedAt,
      waitlistPosition,
    };
  }

  async reserveEventPlace(demonstrationId: string, sessionHash: string): Promise<ParticipantRegistrationReceipt> {
    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT id FROM demonstrations WHERE id = ${demonstrationId} FOR UPDATE`);
      const [demo] = await tx.select().from(demonstrations).where(eq(demonstrations.id, demonstrationId));
      if (!demo) throw new Error("DEMONSTRATION_NOT_FOUND");
      const [existing] = await tx.select().from(eventRegistrations).where(and(
        eq(eventRegistrations.demonstrationId, demonstrationId),
        eq(eventRegistrations.sessionId, sessionHash),
      ));
      if (existing) return;
      if (!demo.registrationEnabled) throw new Error("REGISTRATION_DISABLED");
      if (this.registrationClosed(demo)) throw new Error("REGISTRATION_CLOSED");
      if (demo.registrationCapacity === null) throw new Error("REGISTRATION_CAPACITY_REQUIRED");
      const [confirmedRow] = await tx.select({ count: sql<number>`count(*)` }).from(eventRegistrations).where(and(
        eq(eventRegistrations.demonstrationId, demonstrationId),
        eq(eventRegistrations.status, "confirmed"),
      ));
      const status = Number(confirmedRow?.count ?? 0) < demo.registrationCapacity ? "confirmed" : "waitlisted";
      await tx.insert(eventRegistrations).values({
        demonstrationId,
        sessionId: sessionHash,
        status,
        registeredAt: new Date(),
        updatedAt: new Date(),
      }).onConflictDoNothing();
    });
    const receipt = await this.getParticipantRegistration(demonstrationId, sessionHash);
    if (!receipt) throw new Error("REGISTRATION_FAILED");
    return receipt;
  }

  async cancelEventRegistration(demonstrationId: string, sessionHash: string): Promise<{ canceled: boolean; promoted: number }> {
    return db.transaction(async (tx) => {
      await tx.execute(sql`SELECT id FROM demonstrations WHERE id = ${demonstrationId} FOR UPDATE`);
      const [demo] = await tx.select().from(demonstrations).where(eq(demonstrations.id, demonstrationId));
      if (!demo) throw new Error("DEMONSTRATION_NOT_FOUND");
      const [registration] = await tx.select().from(eventRegistrations).where(and(
        eq(eventRegistrations.demonstrationId, demonstrationId),
        eq(eventRegistrations.sessionId, sessionHash),
      ));
      if (!registration) return { canceled: false, promoted: 0 };
      await tx.delete(eventRegistrations).where(and(
        eq(eventRegistrations.demonstrationId, demonstrationId),
        eq(eventRegistrations.sessionId, sessionHash),
      ));
      let promoted = 0;
      if (registration.status === "confirmed" && demo.registrationEnabled && demo.registrationCapacity !== null) {
        const [confirmedRow] = await tx.select({ count: sql<number>`count(*)` }).from(eventRegistrations).where(and(
          eq(eventRegistrations.demonstrationId, demonstrationId),
          eq(eventRegistrations.status, "confirmed"),
        ));
        const hasAvailablePlace = Number(confirmedRow?.count ?? 0) < demo.registrationCapacity;
        if (!hasAvailablePlace) return { canceled: true, promoted };
        const [next] = await tx.select({ sessionId: eventRegistrations.sessionId }).from(eventRegistrations).where(and(
          eq(eventRegistrations.demonstrationId, demonstrationId),
          eq(eventRegistrations.status, "waitlisted"),
        )).orderBy(asc(eventRegistrations.registeredAt)).limit(1);
        if (next) {
          await tx.update(eventRegistrations).set({ status: "confirmed", updatedAt: new Date() }).where(and(
            eq(eventRegistrations.demonstrationId, demonstrationId),
            eq(eventRegistrations.sessionId, next.sessionId),
          ));
          promoted = 1;
        }
      }
      return { canceled: true, promoted };
    });
  }

  async repeatDemonstration(
    sourceId: string,
    createdBy: string,
    options: RepeatDemonstrationOptions,
  ): Promise<RepeatDemonstrationResult> {
    return db.transaction(async (tx) => {
      const [source] = await tx.select().from(demonstrations).where(eq(demonstrations.id, sourceId));
      if (!source) {
        throw new Error("SOURCE_DEMONSTRATION_NOT_FOUND");
      }

      const sourceChants = options.copyChants
        ? await tx.select().from(chants).where(eq(chants.demonstrationId, sourceId)).orderBy(asc(chants.orderIndex))
        : [];
      const [sourceState] = await tx.select().from(demoState).where(eq(demoState.demonstrationId, sourceId));
      const publicId = nanoid(8);
      const [demo] = await tx.insert(demonstrations).values({
        publicId,
        title: options.title,
        status: "draft",
        createdBy,
        scheduledAt: options.scheduledAt,
        locationName: options.copyLogistics ? source.locationName : null,
        meetingPoint: options.copyLogistics ? source.meetingPoint : null,
        arrivalNote: options.copyLogistics ? source.arrivalNote : null,
        supportUrl: options.copySupport ? source.supportUrl : null,
        supportLabel: options.copySupport ? source.supportLabel : null,
      }).returning();

      await tx.insert(demoAdmins).values({ demonstrationId: demo.id, userId: createdBy });

      if (sourceChants.length > 0) {
        await tx.insert(chants).values(sourceChants.map((chant) => ({
          demonstrationId: demo.id,
          orderIndex: chant.orderIndex,
          callText: chant.callText,
          responseText: chant.responseText,
          cycles: chant.cycles,
          leaderDuration: chant.leaderDuration,
          peopleDuration: chant.peopleDuration,
        })));
      }

      const eventDurationMinutes = sourceState?.eventDurationMinutes ?? 300;
      await tx.insert(demoState).values({
        demonstrationId: demo.id,
        currentChantId: null,
        autoRotate: false,
        rotationInterval: options.copyChants ? (sourceState?.rotationInterval ?? 60) : 60,
        cycleCount: options.copyChants ? (sourceState?.cycleCount ?? 1) : 1,
        leaderDuration: options.copyChants ? (sourceState?.leaderDuration ?? 4) : 4,
        peopleDuration: options.copyChants ? (sourceState?.peopleDuration ?? 3) : 3,
        currentPhase: "leader",
        currentCycle: 1,
        cycleDelay: options.copyChants ? (sourceState?.cycleDelay ?? 500) : 500,
        eventDurationMinutes,
        liveStartedAt: null,
      });

      return {
        demo,
        copiedChants: sourceChants.length,
        copiedLogistics: options.copyLogistics,
        copiedSupport: options.copySupport && Boolean(source.supportUrl),
        eventDurationMinutes,
      };
    });
  }

  async updateDemoSupport(id: string, data: { supportUrl: string | null; supportLabel: string | null }): Promise<Demonstration | undefined> {
    const [demo] = await db.update(demonstrations).set(data).where(eq(demonstrations.id, id)).returning();
    return demo;
  }

  async updateDemoLogistics(id: string, data: { scheduledAt: Date | null; locationName: string | null; meetingPoint: string | null; arrivalNote: string | null }): Promise<Demonstration | undefined> {
    const [demo] = await db.update(demonstrations).set(data).where(eq(demonstrations.id, id)).returning();
    return demo;
  }

  async updateDemoStatus(id: string, status: string): Promise<void> {
    await db.update(demonstrations).set({ status }).where(eq(demonstrations.id, id));
  }

  async deleteDemonstration(id: string): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(demoState).where(eq(demoState.demonstrationId, id));
      await tx.delete(chants).where(eq(chants.demonstrationId, id));
      await tx.delete(demoAdmins).where(eq(demoAdmins.demonstrationId, id));
      await tx.delete(viewSessions).where(eq(viewSessions.demonstrationId, id));
      await tx.delete(demonstrations).where(eq(demonstrations.id, id));
    });
  }

  async getChants(demonstrationId: string): Promise<Chant[]> {
    return db.select().from(chants)
      .where(eq(chants.demonstrationId, demonstrationId))
      .orderBy(asc(chants.orderIndex));
  }

  async addChant(data: InsertChant): Promise<Chant> {
    const [chant] = await db.insert(chants).values(data).returning();
    return chant;
  }

  async updateChant(id: string, data: Partial<InsertChant>): Promise<Chant | undefined> {
    const [chant] = await db.update(chants).set(data).where(eq(chants.id, id)).returning();
    return chant;
  }

  async deleteChant(id: string): Promise<void> {
    await db.delete(chants).where(eq(chants.id, id));
  }

  async reorderChants(demonstrationId: string, chantId: string, direction: "up" | "down"): Promise<void> {
    const allChants = await this.getChants(demonstrationId);
    const idx = allChants.findIndex((c) => c.id === chantId);
    if (idx === -1) return;

    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= allChants.length) return;

    const current = allChants[idx];
    const swap = allChants[swapIdx];

    await db.update(chants).set({ orderIndex: swap.orderIndex }).where(eq(chants.id, current.id));
    await db.update(chants).set({ orderIndex: current.orderIndex }).where(eq(chants.id, swap.id));
  }

  async getDemoState(demonstrationId: string): Promise<DemoState | undefined> {
    const [s] = await db.select().from(demoState).where(eq(demoState.demonstrationId, demonstrationId));
    return s;
  }

  async setCurrentChant(demonstrationId: string, chantId: string): Promise<void> {
    const existing = await this.getDemoState(demonstrationId);
    if (existing) {
      await db.update(demoState)
        .set({ currentChantId: chantId, currentPhase: "leader", currentCycle: 1, updatedAt: new Date() })
        .where(eq(demoState.demonstrationId, demonstrationId));
    } else {
      await db.insert(demoState).values({ demonstrationId, currentChantId: chantId, currentPhase: "leader", currentCycle: 1 });
    }
  }

  async initDemoState(demonstrationId: string): Promise<void> {
    const existing = await this.getDemoState(demonstrationId);
    if (!existing) {
      await db.insert(demoState).values({ demonstrationId, currentChantId: null });
    }
  }


  async setRotationPhase(demonstrationId: string, currentPhase: "leader" | "people", currentCycle: number): Promise<void> {
    const existing = await this.getDemoState(demonstrationId);
    if (existing) {
      await db.update(demoState)
        .set({ currentPhase, currentCycle, updatedAt: new Date() })
        .where(eq(demoState.demonstrationId, demonstrationId));
    }
  }

  async updateAutoRotation(demonstrationId: string, autoRotate: boolean, rotationInterval: number, cycleCount: number, leaderDuration: number, peopleDuration: number, cycleDelay: number): Promise<void> {
    const existing = await this.getDemoState(demonstrationId);
    if (existing) {
      await db.update(demoState)
        .set({ autoRotate, rotationInterval, cycleCount, leaderDuration, peopleDuration, cycleDelay, updatedAt: new Date() })
        .where(eq(demoState.demonstrationId, demonstrationId));
    } else {
      await db.insert(demoState).values({ demonstrationId, currentChantId: null, autoRotate, rotationInterval, cycleCount, leaderDuration, peopleDuration, cycleDelay });
    }
  }

  async updateEventDuration(demonstrationId: string, eventDurationMinutes: number): Promise<void> {
    const existing = await this.getDemoState(demonstrationId);
    if (existing) {
      await db.update(demoState)
        .set({ eventDurationMinutes, updatedAt: new Date() })
        .where(eq(demoState.demonstrationId, demonstrationId));
    } else {
      await db.insert(demoState).values({ demonstrationId, eventDurationMinutes });
    }
  }

  async setLiveStartedAt(demonstrationId: string, startTime: Date): Promise<void> {
    const existing = await this.getDemoState(demonstrationId);
    if (existing) {
      await db.update(demoState)
        .set({ liveStartedAt: startTime, updatedAt: new Date() })
        .where(eq(demoState.demonstrationId, demonstrationId));
    } else {
      await db.insert(demoState).values({ demonstrationId, liveStartedAt: startTime });
    }
  }

  async resetLiveStartedAt(demonstrationId: string): Promise<void> {
    const existing = await this.getDemoState(demonstrationId);
    if (existing) {
      await db.update(demoState)
        .set({ liveStartedAt: null, updatedAt: new Date() })
        .where(eq(demoState.demonstrationId, demonstrationId));
    }
  }

  async claimLiveControl(demonstrationId: string, userId: string, force = false): Promise<DemoState | undefined> {
    await this.initDemoState(demonstrationId);
    const [updated] = await db.update(demoState)
      .set({ liveControllerUserId: userId, liveControlClaimedAt: new Date(), updatedAt: new Date() })
      .where(and(
        eq(demoState.demonstrationId, demonstrationId),
        force
          ? sql`true`
          : or(isNull(demoState.liveControllerUserId), eq(demoState.liveControllerUserId, userId)),
      ))
      .returning();
    return updated;
  }

  async transferLiveControl(demonstrationId: string, actingUserId: string, targetUserId: string, force = false): Promise<DemoState | undefined> {
    const [updated] = await db.update(demoState)
      .set({ liveControllerUserId: targetUserId, liveControlClaimedAt: new Date(), updatedAt: new Date() })
      .where(and(
        eq(demoState.demonstrationId, demonstrationId),
        force ? sql`true` : eq(demoState.liveControllerUserId, actingUserId),
      ))
      .returning();
    return updated;
  }

  async releaseLiveControl(demonstrationId: string, actingUserId: string, force = false): Promise<DemoState | undefined> {
    const [updated] = await db.update(demoState)
      .set({ liveControllerUserId: null, liveControlClaimedAt: null, updatedAt: new Date() })
      .where(and(
        eq(demoState.demonstrationId, demonstrationId),
        force ? sql`true` : eq(demoState.liveControllerUserId, actingUserId),
      ))
      .returning();
    return updated;
  }

  async addDemoAdmin(demonstrationId: string, userId: string): Promise<void> {
    await db.insert(demoAdmins).values({ demonstrationId, userId }).onConflictDoNothing();
  }

  async removeDemoAdmin(demonstrationId: string, userId: string): Promise<void> {
    await db.delete(demoAdmins).where(
      and(eq(demoAdmins.demonstrationId, demonstrationId), eq(demoAdmins.userId, userId))
    );
  }

  async getDemoAdmins(demonstrationId: string): Promise<DemoAdmin[]> {
    return db.select().from(demoAdmins).where(eq(demoAdmins.demonstrationId, demonstrationId));
  }

  async isDemoAdmin(demonstrationId: string, userId: string): Promise<boolean> {
    const [result] = await db.select().from(demoAdmins)
      .where(and(eq(demoAdmins.demonstrationId, demonstrationId), eq(demoAdmins.userId, userId)));
    return !!result;
  }

  async getSafetyChecks(demonstrationId: string): Promise<StoredSafetyCheck[]> {
    const checks = await db.select().from(safetyChecks)
      .where(eq(safetyChecks.demonstrationId, demonstrationId))
      .orderBy(desc(safetyChecks.createdAt))
      .limit(12);
    if (checks.length === 0) return [];

    const responses = await db.select().from(safetyCheckResponses)
      .where(inArray(safetyCheckResponses.safetyCheckId, checks.map((check) => check.id)))
      .orderBy(desc(safetyCheckResponses.updatedAt));
    const responsesByCheck = new Map<string, StoredSafetyCheckResponse[]>();
    for (const response of responses) {
      const list = responsesByCheck.get(response.safetyCheckId) ?? [];
      list.push({
        sessionId: response.sessionId,
        response: response.response as SafetyCheckResponseType,
        note: response.note,
        updatedAt: response.updatedAt,
      });
      responsesByCheck.set(response.safetyCheckId, list);
    }

    return checks.map((check) => ({
      id: check.id,
      demoId: check.demonstrationId,
      kind: check.kind as SafetyCheckKind,
      message: check.message,
      instruction: check.instruction,
      status: check.status as "open" | "closed",
      responses: responsesByCheck.get(check.id) ?? [],
      resolutionMessage: check.resolutionMessage,
      createdAt: check.createdAt,
      closedAt: check.closedAt,
    }));
  }

  async createSafetyCheck(demonstrationId: string, data: { kind: SafetyCheckKind; message: string; instruction: string }): Promise<StoredSafetyCheck> {
    const id = crypto.randomUUID();
    const now = new Date();
    await db.transaction(async (tx) => {
      await tx.update(safetyChecks).set({
        status: "closed",
        resolutionMessage: "This notice was replaced by a newer organiser update.",
        closedAt: now,
      }).where(and(
        eq(safetyChecks.demonstrationId, demonstrationId),
        eq(safetyChecks.status, "open"),
      ));
      await tx.insert(safetyChecks).values({
        id,
        demonstrationId,
        kind: data.kind,
        message: data.message,
        instruction: data.instruction,
        status: "open",
        createdAt: now,
      });

      const expired = await tx.select({ id: safetyChecks.id }).from(safetyChecks)
        .where(eq(safetyChecks.demonstrationId, demonstrationId))
        .orderBy(desc(safetyChecks.createdAt))
        .offset(12);
      if (expired.length > 0) {
        await tx.delete(safetyChecks).where(inArray(safetyChecks.id, expired.map((check) => check.id)));
      }
    });

    const check = (await this.getSafetyChecks(demonstrationId)).find((item) => item.id === id);
    if (!check) throw new Error("SAFETY_CHECK_NOT_CREATED");
    return check;
  }

  async closeSafetyCheck(demonstrationId: string, safetyCheckId: string, resolutionMessage: string): Promise<StoredSafetyCheck | undefined> {
    const existing = (await this.getSafetyChecks(demonstrationId)).find((item) => item.id === safetyCheckId);
    if (!existing || existing.status === "closed") return existing;
    const [updated] = await db.update(safetyChecks).set({
      status: "closed",
      resolutionMessage,
      closedAt: new Date(),
    }).where(and(
      eq(safetyChecks.id, safetyCheckId),
      eq(safetyChecks.demonstrationId, demonstrationId),
    )).returning({ id: safetyChecks.id });
    if (!updated) return (await this.getSafetyChecks(demonstrationId)).find((item) => item.id === safetyCheckId);
    return (await this.getSafetyChecks(demonstrationId)).find((item) => item.id === safetyCheckId);
  }

  async upsertSafetyCheckResponse(demonstrationId: string, safetyCheckId: string, data: { sessionId: string; response: SafetyCheckResponseType; note: string | null }): Promise<{ check: StoredSafetyCheck; created: boolean } | undefined> {
    const created = await db.transaction(async (tx) => {
      const [check] = await tx.select({ id: safetyChecks.id }).from(safetyChecks).where(and(
        eq(safetyChecks.id, safetyCheckId),
        eq(safetyChecks.demonstrationId, demonstrationId),
        eq(safetyChecks.status, "open"),
      ));
      if (!check) return undefined;

      const [existing] = await tx.select({ sessionId: safetyCheckResponses.sessionId }).from(safetyCheckResponses).where(and(
        eq(safetyCheckResponses.safetyCheckId, safetyCheckId),
        eq(safetyCheckResponses.sessionId, data.sessionId),
      ));
      await tx.insert(safetyCheckResponses).values({
        safetyCheckId,
        sessionId: data.sessionId,
        response: data.response,
        note: data.note,
        updatedAt: new Date(),
      }).onConflictDoUpdate({
        target: [safetyCheckResponses.safetyCheckId, safetyCheckResponses.sessionId],
        set: { response: data.response, note: data.note, updatedAt: new Date() },
      });
      return !existing;
    });
    if (created === undefined) return undefined;
    const check = (await this.getSafetyChecks(demonstrationId)).find((item) => item.id === safetyCheckId);
    return check ? { check, created } : undefined;
  }

  async getAssistanceRequests(demonstrationId: string): Promise<StoredAssistanceRequest[]> {
    const requests = await db.select().from(assistanceRequests)
      .where(eq(assistanceRequests.demonstrationId, demonstrationId))
      .orderBy(desc(assistanceRequests.createdAt))
      .limit(50);
    return requests.map((request) => ({
      id: request.id,
      demoId: request.demonstrationId,
      type: request.type as AssistanceType,
      message: request.message,
      sessionId: request.sessionId,
      status: request.status as "open" | "resolved",
      createdAt: request.createdAt,
      resolvedAt: request.resolvedAt,
    }));
  }

  async createAssistanceRequest(demonstrationId: string, data: { type: AssistanceType; message: string; sessionId: string }): Promise<{ request: StoredAssistanceRequest; created: boolean }> {
    const id = crypto.randomUUID();
    const inserted = await db.insert(assistanceRequests).values({
      id,
      demonstrationId,
      type: data.type,
      message: data.message,
      sessionId: data.sessionId,
      status: "open",
      createdAt: new Date(),
    }).onConflictDoNothing().returning({ id: assistanceRequests.id });
    const requests = await this.getAssistanceRequests(demonstrationId);
    const request = requests.find((item) => item.id === id) ?? requests.find((item) => (
      item.sessionId === data.sessionId && item.type === data.type && item.status === "open"
    ));
    if (!request) throw new Error("ASSISTANCE_REQUEST_NOT_CREATED");
    return { request, created: inserted.length > 0 };
  }

  async resolveAssistanceRequest(demonstrationId: string, requestId: string): Promise<StoredAssistanceRequest | undefined> {
    const [updated] = await db.update(assistanceRequests).set({
      status: "resolved",
      resolvedAt: new Date(),
    }).where(and(
      eq(assistanceRequests.id, requestId),
      eq(assistanceRequests.demonstrationId, demonstrationId),
    )).returning({ id: assistanceRequests.id });
    if (!updated) return undefined;
    return (await this.getAssistanceRequests(demonstrationId)).find((item) => item.id === requestId);
  }

  private mapConductReport(report: typeof conductReports.$inferSelect): StoredConductReport {
    return {
      id: report.id,
      demoId: report.demonstrationId,
      sessionId: report.sessionId,
      category: report.category as ConductReportCategory,
      urgency: report.urgency as ConductReportUrgency,
      details: report.details,
      status: report.status as ConductReportStatus,
      organizerResponse: report.organizerResponse,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
      acknowledgedAt: report.acknowledgedAt,
      resolvedAt: report.resolvedAt,
    };
  }

  async getConductReports(demonstrationId: string): Promise<StoredConductReport[]> {
    const reports = await db.select().from(conductReports)
      .where(eq(conductReports.demonstrationId, demonstrationId))
      .orderBy(desc(conductReports.createdAt))
      .limit(100);
    return reports.map((report) => this.mapConductReport(report));
  }

  async getParticipantConductReports(demonstrationId: string, sessionId: string): Promise<StoredConductReport[]> {
    const reports = await db.select().from(conductReports).where(and(
      eq(conductReports.demonstrationId, demonstrationId),
      eq(conductReports.sessionId, sessionId),
    )).orderBy(desc(conductReports.createdAt)).limit(12);
    return reports.map((report) => this.mapConductReport(report));
  }

  async createConductReport(demonstrationId: string, data: { sessionId: string; category: ConductReportCategory; urgency: ConductReportUrgency; details: string }): Promise<{ report: StoredConductReport; created: boolean }> {
    const id = crypto.randomUUID();
    const inserted = await db.insert(conductReports).values({
      id,
      demonstrationId,
      sessionId: data.sessionId,
      category: data.category,
      urgency: data.urgency,
      details: data.details,
      status: "open",
      createdAt: new Date(),
      updatedAt: new Date(),
    }).onConflictDoNothing().returning();
    const report = inserted[0]
      ? this.mapConductReport(inserted[0])
      : (await this.getParticipantConductReports(demonstrationId, data.sessionId)).find((item) => (
          item.category === data.category && item.status !== "resolved" && item.details.toLowerCase() === data.details.toLowerCase()
        ));
    if (!report) throw new Error("CONDUCT_REPORT_NOT_CREATED");
    return { report, created: inserted.length > 0 };
  }

  async updateConductReport(demonstrationId: string, reportId: string, data: { status: ConductReportStatus; organizerResponse: string | null }): Promise<StoredConductReport | undefined> {
    const now = new Date();
    const [existing] = await db.select().from(conductReports).where(and(
      eq(conductReports.id, reportId),
      eq(conductReports.demonstrationId, demonstrationId),
    ));
    if (!existing) return undefined;
    const [updated] = await db.update(conductReports).set({
      status: data.status,
      organizerResponse: data.organizerResponse,
      updatedAt: now,
      acknowledgedAt: data.status === "open" ? null : existing.acknowledgedAt ?? now,
      resolvedAt: data.status === "resolved" ? now : null,
    }).where(and(
      eq(conductReports.id, reportId),
      eq(conductReports.demonstrationId, demonstrationId),
    )).returning();
    return updated ? this.mapConductReport(updated) : undefined;
  }

  private mapRunSheetItem(item: typeof runSheetItems.$inferSelect): StoredRunSheetItem {
    return {
      id: item.id,
      demoId: item.demonstrationId,
      orderIndex: item.orderIndex,
      kind: item.kind as RunSheetItemKind,
      title: item.title,
      participantNote: item.participantNote,
      plannedDurationMinutes: item.plannedDurationMinutes,
      status: item.status as RunSheetItemStatus,
      startedAt: item.startedAt,
      completedAt: item.completedAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  async getRunSheetItems(demonstrationId: string): Promise<StoredRunSheetItem[]> {
    const items = await db.select().from(runSheetItems)
      .where(eq(runSheetItems.demonstrationId, demonstrationId))
      .orderBy(asc(runSheetItems.orderIndex));
    return items.map((item) => this.mapRunSheetItem(item));
  }

  async createRunSheetItem(demonstrationId: string, data: { kind: RunSheetItemKind; title: string; participantNote: string | null; plannedDurationMinutes: number }): Promise<StoredRunSheetItem> {
    const existing = await this.getRunSheetItems(demonstrationId);
    const [created] = await db.insert(runSheetItems).values({
      id: crypto.randomUUID(),
      demonstrationId,
      orderIndex: existing.length,
      kind: data.kind,
      title: data.title,
      participantNote: data.participantNote,
      plannedDurationMinutes: data.plannedDurationMinutes,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return this.mapRunSheetItem(created);
  }

  async updateRunSheetItem(demonstrationId: string, itemId: string, data: { kind: RunSheetItemKind; title: string; participantNote: string | null; plannedDurationMinutes: number }): Promise<StoredRunSheetItem | undefined> {
    const [updated] = await db.update(runSheetItems).set({
      kind: data.kind,
      title: data.title,
      participantNote: data.participantNote,
      plannedDurationMinutes: data.plannedDurationMinutes,
      updatedAt: new Date(),
    }).where(and(
      eq(runSheetItems.id, itemId),
      eq(runSheetItems.demonstrationId, demonstrationId),
    )).returning();
    return updated ? this.mapRunSheetItem(updated) : undefined;
  }

  async moveRunSheetItem(demonstrationId: string, itemId: string, direction: "up" | "down"): Promise<StoredRunSheetItem[]> {
    await db.transaction(async (tx) => {
      const items = await tx.select().from(runSheetItems)
        .where(eq(runSheetItems.demonstrationId, demonstrationId))
        .orderBy(asc(runSheetItems.orderIndex));
      const index = items.findIndex((item) => item.id === itemId);
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (index < 0 || targetIndex < 0 || targetIndex >= items.length) return;
      const current = items[index];
      const target = items[targetIndex];
      const now = new Date();
      await tx.update(runSheetItems).set({ orderIndex: target.orderIndex, updatedAt: now }).where(eq(runSheetItems.id, current.id));
      await tx.update(runSheetItems).set({ orderIndex: current.orderIndex, updatedAt: now }).where(eq(runSheetItems.id, target.id));
    });
    return this.getRunSheetItems(demonstrationId);
  }

  async deleteRunSheetItem(demonstrationId: string, itemId: string): Promise<boolean> {
    const deleted = await db.transaction(async (tx) => {
      const rows = await tx.delete(runSheetItems).where(and(
        eq(runSheetItems.id, itemId),
        eq(runSheetItems.demonstrationId, demonstrationId),
      )).returning({ id: runSheetItems.id });
      if (rows.length === 0) return false;
      const remaining = await tx.select().from(runSheetItems)
        .where(eq(runSheetItems.demonstrationId, demonstrationId))
        .orderBy(asc(runSheetItems.orderIndex));
      for (let index = 0; index < remaining.length; index += 1) {
        const item = remaining[index];
        if (item.orderIndex !== index) await tx.update(runSheetItems).set({ orderIndex: index }).where(eq(runSheetItems.id, item.id));
      }
      return true;
    });
    return deleted;
  }

  async transitionRunSheetItem(demonstrationId: string, itemId: string, transition: RunSheetTransition): Promise<StoredRunSheetItem[]> {
    await db.transaction(async (tx) => {
      const items = await tx.select().from(runSheetItems)
        .where(eq(runSheetItems.demonstrationId, demonstrationId))
        .orderBy(asc(runSheetItems.orderIndex));
      const item = items.find((candidate) => candidate.id === itemId);
      if (!item) throw new Error("RUN_SHEET_ITEM_NOT_FOUND");
      const now = new Date();
      const activateNext = async () => {
        const next =
          items.find((candidate) => candidate.orderIndex > item.orderIndex && candidate.status === "pending") ??
          items.find((candidate) => candidate.status === "pending");
        if (next) await tx.update(runSheetItems).set({ status: "active", startedAt: now, completedAt: null, updatedAt: now }).where(eq(runSheetItems.id, next.id));
      };

      if (transition === "start") {
        if (item.status !== "pending") throw new Error("RUN_SHEET_ITEM_NOT_PENDING");
        if (items.some((candidate) => candidate.status === "active")) throw new Error("RUN_SHEET_ACTIVE_EXISTS");
        await tx.update(runSheetItems).set({ status: "active", startedAt: now, completedAt: null, updatedAt: now }).where(eq(runSheetItems.id, item.id));
      } else if (transition === "advance") {
        if (item.status !== "active") throw new Error("RUN_SHEET_ITEM_NOT_ACTIVE");
        await tx.update(runSheetItems).set({ status: "completed", completedAt: now, updatedAt: now }).where(eq(runSheetItems.id, item.id));
        await activateNext();
      } else if (transition === "skip") {
        if (item.status !== "pending" && item.status !== "active") throw new Error("RUN_SHEET_ITEM_NOT_ACTIONABLE");
        await tx.update(runSheetItems).set({ status: "skipped", completedAt: now, updatedAt: now }).where(eq(runSheetItems.id, item.id));
        if (item.status === "active") await activateNext();
      } else {
        if (item.status !== "completed" && item.status !== "skipped") throw new Error("RUN_SHEET_ITEM_NOT_REOPENABLE");
        await tx.update(runSheetItems).set({ status: "pending", startedAt: null, completedAt: null, updatedAt: now }).where(eq(runSheetItems.id, item.id));
      }
    });
    return this.getRunSheetItems(demonstrationId);
  }

  private mapRunSheetTemplate(template: typeof runSheetTemplates.$inferSelect): StoredRunSheetTemplate {
    return {
      id: template.id,
      ownerUserId: template.ownerUserId,
      name: template.name,
      description: template.description,
      category: template.category,
      stages: template.stages,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }

  async getRunSheetTemplates(ownerUserId: string): Promise<StoredRunSheetTemplate[]> {
    const templates = await db.select().from(runSheetTemplates)
      .where(eq(runSheetTemplates.ownerUserId, ownerUserId))
      .orderBy(desc(runSheetTemplates.updatedAt));
    return templates.map((template) => this.mapRunSheetTemplate(template));
  }

  async getRunSheetTemplate(ownerUserId: string, templateId: string): Promise<StoredRunSheetTemplate | undefined> {
    const [template] = await db.select().from(runSheetTemplates).where(and(
      eq(runSheetTemplates.id, templateId),
      eq(runSheetTemplates.ownerUserId, ownerUserId),
    ));
    return template ? this.mapRunSheetTemplate(template) : undefined;
  }

  async createRunSheetTemplate(ownerUserId: string, data: { name: string; description: string | null; category: string; stages: RunSheetTemplateStage[] }): Promise<StoredRunSheetTemplate> {
    const now = new Date();
    const [created] = await db.insert(runSheetTemplates).values({
      id: crypto.randomUUID(),
      ownerUserId,
      name: data.name,
      description: data.description,
      category: data.category,
      stages: data.stages,
      createdAt: now,
      updatedAt: now,
    }).returning();
    return this.mapRunSheetTemplate(created);
  }

  async deleteRunSheetTemplate(ownerUserId: string, templateId: string): Promise<boolean> {
    const deleted = await db.delete(runSheetTemplates).where(and(
      eq(runSheetTemplates.id, templateId),
      eq(runSheetTemplates.ownerUserId, ownerUserId),
    )).returning({ id: runSheetTemplates.id });
    return deleted.length > 0;
  }

  async applyRunSheetTemplate(demonstrationId: string, stages: RunSheetTemplateStage[], mode: "replace" | "append"): Promise<StoredRunSheetItem[]> {
    await db.transaction(async (tx) => {
      const existing = await tx.select().from(runSheetItems)
        .where(eq(runSheetItems.demonstrationId, demonstrationId))
        .orderBy(asc(runSheetItems.orderIndex));
      if (existing.some((item) => item.status !== "pending")) throw new Error("RUN_SHEET_TEMPLATE_STARTED");
      const retainedCount = mode === "append" ? existing.length : 0;
      if (retainedCount + stages.length > 40) throw new Error("RUN_SHEET_TEMPLATE_LIMIT");
      if (mode === "replace") {
        await tx.delete(runSheetItems).where(eq(runSheetItems.demonstrationId, demonstrationId));
      }
      if (stages.length > 0) {
        const now = new Date();
        await tx.insert(runSheetItems).values(stages.map((stage, index) => ({
          id: crypto.randomUUID(),
          demonstrationId,
          orderIndex: retainedCount + index,
          kind: stage.kind,
          title: stage.title,
          participantNote: stage.participantNote,
          plannedDurationMinutes: stage.plannedDurationMinutes,
          status: "pending",
          createdAt: now,
          updatedAt: now,
        })));
      }
    });
    return this.getRunSheetItems(demonstrationId);
  }
}

export const storage = new DatabaseStorage();
