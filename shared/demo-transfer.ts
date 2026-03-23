import { z } from "zod";

export const demoTransferChantSchema = z.object({
  orderIndex: z.number().int().min(0),
  callText: z.string(),
  responseText: z.string(),
  cycles: z.number().int().min(1).max(10),
  leaderDuration: z.number().int().min(1).max(30),
  peopleDuration: z.number().int().min(1).max(30),
});

export const demoTransferStateSchema = z.object({
  autoRotate: z.boolean(),
  rotationInterval: z.number().int().min(5).max(18000),
  cycleCount: z.number().int().min(1).max(10),
  leaderDuration: z.number().int().min(1).max(30),
  peopleDuration: z.number().int().min(1).max(30),
  cycleDelay: z.number().int().min(0).max(5000),
  eventDurationMinutes: z.number().int().min(1).max(300),
  currentPhase: z.enum(["leader", "people"]),
  currentCycle: z.number().int().min(1).max(10),
  currentChantOrderIndex: z.number().int().min(0).nullable(),
}).nullable();

export const demoTransferAdminSchema = z.object({
  email: z.string().email(),
  name: z.string(),
  role: z.enum(["creator", "admin"]),
});

export const demoTransferPackageSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string().datetime(),
  demonstration: z.object({
    title: z.string().min(1),
    originalStatus: z.enum(["draft", "live", "ended"]),
    createdAt: z.string().datetime(),
  }),
  chants: z.array(demoTransferChantSchema).max(30),
  state: demoTransferStateSchema,
  admins: z.array(demoTransferAdminSchema),
});

export type DemoTransferPackage = z.infer<typeof demoTransferPackageSchema>;
