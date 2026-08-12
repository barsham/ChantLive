import { ArrowLeft, CheckCircle2, Database, HeartPulse, RefreshCw, ShieldCheck, TriangleAlert, WifiOff } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppVersion } from "@/components/app-version";
import { usePlatformStatus } from "@/lib/platform-status";

function formatTimestamp(value: string | null) {
  if (!value) return "Not yet available";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "full", timeStyle: "long" }).format(new Date(value));
}

export default function StatusPage() {
  const { platform, checking, refresh } = usePlatformStatus();
  const ready = platform.status === "operational";

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <main className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" asChild><Link href="/"><ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" /> Back to ChantLive</Link></Button>
          <AppVersion />
        </div>

        <section className="mt-8" aria-labelledby="status-title">
          <div className={`rounded-2xl border p-6 ${ready ? "border-emerald-500/40 bg-emerald-500/10" : "border-amber-500/40 bg-amber-500/10"}`} role="status" aria-live="polite" data-testid="panel-public-platform-status">
            <div className="flex items-start gap-3">
              {ready ? <CheckCircle2 className="mt-1 h-7 w-7 shrink-0 text-emerald-600" aria-hidden="true" /> : <TriangleAlert className="mt-1 h-7 w-7 shrink-0 text-amber-600" aria-hidden="true" />}
              <div>
                <h1 id="status-title" className="text-2xl font-bold">{ready ? "ChantLive is ready" : "ChantLive is recovering"}</h1>
                <p className="mt-2 text-sm text-muted-foreground">{ready ? "The public web service and live data service are available for organiser and participant workflows." : "The website remains available while live data operations pause safely. Automated recovery checks are running."}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><HeartPulse className="h-5 w-5" aria-hidden="true" /> Web service</CardTitle></CardHeader>
              <CardContent><p className="font-semibold text-emerald-700 dark:text-emerald-300">Reachable</p><p className="mt-1 text-xs text-muted-foreground">This status page and cached participant guidance remain accessible.</p></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Database className="h-5 w-5" aria-hidden="true" /> Live data service</CardTitle></CardHeader>
              <CardContent><p className="font-semibold capitalize">{platform.database}</p><p className="mt-1 text-xs text-muted-foreground">Event changes are accepted only when the data service is available.</p></CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader><CardTitle className="text-base">What to do during recovery</CardTitle></CardHeader>
            <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
              <div><p className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4" aria-hidden="true" /> Organisers</p><p className="mt-1 text-muted-foreground">Pause live changes and use direct, previously rehearsed safety instructions until readiness returns.</p></div>
              <div><p className="flex items-center gap-2 font-semibold"><WifiOff className="h-4 w-4" aria-hidden="true" /> Participants</p><p className="mt-1 text-muted-foreground">Treat the last visible chant as stale. Do not follow new movement or safety directions until live service reconnects.</p></div>
            </CardContent>
          </Card>

          <div className="mt-6 rounded-xl border p-4 text-sm">
            <dl className="grid gap-3 sm:grid-cols-2">
              <div><dt className="text-xs text-muted-foreground">Last check</dt><dd className="mt-1 font-medium" data-testid="text-status-last-check">{formatTimestamp(platform.checkedAt)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Last ready</dt><dd className="mt-1 font-medium">{formatTimestamp(platform.lastReadyAt)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Running version</dt><dd className="mt-1 font-medium">{platform.version ? `v${platform.version}` : "Unavailable"}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Automatic retry</dt><dd className="mt-1 font-medium">Every {platform.retryAfterSeconds} seconds</dd></div>
            </dl>
          </div>

          <Button className="mt-6 min-h-11" onClick={() => void refresh()} disabled={checking} data-testid="button-public-status-refresh">
            <RefreshCw className={`mr-2 h-4 w-4 ${checking ? "animate-spin" : ""}`} aria-hidden="true" /> {checking ? "Checking..." : "Check again now"}
          </Button>
        </section>
      </main>
    </div>
  );
}
