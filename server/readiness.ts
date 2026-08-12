import pkg from "../package.json";
import { ensureDemoColumnsAndTables, ensureUserAuthColumns, pool } from "./db";

export type PlatformReadiness = {
  status: "starting" | "operational" | "degraded";
  database: "checking" | "available" | "unavailable";
  version: string;
  checkedAt: string | null;
  lastReadyAt: string | null;
  retryAfterSeconds: number;
};

const RETRY_INTERVAL_MS = 10_000;
let schemaReady = false;
let checking: Promise<boolean> | null = null;
let state: PlatformReadiness = {
  status: "starting",
  database: "checking",
  version: pkg.version,
  checkedAt: null,
  lastReadyAt: null,
  retryAfterSeconds: RETRY_INTERVAL_MS / 1_000,
};

export function getPlatformReadiness(): PlatformReadiness {
  return { ...state };
}

export function isPlatformReady(): boolean {
  return state.status === "operational";
}

export async function checkPlatformReadiness(): Promise<boolean> {
  if (checking) return checking;

  checking = (async () => {
    const checkedAt = new Date().toISOString();
    try {
      if (!schemaReady) {
        await ensureUserAuthColumns();
        await ensureDemoColumnsAndTables();
        schemaReady = true;
      } else {
        await pool.query("SELECT 1");
      }

      state = {
        ...state,
        status: "operational",
        database: "available",
        checkedAt,
        lastReadyAt: checkedAt,
      };
      return true;
    } catch (error) {
      state = {
        ...state,
        status: "degraded",
        database: "unavailable",
        checkedAt,
      };
      console.error("Platform readiness check failed:", error instanceof Error ? error.message : "database unavailable");
      return false;
    } finally {
      checking = null;
    }
  })();

  return checking;
}

export function startPlatformReadinessMonitor(): () => void {
  void checkPlatformReadiness();
  const timer = setInterval(() => void checkPlatformReadiness(), RETRY_INTERVAL_MS);
  timer.unref();
  return () => clearInterval(timer);
}
