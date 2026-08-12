import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { Link, useLocation } from "wouter";
import { usePlatformStatus } from "@/lib/platform-status";

export function PlatformStatusBanner() {
  const [location] = useLocation();
  const { platform, checking, recovered, refresh } = usePlatformStatus();

  if (platform.status === "operational" && !recovered) return null;

  if (recovered) {
    return (
      <div className="border-b border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-emerald-950 dark:text-emerald-100" role="status" aria-live="polite" data-testid="banner-platform-recovered">
        <div className="mx-auto flex max-w-6xl items-center gap-2 text-sm font-medium">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          Live data is available again. This screen will resume normally.
        </div>
      </div>
    );
  }

  const participant = location.startsWith("/d/");
  const message = participant
    ? "Live updates are temporarily unavailable. Keep the last verified chant visible, do not rely on it for new movement or safety instructions, and retry shortly."
    : "ChantLive is reachable but its live data service is recovering. No event changes will be accepted until readiness returns.";

  return (
    <div className="border-b border-amber-500/40 bg-amber-400/15 px-4 py-3 text-amber-950 dark:text-amber-100" role="alert" aria-live="assertive" data-testid="banner-platform-degraded">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p><span className="font-semibold">Service recovery in progress.</span> {message}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button type="button" onClick={() => void refresh()} disabled={checking} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-amber-700/40 px-3 py-2 text-sm font-semibold" data-testid="button-platform-retry">
            <RefreshCw className={`h-4 w-4 ${checking ? "animate-spin" : ""}`} aria-hidden="true" /> Retry
          </button>
          <Link href="/status" className="inline-flex min-h-11 items-center rounded-md border border-amber-700/40 px-3 py-2 text-sm font-semibold" data-testid="link-platform-status">Service status</Link>
        </div>
      </div>
    </div>
  );
}
