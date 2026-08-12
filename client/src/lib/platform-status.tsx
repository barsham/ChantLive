import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

export type PlatformStatus = {
  status: "starting" | "operational" | "degraded" | "unreachable";
  database: "checking" | "available" | "unavailable" | "unknown";
  version: string | null;
  checkedAt: string | null;
  lastReadyAt: string | null;
  retryAfterSeconds: number;
};

type PlatformStatusContextValue = {
  platform: PlatformStatus;
  checking: boolean;
  recovered: boolean;
  refresh: () => Promise<void>;
};

const initialStatus: PlatformStatus = {
  status: "starting",
  database: "checking",
  version: null,
  checkedAt: null,
  lastReadyAt: null,
  retryAfterSeconds: 10,
};

const PlatformStatusContext = createContext<PlatformStatusContextValue>({
  platform: initialStatus,
  checking: true,
  recovered: false,
  refresh: async () => undefined,
});

export function PlatformStatusProvider({ children }: { children: ReactNode }) {
  const [platform, setPlatform] = useState(initialStatus);
  const [checking, setChecking] = useState(true);
  const [recovered, setRecovered] = useState(false);
  const previousStatus = useRef<PlatformStatus["status"]>("starting");
  const recoveryTimer = useRef<number | null>(null);

  const refresh = async () => {
    setChecking(true);
    try {
      const response = await fetch("/api/platform-status", { cache: "no-store" });
      const payload = await response.json() as PlatformStatus;
      const nextStatus = response.ok ? "operational" : payload.status;
      if (nextStatus === "operational" && ["degraded", "unreachable"].includes(previousStatus.current)) {
        setRecovered(true);
        if (recoveryTimer.current) window.clearTimeout(recoveryTimer.current);
        recoveryTimer.current = window.setTimeout(() => setRecovered(false), 8_000);
      }
      previousStatus.current = nextStatus;
      setPlatform({ ...payload, status: nextStatus });
    } catch {
      previousStatus.current = "unreachable";
      setPlatform((current) => ({
        ...current,
        status: "unreachable",
        database: "unknown",
        checkedAt: new Date().toISOString(),
      }));
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), 15_000);
    const handleOnline = () => void refresh();
    window.addEventListener("online", handleOnline);
    return () => {
      window.clearInterval(interval);
      if (recoveryTimer.current) window.clearTimeout(recoveryTimer.current);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  return (
    <PlatformStatusContext.Provider value={{ platform, checking, recovered, refresh }}>
      {children}
    </PlatformStatusContext.Provider>
  );
}

export function usePlatformStatus() {
  return useContext(PlatformStatusContext);
}
