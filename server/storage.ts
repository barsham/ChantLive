import {
  type User, type InsertUser,
  type Demonstration, type InsertDemonstration,
  type Chant, type InsertChant,
  type DemoState, type DemoAdmin,
  users, demonstrations, chants, demoAdmins, demoState, viewSessions,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, asc, desc, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUserRole(userId: string, role: string): Promise<void>;
  deleteUser(userId: string): Promise<void>;
  getUserCount(): Promise<number>;

  createDemonstration(data: InsertDemonstration): Promise<Demonstration>;
  getDemonstration(id: string): Promise<Demonstration | undefined>;
  getDemonstrationByPublicId(publicId: string): Promise<Demonstration | undefined>;
  getDemonstrations(userId: string, role: string): Promise<Demonstration[]>;
  updateDemoStatus(id: string, status: string): Promise<void>;

  getChants(demonstrationId: string): Promise<Chant[]>;
  addChant(data: InsertChant): Promise<Chant>;
  deleteChant(id: string): Promise<void>;
  reorderChants(demonstrationId: string, chantId: string, direction: "up" | "down"): Promise<void>;

  getDemoState(demonstrationId: string): Promise<DemoState | undefined>;
  setCurrentChant(demonstrationId: string, chantId: string): Promise<void>;
  initDemoState(demonstrationId: string): Promise<void>;

  addDemoAdmin(demonstrationId: string, userId: string): Promise<void>;
  getDemoAdmins(demonstrationId: string): Promise<DemoAdmin[]>;
  isDemoAdmin(demonstrationId: string, userId: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(data: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(data).returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(asc(users.createdAt));
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
    return db.select().from(demonstrations)
      .where(eq(demonstrations.createdBy, userId))
      .orderBy(desc(demonstrations.createdAt));
  }

  async updateDemoStatus(id: string, status: string): Promise<void> {
    await db.update(demonstrations).set({ status }).where(eq(demonstrations.id, id));
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
        .set({ currentChantId: chantId, updatedAt: new Date() })
        .where(eq(demoState.demonstrationId, demonstrationId));
    } else {
      await db.insert(demoState).values({ demonstrationId, currentChantId: chantId });
    }
  }

  async initDemoState(demonstrationId: string): Promise<void> {
    const existing = await this.getDemoState(demonstrationId);
    if (!existing) {
      await db.insert(demoState).values({ demonstrationId, currentChantId: null });
    }
  }

  async addDemoAdmin(demonstrationId: string, userId: string): Promise<void> {
    await db.insert(demoAdmins).values({ demonstrationId, userId }).onConflictDoNothing();
  }

  async getDemoAdmins(demonstrationId: string): Promise<DemoAdmin[]> {
    return db.select().from(demoAdmins).where(eq(demoAdmins.demonstrationId, demonstrationId));
  }

  async isDemoAdmin(demonstrationId: string, userId: string): Promise<boolean> {
    const [result] = await db.select().from(demoAdmins)
      .where(and(eq(demoAdmins.demonstrationId, demonstrationId), eq(demoAdmins.userId, userId)));
    return !!result;
  }
}

export const storage = new DatabaseStorage();
