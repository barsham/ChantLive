import type { Express } from "express";
import { type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { storage } from "./storage";
import { ensureDemoColumnsAndTables, ensureUserAuthColumns } from "./db";
import { setupAuth, requireAuth, requireSuperAdmin } from "./auth";
import QRCode from "qrcode";
import type { User } from "@shared/schema";

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      name: string;
      role: string;
      avatarUrl: string | null;
      createdAt: Date;
    }
  }
}

const demoViewers = new Map<string, Set<string>>();
const autoRotateTimers = new Map<string, NodeJS.Timeout>();
const autoRotateProgress = new Map<string, { phase: "leader" | "people"; cycle: number }>();

function getSingleParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function getViewerCount(demoId: string): number {
  return demoViewers.get(demoId)?.size ?? 0;
}

async function canAccessDemo(user: User, demoIdOrPublicId: string | string[] | undefined): Promise<boolean> {
  if (user.role === "super_admin") return true;
  const demo = await getDemoByIdentifier(demoIdOrPublicId);
  if (!demo) return false;
  if (demo.createdBy === user.id) return true;
  return storage.isDemoAdmin(demo.id, user.id);
}

async function getDemoByIdentifier(idOrPublicId: string | string[] | undefined) {
  const normalizedId = getSingleParam(idOrPublicId);
  if (!normalizedId) return undefined;

  const byId = await storage.getDemonstration(normalizedId);
  if (byId) return byId;
  return storage.getDemonstrationByPublicId(normalizedId);
}



async function emitCurrentChant(io: SocketIOServer, demo: any) {
  const chantsList = await storage.getChants(demo.id);
  const state = await storage.getDemoState(demo.id);
  const currentChant = state?.currentChantId ? chantsList.find((c) => c.id === state.currentChantId) : null;
  const chantIndex = currentChant ? chantsList.findIndex((c) => c.id === currentChant.id) : null;
  const nextChantIndex = chantIndex !== null && chantsList.length > 0 ? (chantIndex + 1) % chantsList.length : null;
  const nextChant = nextChantIndex !== null ? chantsList[nextChantIndex] : null;

  io.to(`demo:${demo.publicId}`).emit("chant_update", {
    callText: currentChant?.callText || null,
    responseText: currentChant?.responseText || null,
    nextCallText: nextChant?.callText || null,
    nextResponseText: nextChant?.responseText || null,
    chantIndex,
    totalChants: chantsList.length,
    demoTitle: demo.title,
    demoStatus: demo.status,
    currentPhase: state?.currentPhase ?? "leader",
    currentCycle: state?.currentCycle ?? 1,
    cycleCount: state?.cycleCount ?? 1,
  });
}
export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await ensureUserAuthColumns();
  await ensureDemoColumnsAndTables();
  setupAuth(app);

  const io = new SocketIOServer(httpServer, {
    cors: { origin: "*" },
    path: "/socket.io",
  });

  app.get("/api/demos", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const demos = await storage.getDemonstrations(user.id, user.role);
      res.json(demos);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch demonstrations" });
    }
  });

  app.post("/api/demos", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { title } = req.body;
      if (!title || typeof title !== "string" || title.trim().length === 0) {
        return res.status(400).json({ message: "Title is required" });
      }
      const demo = await storage.createDemonstration({
        title: title.trim(),
        status: "draft",
        createdBy: user.id,
      });
      await storage.addDemoAdmin(demo.id, user.id);
      res.json(demo);
    } catch (err) {
      res.status(500).json({ message: "Failed to create demonstration" });
    }
  });

  app.get("/api/demos/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const demo = await getDemoByIdentifier(req.params.id);
      if (!demo) return res.status(404).json({ message: "Not found" });

      if (!(await canAccessDemo(user, demo.id))) {
        return res.status(403).json({ message: "Access denied" });
      }

      const chantsList = await storage.getChants(demo.id);
      const state = await storage.getDemoState(demo.id);
      const viewerCount = getViewerCount(demo.id);

      const adminLinks = await storage.getDemoAdmins(demo.id);
      const admins = await Promise.all(
        adminLinks.map(async (a) => {
          const u = await storage.getUser(a.userId);
          return u ? { id: u.id, email: u.email, name: u.name, avatarUrl: u.avatarUrl } : null;
        })
      );

      res.json({ demo, chants: chantsList, state, viewerCount, admins: admins.filter(Boolean) });
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch demonstration" });
    }
  });

  app.patch("/api/demos/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const demo = await getDemoByIdentifier(req.params.id);
      if (!demo) return res.status(404).json({ message: "Not found" });
      if (!(await canAccessDemo(user, demo.id))) return res.status(403).json({ message: "Access denied" });

      const { title } = req.body;
      if (!title || typeof title !== "string" || title.trim().length === 0) {
        return res.status(400).json({ message: "Title is required" });
      }

      const updated = await storage.updateDemoTitle(demo.id, title.trim());
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Failed to update demonstration" });
    }
  });

  app.post("/api/demos/:id/admins", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const demo = await getDemoByIdentifier(req.params.id);
      if (!demo) return res.status(404).json({ message: "Not found" });
      if (demo.createdBy !== user.id && user.role !== "super_admin") {
        return res.status(403).json({ message: "Only the demo creator or super admin can invite admins" });
      }

      const { email } = req.body;
      if (!email || typeof email !== "string" || !email.includes("@")) {
        return res.status(400).json({ message: "Valid email is required" });
      }

      const targetUser = await storage.getUserByEmail(email.trim().toLowerCase());
      if (!targetUser) {
        return res.status(404).json({ message: "No account found with that email. They need to register first." });
      }

      const alreadyAdmin = await storage.isDemoAdmin(demo.id, targetUser.id);
      if (alreadyAdmin) {
        return res.status(400).json({ message: "This person is already an admin for this event" });
      }

      await storage.addDemoAdmin(demo.id, targetUser.id);

      try {
        const { sendInviteEmail } = await import("./email");
        const demoUrl = `${req.protocol}://${req.get("host")}/admin/demos/${demo.id}`;
        await sendInviteEmail(targetUser.email, targetUser.name, user.name, demo.title, demoUrl);
      } catch (emailErr) {
        console.error("Failed to send invite email:", emailErr);
      }

      res.json({ success: true, admin: { id: targetUser.id, email: targetUser.email, name: targetUser.name, avatarUrl: targetUser.avatarUrl } });
    } catch (err) {
      res.status(500).json({ message: "Failed to invite admin" });
    }
  });

  app.delete("/api/demos/:id/admins/:userId", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const demo = await getDemoByIdentifier(req.params.id);
      if (!demo) return res.status(404).json({ message: "Not found" });
      if (demo.createdBy !== user.id && user.role !== "super_admin") {
        return res.status(403).json({ message: "Only the demo creator or super admin can remove admins" });
      }

      const adminUserId = getSingleParam(req.params.userId);
      if (!adminUserId) return res.status(400).json({ message: "userId is required" });

      if (adminUserId === demo.createdBy) {
        return res.status(400).json({ message: "Cannot remove the creator from the admin list" });
      }

      await storage.removeDemoAdmin(demo.id, adminUserId);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to remove admin" });
    }
  });

  app.post("/api/demos/:id/chants", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const demo = await getDemoByIdentifier(req.params.id);
      if (!demo) return res.status(404).json({ message: "Not found" });
      if (!(await canAccessDemo(user, demo.id))) return res.status(403).json({ message: "Access denied" });

      const { callText, responseText, cycles, leaderDuration, peopleDuration } = req.body;
      if ((!callText || typeof callText !== "string" || callText.trim().length === 0) &&
          (!responseText || typeof responseText !== "string" || responseText.trim().length === 0)) {
        return res.status(400).json({ message: "At least one of call or response text is required" });
      }

      const existingChants = await storage.getChants(demo.id);
      if (existingChants.length >= 30) {
        return res.status(400).json({ message: "Maximum 30 chants per demonstration" });
      }

      const normalizedCycles = typeof cycles === "number" && cycles >= 1 && cycles <= 10 ? cycles : 1;
      const normalizedLeaderDuration = typeof leaderDuration === "number" && leaderDuration >= 1 && leaderDuration <= 30 ? leaderDuration : 4;
      const normalizedPeopleDuration = typeof peopleDuration === "number" && peopleDuration >= 1 && peopleDuration <= 30 ? peopleDuration : 3;

      const chant = await storage.addChant({
        demonstrationId: demo.id,
        orderIndex: existingChants.length,
        callText: (callText || "").trim(),
        responseText: (responseText || "").trim(),
        cycles: normalizedCycles,
        leaderDuration: normalizedLeaderDuration,
        peopleDuration: normalizedPeopleDuration,
      });

      res.json(chant);
    } catch (err) {
      res.status(500).json({ message: "Failed to add chant" });
    }
  });

  app.patch("/api/demos/:id/chants/:chantId", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const demo = await getDemoByIdentifier(req.params.id);
      if (!demo) return res.status(404).json({ message: "Not found" });
      if (!(await canAccessDemo(user, demo.id))) return res.status(403).json({ message: "Access denied" });

      const demoChants = await storage.getChants(demo.id);
      const chantId = getSingleParam(req.params.chantId);
      if (!chantId) return res.status(400).json({ message: "chantId is required" });
      const existingChant = demoChants.find((c) => c.id === chantId);
      if (!existingChant) return res.status(404).json({ message: "Chant not found in this demonstration" });

      const { callText, responseText, cycles, leaderDuration, peopleDuration } = req.body;
      if ((!callText || typeof callText !== "string" || callText.trim().length === 0) &&
          (!responseText || typeof responseText !== "string" || responseText.trim().length === 0)) {
        return res.status(400).json({ message: "At least one of call or response text is required" });
      }

      const updateData: any = {
        callText: (callText || "").trim(),
        responseText: (responseText || "").trim(),
      };
      if (typeof cycles === "number" && cycles >= 1 && cycles <= 10) updateData.cycles = cycles;
      if (typeof leaderDuration === "number" && leaderDuration >= 1 && leaderDuration <= 30) updateData.leaderDuration = leaderDuration;
      if (typeof peopleDuration === "number" && peopleDuration >= 1 && peopleDuration <= 30) updateData.peopleDuration = peopleDuration;

      const chant = await storage.updateChant(chantId, updateData);
      if (!chant) return res.status(404).json({ message: "Chant not found" });

      const state = await storage.getDemoState(demo.id);
      if (state?.currentChantId === chant.id && demo.status === "live") {
        const chantsList = await storage.getChants(demo.id);
        const chantIndex = chantsList.findIndex((c) => c.id === chant.id);
        const nextChantIndex = chantIndex >= 0 && chantsList.length > 0 ? (chantIndex + 1) % chantsList.length : null;
        const nextChant = nextChantIndex !== null ? chantsList[nextChantIndex] : null;

        io.to(`demo:${demo.publicId}`).emit("chant_update", {
          callText: chant.callText,
          responseText: chant.responseText,
          nextCallText: nextChant?.callText || null,
          nextResponseText: nextChant?.responseText || null,
          chantIndex: chantIndex >= 0 ? chantIndex : null,
          totalChants: chantsList.length,
          demoTitle: demo.title,
          demoStatus: demo.status,
          currentPhase: state.currentPhase ?? "leader",
          currentCycle: state.currentCycle ?? 1,
          cycleCount: state.cycleCount ?? 1,
        });
      }

      res.json(chant);
    } catch (err) {
      res.status(500).json({ message: "Failed to update chant" });
    }
  });

  app.delete("/api/demos/:id/chants/:chantId", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const demo = await getDemoByIdentifier(req.params.id);
      if (!demo) return res.status(404).json({ message: "Not found" });
      if (!(await canAccessDemo(user, demo.id))) return res.status(403).json({ message: "Access denied" });
      const demoChants = await storage.getChants(demo.id);
      const chantId = getSingleParam(req.params.chantId);
      if (!chantId) return res.status(400).json({ message: "chantId is required" });
      const chantExists = demoChants.some((c) => c.id === chantId);
      if (!chantExists) return res.status(404).json({ message: "Chant not found in this demonstration" });
      await storage.deleteChant(chantId);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete chant" });
    }
  });

  app.post("/api/demos/:id/chants/:chantId/reorder", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const demo = await getDemoByIdentifier(req.params.id);
      if (!demo) return res.status(404).json({ message: "Not found" });
      if (!(await canAccessDemo(user, demo.id))) return res.status(403).json({ message: "Access denied" });
      const { direction } = req.body;
      if (direction !== "up" && direction !== "down") {
        return res.status(400).json({ message: "Direction must be 'up' or 'down'" });
      }
      const chantId = getSingleParam(req.params.chantId);
      if (!chantId) return res.status(400).json({ message: "chantId is required" });
      await storage.reorderChants(demo.id, chantId, direction);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to reorder" });
    }
  });

  app.post("/api/demos/:id/current", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const demo = await getDemoByIdentifier(req.params.id);
      if (!demo) return res.status(404).json({ message: "Not found" });
      if (!(await canAccessDemo(user, demo.id))) return res.status(403).json({ message: "Access denied" });
      if (demo.status !== "live") return res.status(400).json({ message: "Demo is not live" });

      const { chantId } = req.body;
      if (!chantId) return res.status(400).json({ message: "chantId is required" });

      await storage.setCurrentChant(demo.id, chantId);

      const chantsList = await storage.getChants(demo.id);
      const chant = chantsList.find((c) => c.id === chantId);
      const chantIndex = chantsList.findIndex((c) => c.id === chantId);
      const nextChantIndex = chantIndex >= 0 && chantsList.length > 0 ? (chantIndex + 1) % chantsList.length : null;
      const nextChant = nextChantIndex !== null ? chantsList[nextChantIndex] : null;

      const currentState = await storage.getDemoState(demo.id);
      io.to(`demo:${demo.publicId}`).emit("chant_update", {
        callText: chant?.callText || null,
        responseText: chant?.responseText || null,
        nextCallText: nextChant?.callText || null,
        nextResponseText: nextChant?.responseText || null,
        chantIndex: chantIndex >= 0 ? chantIndex : null,
        totalChants: chantsList.length,
        demoTitle: demo.title,
        demoStatus: demo.status,
        currentPhase: currentState?.currentPhase ?? "leader",
        currentCycle: currentState?.currentCycle ?? 1,
        cycleCount: currentState?.cycleCount ?? 1,
      });

      io.to(`demo:${demo.publicId}`).emit("viewer_count", getViewerCount(demo.id));

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to set current chant" });
    }
  });

  app.post("/api/demos/:id/live", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const demo = await getDemoByIdentifier(req.params.id);
      if (!demo) return res.status(404).json({ message: "Not found" });
      if (!(await canAccessDemo(user, demo.id))) return res.status(403).json({ message: "Access denied" });
      if (demo.status === "live") return res.status(400).json({ message: "Demo is already live" });

      const chantsList = await storage.getChants(demo.id);
      if (chantsList.length === 0) return res.status(400).json({ message: "Add at least one chant before going live" });

      await storage.updateDemoStatus(demo.id, "live");
      await storage.initDemoState(demo.id);

      await storage.setCurrentChant(demo.id, chantsList[0].id);

      const state = await storage.getDemoState(demo.id);
      const nextChantIndex = chantsList.length > 0 ? 1 % chantsList.length : null;
      const nextChant = nextChantIndex !== null ? chantsList[nextChantIndex] : null;

      io.to(`demo:${demo.publicId}`).emit("chant_update", {
        callText: chantsList[0].callText,
        responseText: chantsList[0].responseText,
        nextCallText: nextChant?.callText || null,
        nextResponseText: nextChant?.responseText || null,
        chantIndex: 0,
        totalChants: chantsList.length,
        demoTitle: demo.title,
        demoStatus: "live",
        currentPhase: state?.currentPhase ?? "leader",
        currentCycle: state?.currentCycle ?? 1,
        cycleCount: state?.cycleCount ?? 1,
      });

      if (state?.autoRotate) {
        await startAutoRotation(demo.id, demo.publicId);
      }

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to go live" });
    }
  });

  app.post("/api/demos/:id/end", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const demo = await getDemoByIdentifier(req.params.id);
      if (!demo) return res.status(404).json({ message: "Not found" });
      if (!(await canAccessDemo(user, demo.id))) return res.status(403).json({ message: "Access denied" });

      await storage.updateDemoStatus(demo.id, "ended");
      stopAutoRotation(demo.id);

      io.to(`demo:${demo.publicId}`).emit("demo_ended");

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to end demo" });
    }
  });

  function stopAutoRotation(demoId: string) {
    const timer = autoRotateTimers.get(demoId);
    if (timer) {
      clearInterval(timer);
      autoRotateTimers.delete(demoId);
      autoRotateProgress.delete(demoId);
    }
  }

  async function startAutoRotation(demoId: string, publicId: string) {
    stopAutoRotation(demoId);

    const tick = async () => {
      try {
        const demo = await storage.getDemonstration(demoId);
        if (!demo || demo.status !== "live") {
          stopAutoRotation(demoId);
          return;
        }

        const state = await storage.getDemoState(demoId);
        if (!state?.autoRotate) {
          stopAutoRotation(demoId);
          return;
        }

        const chantsList = await storage.getChants(demoId);
        if (chantsList.length === 0) return;

        const currentIndex = state.currentChantId ? chantsList.findIndex((c) => c.id === state.currentChantId) : 0;
        const resolvedIndex = currentIndex >= 0 ? currentIndex : 0;
        const progress = autoRotateProgress.get(demoId) ?? { phase: "leader" as const, cycle: 1 };

        let nextPhase: "leader" | "people" = progress.phase === "leader" ? "people" : "leader";
        let nextCycle = progress.cycle;
        let nextIndex = resolvedIndex;

        const activeChant = chantsList[resolvedIndex];
        const cycleCountForChant = activeChant?.cycles ?? 1;

        if (progress.phase === "people") {
          if (progress.cycle >= cycleCountForChant) {
            nextCycle = 1;
            nextIndex = (resolvedIndex + 1) % chantsList.length;
            await storage.setCurrentChant(demoId, chantsList[nextIndex].id);
          } else {
            nextCycle = progress.cycle + 1;
          }
        }

        await storage.setRotationPhase(demoId, nextPhase, nextCycle);
        autoRotateProgress.set(demoId, { phase: nextPhase, cycle: nextCycle });

        const refreshedState = await storage.getDemoState(demoId);
        const nextSequenceIndex = chantsList.length > 0 ? (nextIndex + 1) % chantsList.length : null;
        const autoNextChant = nextSequenceIndex !== null ? chantsList[nextSequenceIndex] : null;
        const chantForEmit = chantsList[nextIndex];

        io.to(`demo:${publicId}`).emit("chant_update", {
          callText: chantForEmit.callText,
          responseText: chantForEmit.responseText,
          nextCallText: autoNextChant?.callText || null,
          nextResponseText: autoNextChant?.responseText || null,
          chantIndex: nextIndex,
          totalChants: chantsList.length,
          demoTitle: demo.title,
          demoStatus: demo.status,
          currentPhase: refreshedState?.currentPhase ?? nextPhase,
          currentCycle: refreshedState?.currentCycle ?? nextCycle,
          cycleCount: chantForEmit?.cycles ?? 1,
        });

        const delaySeconds = nextPhase === "leader" ? (chantForEmit?.leaderDuration ?? 4) : (chantForEmit?.peopleDuration ?? 3);
        const timeout = setTimeout(tick, Math.max(1, delaySeconds) * 1000);
        autoRotateTimers.set(demoId, timeout);
      } catch (err) {
        console.error("Auto-rotation error:", err);
      }
    };

    autoRotateProgress.set(demoId, { phase: "leader", cycle: 1 });
    const initialState = await storage.getDemoState(demoId);
    const initialChantsList = await storage.getChants(demoId);
    const firstChant = initialChantsList.length > 0 ? initialChantsList[0] : null;
    await storage.setRotationPhase(demoId, "leader", 1);
    const initialDelay = Math.max(1, firstChant?.leaderDuration ?? 4) * 1000;
    const timeout = setTimeout(tick, initialDelay);
    autoRotateTimers.set(demoId, timeout);
  }

  app.post("/api/demos/:id/auto-rotate", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const demo = await getDemoByIdentifier(req.params.id);
      if (!demo) return res.status(404).json({ message: "Not found" });
      if (!(await canAccessDemo(user, demo.id))) return res.status(403).json({ message: "Access denied" });

      const { autoRotate, rotationInterval, cycleCount, leaderDuration, peopleDuration } = req.body;
      if (typeof autoRotate !== "boolean") {
        return res.status(400).json({ message: "autoRotate must be a boolean" });
      }
      const interval = typeof rotationInterval === "number" && rotationInterval >= 5 && rotationInterval <= 18000 ? rotationInterval : 60;
      const normalizedCycleCount = typeof cycleCount === "number" && cycleCount >= 1 && cycleCount <= 10 ? cycleCount : 1;
      const normalizedLeaderDuration = typeof leaderDuration === "number" && leaderDuration >= 1 && leaderDuration <= 30 ? leaderDuration : 4;
      const normalizedPeopleDuration = typeof peopleDuration === "number" && peopleDuration >= 1 && peopleDuration <= 30 ? peopleDuration : 3;

      await storage.updateAutoRotation(demo.id, autoRotate, interval, normalizedCycleCount, normalizedLeaderDuration, normalizedPeopleDuration);

      if (autoRotate && demo.status === "live") {
        await startAutoRotation(demo.id, demo.publicId);
      } else {
        stopAutoRotation(demo.id);
      }

      res.json({ success: true, autoRotate, rotationInterval: interval, cycleCount: normalizedCycleCount, leaderDuration: normalizedLeaderDuration, peopleDuration: normalizedPeopleDuration });
    } catch (err) {
      res.status(500).json({ message: "Failed to update auto-rotation" });
    }
  });

  app.get("/api/demos/:id/qrcode", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const demo = await getDemoByIdentifier(req.params.id);
      if (!demo) return res.status(404).json({ message: "Not found" });
      if (!(await canAccessDemo(user, demo.id))) return res.status(403).json({ message: "Access denied" });

      const protocol = req.headers["x-forwarded-proto"] || req.protocol;
      const host = req.headers["x-forwarded-host"] || req.headers.host;
      const publicUrl = `${protocol}://${host}/d/${demo.publicId}`;

      const qrDataUrl = await QRCode.toDataURL(publicUrl, {
        width: 512,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      });

      res.json({ qrDataUrl, publicUrl });
    } catch (err) {
      res.status(500).json({ message: "Failed to generate QR code" });
    }
  });

  app.get("/api/admin/users", requireSuperAdmin, async (_req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      res.json(allUsers);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch("/api/admin/users/:userId/role", requireSuperAdmin, async (req, res) => {
    try {
      const { role } = req.body;
      if (role !== "admin" && role !== "super_admin") {
        return res.status(400).json({ message: "Invalid role" });
      }
      const userId = getSingleParam(req.params.userId);
      if (!userId) return res.status(400).json({ message: "userId is required" });
      await storage.updateUserRole(userId, role);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to update role" });
    }
  });

  app.delete("/api/admin/users/:userId", requireSuperAdmin, async (req, res) => {
    try {
      const currentUser = req.user as User;
      const userId = getSingleParam(req.params.userId);
      if (!userId) return res.status(400).json({ message: "userId is required" });
      if (userId === currentUser.id) {
        return res.status(400).json({ message: "Cannot remove yourself" });
      }
      await storage.deleteUser(userId);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to remove user" });
    }
  });

  io.on("connection", (socket) => {
    let currentDemo: { publicId: string; demoId: string; socketId: string } | null = null;

    socket.on("join_demo", async ({ publicId, sessionId }) => {
      try {
        const demo = await storage.getDemonstrationByPublicId(publicId);
        if (!demo) {
          socket.emit("demo_error", "Demonstration not found");
          return;
        }

        socket.join(`demo:${publicId}`);
        currentDemo = { publicId, demoId: demo.id, socketId: socket.id };

        if (!demoViewers.has(demo.id)) {
          demoViewers.set(demo.id, new Set());
        }
        demoViewers.get(demo.id)!.add(socket.id);

        const chantsList = await storage.getChants(demo.id);
        const state = await storage.getDemoState(demo.id);
        const currentChant = state?.currentChantId
          ? chantsList.find((c) => c.id === state.currentChantId)
          : null;
        const chantIndex = currentChant
          ? chantsList.findIndex((c) => c.id === currentChant.id)
          : null;
        const nextChantIndex = chantIndex !== null && chantsList.length > 0 ? (chantIndex + 1) % chantsList.length : null;
        const nextChant = nextChantIndex !== null ? chantsList[nextChantIndex] : null;

        socket.emit("chant_update", {
          callText: currentChant?.callText || null,
          responseText: currentChant?.responseText || null,
          nextCallText: nextChant?.callText || null,
          nextResponseText: nextChant?.responseText || null,
          chantIndex,
          totalChants: chantsList.length,
          demoTitle: demo.title,
          demoStatus: demo.status,
          currentPhase: state?.currentPhase ?? "leader",
          currentCycle: state?.currentCycle ?? 1,
          cycleCount: state?.cycleCount ?? 1,
        });

        const count = getViewerCount(demo.id);
        io.to(`demo:${publicId}`).emit("viewer_count", count);
      } catch (err) {
        socket.emit("demo_error", "Failed to join demonstration");
      }
    });

    socket.on("leave_demo", ({ publicId }) => {
      socket.leave(`demo:${publicId}`);
      if (currentDemo) {
        demoViewers.get(currentDemo.demoId)?.delete(socket.id);
        const count = getViewerCount(currentDemo.demoId);
        io.to(`demo:${publicId}`).emit("viewer_count", count);
        currentDemo = null;
      }
    });

    socket.on("disconnect", () => {
      if (currentDemo) {
        demoViewers.get(currentDemo.demoId)?.delete(socket.id);
        const count = getViewerCount(currentDemo.demoId);
        io.to(`demo:${currentDemo.publicId}`).emit("viewer_count", count);
      }
    });
  });

  return httpServer;
}
