import { Activity, CheckCircle2, Clock3, Database, RefreshCw, TriangleAlert } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePlatformStatus } from "@/lib/platform-status";

function formatCheck(value: string | null) {
  if (!value) return "Waiting for first check";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "medium" }).format(new Date(value));
}

export function PlatformReadinessCard({ compact = false }: { compact?: boolean }) {
  const { platform, checking, refresh } = usePlatformStatus();
  const ready = platform.status === "operational";

  return (
    <Card className={ready ? "border-emerald-500/30" : "border-amber-500/40"} data-testid="card-platform-readiness">
      <CardHeader className={compact ? "pb-3" : undefined}>
        <CardTitle className="flex items-center gap-2 text-base">
          {ready ? <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden="true" /> : <TriangleAlert className="h-5 w-5 text-amber-600" aria-hidden="true" />}
          Platform readiness
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="font-medium" data-testid="text-platform-readiness-state">{ready ? "Ready for live event operations" : "Live data operations are paused safely"}</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <p className="flex items-center gap-2"><Activity className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> Web service: reachable</p>
          <p className="flex items-center gap-2"><Database className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> Data service: {platform.database}</p>
          <p className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> Checked: {formatCheck(platform.checkedAt)}</p>
        </div>
        {!ready && <p className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs">Do not launch or change a live event until this card reports ready. Participant devices should retain only their last verified display and follow direct organiser safety instructions.</p>}
        <div className="flex flex-wrap gap-2">
          <Button className="min-h-11" size="sm" variant="outline" onClick={() => void refresh()} disabled={checking} data-testid="button-readiness-refresh">
            <RefreshCw className={`mr-2 h-4 w-4 ${checking ? "animate-spin" : ""}`} aria-hidden="true" /> Check now
          </Button>
          <Button className="min-h-11" size="sm" variant="ghost" asChild><Link href="/status">Open status centre</Link></Button>
        </div>
      </CardContent>
    </Card>
  );
}
