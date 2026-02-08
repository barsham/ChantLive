import type { Express } from "express";
import { type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { storage } from "./storage";
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
      provider: string;
      googleId: string | null;
      avatarUrl: string | null;
      createdAt: Date;
    }
  }
}

const demoViewers = new Map<string, Set<string>>();

function getViewerCount(demoId: string): number {
  return demoViewers.get(demoId)?.size ?? 0;
}

async function canAccessDemo(user: User, demoId: string): Promise<boolean> {
  if (user.role === "super_admin") return true;
  const demo = await storage.getDemonstration(demoId);
  if (!demo) return false;
  if (demo.createdBy === user.id) return true;
  return storage.isDemoAdmin(demoId, user.id);
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
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
      const demo = await storage.getDemonstration(req.params.id);
      if (!demo) return res.status(404).json({ message: "Not found" });

      if (!(await canAccessDemo(user, demo.id))) {
        return res.status(403).json({ message: "Access denied" });
      }

      const chantsList = await storage.getChants(demo.id);
      const state = await storage.getDemoState(demo.id);
      const viewerCount = getViewerCount(demo.id);

      res.json({ demo, chants: chantsList, state, viewerCount });
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch demonstration" });
    }
  });

  app.post("/api/demos/:id/chants", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const demo = await storage.getDemonstration(req.params.id);
      if (!demo) return res.status(404).json({ message: "Not found" });
      if (!(await canAccessDemo(user, demo.id))) return res.status(403).json({ message: "Access denied" });

      const { callText, responseText } = req.body;
      if ((!callText || typeof callText !== "string" || callText.trim().length === 0) &&
          (!responseText || typeof responseText !== "string" || responseText.trim().length === 0)) {
        return res.status(400).json({ message: "At least one of call or response text is required" });
      }

      const existingChants = await storage.getChants(demo.id);
      if (existingChants.length >= 30) {
        return res.status(400).json({ message: "Maximum 30 chants per demonstration" });
      }

      const chant = await storage.addChant({
        demonstrationId: demo.id,
        orderIndex: existingChants.length,
        callText: (callText || "").trim(),
        responseText: (responseText || "").trim(),
      });

      res.json(chant);
    } catch (err) {
      res.status(500).json({ message: "Failed to add chant" });
    }
  });

  app.delete("/api/demos/:id/chants/:chantId", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      if (!(await canAccessDemo(user, req.params.id))) return res.status(403).json({ message: "Access denied" });
      await storage.deleteChant(req.params.chantId);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete chant" });
    }
  });

  app.post("/api/demos/:id/chants/:chantId/reorder", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      if (!(await canAccessDemo(user, req.params.id))) return res.status(403).json({ message: "Access denied" });
      const { direction } = req.body;
      if (direction !== "up" && direction !== "down") {
        return res.status(400).json({ message: "Direction must be 'up' or 'down'" });
      }
      await storage.reorderChants(req.params.id, req.params.chantId, direction);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to reorder" });
    }
  });

  app.post("/api/demos/:id/current", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const demo = await storage.getDemonstration(req.params.id);
      if (!demo) return res.status(404).json({ message: "Not found" });
      if (!(await canAccessDemo(user, demo.id))) return res.status(403).json({ message: "Access denied" });
      if (demo.status !== "live") return res.status(400).json({ message: "Demo is not live" });

      const { chantId } = req.body;
      if (!chantId) return res.status(400).json({ message: "chantId is required" });

      await storage.setCurrentChant(demo.id, chantId);

      const chantsList = await storage.getChants(demo.id);
      const chant = chantsList.find((c) => c.id === chantId);
      const chantIndex = chantsList.findIndex((c) => c.id === chantId);

      io.to(`demo:${demo.publicId}`).emit("chant_update", {
        callText: chant?.callText || null,
        responseText: chant?.responseText || null,
        chantIndex: chantIndex >= 0 ? chantIndex : null,
        totalChants: chantsList.length,
        demoTitle: demo.title,
        demoStatus: demo.status,
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
      const demo = await storage.getDemonstration(req.params.id);
      if (!demo) return res.status(404).json({ message: "Not found" });
      if (!(await canAccessDemo(user, demo.id))) return res.status(403).json({ message: "Access denied" });
      if (demo.status !== "draft") return res.status(400).json({ message: "Demo can only go live from draft" });

      const chantsList = await storage.getChants(demo.id);
      if (chantsList.length === 0) return res.status(400).json({ message: "Add at least one chant before going live" });

      await storage.updateDemoStatus(demo.id, "live");
      await storage.initDemoState(demo.id);

      await storage.setCurrentChant(demo.id, chantsList[0].id);

      io.to(`demo:${demo.publicId}`).emit("chant_update", {
        callText: chantsList[0].callText,
        responseText: chantsList[0].responseText,
        chantIndex: 0,
        totalChants: chantsList.length,
        demoTitle: demo.title,
        demoStatus: "live",
      });

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to go live" });
    }
  });

  app.post("/api/demos/:id/end", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const demo = await storage.getDemonstration(req.params.id);
      if (!demo) return res.status(404).json({ message: "Not found" });
      if (!(await canAccessDemo(user, demo.id))) return res.status(403).json({ message: "Access denied" });

      await storage.updateDemoStatus(demo.id, "ended");

      io.to(`demo:${demo.publicId}`).emit("demo_ended");

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to end demo" });
    }
  });

  app.get("/api/demos/:id/qrcode", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const demo = await storage.getDemonstration(req.params.id);
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
      await storage.updateUserRole(req.params.userId, role);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to update role" });
    }
  });

  app.delete("/api/admin/users/:userId", requireSuperAdmin, async (req, res) => {
    try {
      const currentUser = req.user as User;
      if (req.params.userId === currentUser.id) {
        return res.status(400).json({ message: "Cannot remove yourself" });
      }
      await storage.deleteUser(req.params.userId);
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

        socket.emit("chant_update", {
          callText: currentChant?.callText || null,
          responseText: currentChant?.responseText || null,
          chantIndex,
          totalChants: chantsList.length,
          demoTitle: demo.title,
          demoStatus: demo.status,
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
