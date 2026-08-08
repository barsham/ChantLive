import {
  type User, type InsertUser,
  type Demonstration, type InsertDemonstration,
  type Chant, type InsertChant,
  type DemoState, type DemoAdmin,
  users, demonstrations, chants, demoAdmins, demoState, viewSessions,
  safetyChecks, safetyCheckResponses, assistanceRequests,
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
}

export const storage = new DatabaseStorage();
