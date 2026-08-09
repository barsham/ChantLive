import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, Check, ClipboardCheck, Copy, Download, Printer, ShieldCheck, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Chant, DemoState, Demonstration } from "@shared/schema";

type AdminInfo = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
};

type DemoDetail = {
  demo: Demonstration;
  chants: Chant[];
  state: DemoState | null;
  viewerCount: number;
  admins: AdminInfo[];
};
type FeedbackSummary = {
  total: number;
  averages: {
    clarity: number;
    safety: number;
    accessibility: number;
  };
  comments: Array<{
    comment: string | null;
    createdAt: string;
    updatedAt: string;
    participantLabel: string;
  }>;
};
type ConductReportSummary = {
  total: number;
  open: number;
  acknowledged: number;
  resolved: number;
  urgent: number;
  activeUrgent: number;
  categories: Record<"harassment" | "unsafe_behavior" | "privacy" | "misinformation" | "other", number>;
  averageAcknowledgementMinutes: number | null;
  averageResolutionMinutes: number | null;
};
type ConductReportQueue = { reports: unknown[]; summary: ConductReportSummary };

function formatRuntime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  if (minutes === 0) return `${seconds}s`;
  return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
}

function buildReportText(data: DemoDetail, runtime: string, feedback?: FeedbackSummary, conduct?: ConductReportSummary) {
  return [
    `ChantLive Post-Event Report: ${data.demo.title}`,
    "",
    `Status: ${data.demo.status}`,
    `Created: ${new Date(data.demo.createdAt).toLocaleString()}`,
    `Chants prepared: ${data.chants.length}`,
    `Estimated chant runtime: ${runtime}`,
    `Admins: ${data.admins.map((admin) => `${admin.name} <${admin.email}>`).join(", ") || "None listed"}`,
    `Current viewer count snapshot: ${data.viewerCount}`,
    `Participant feedback responses: ${feedback?.total ?? 0}`,
    `Feedback averages: clarity ${feedback?.averages.clarity ?? 0}/5, safety ${feedback?.averages.safety ?? 0}/5, accessibility ${feedback?.averages.accessibility ?? 0}/5`,
    `Private conduct concerns: ${conduct?.total ?? 0} total, ${conduct?.open ?? 0} unseen, ${conduct?.acknowledged ?? 0} acknowledged, ${conduct?.resolved ?? 0} resolved, ${conduct?.urgent ?? 0} urgent`,
    `Average acknowledgement: ${conduct?.averageAcknowledgementMinutes ?? "not available"} minutes`,
    `Average resolution: ${conduct?.averageResolutionMinutes ?? "not available"} minutes`,
    "",
    "Debrief checklist:",
    "- Did participants understand how to join?",
    "- Did QR and fallback link sharing work?",
    "- Did the backup admin know when to step in?",
    "- Did accessibility options cover visibility, scanning, and low-signal needs?",
    "- Were private conduct concerns acknowledged, resolved, and handled without copying sensitive details?",
    "- Which chants should be reused, edited, or removed next time?",
    "",
    "Participant comments:",
    ...(feedback?.comments.length ? feedback.comments.map((item) => `- ${item.comment}`) : ["- No participant comments yet."]),
  ].join("\n");
}

export default function EventReport() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery<DemoDetail>({
    queryKey: ["/api/demos", id],
  });
  const { data: feedback } = useQuery<FeedbackSummary>({
    queryKey: ["/api/demos", id, "feedback"],
    enabled: Boolean(id),
  });
  const { data: conductQueue } = useQuery<ConductReportQueue>({
    queryKey: ["/api/demos", id, "conduct-reports"],
    enabled: Boolean(id),
  });

  const runtimeSeconds = useMemo(() => {
    if (!data) return 0;
    const cycleDelaySeconds = (data.state?.cycleDelay ?? 500) / 1000;
    return data.chants.reduce((total, chant, index) => {
      const cycles = Math.max(1, chant.cycles ?? 1);
      const chantSeconds = cycles * ((chant.leaderDuration ?? 4) + (chant.peopleDuration ?? 3));
      return total + chantSeconds + (index > 0 ? cycleDelaySeconds : 0);
    }, 0);
  }, [data]);

  const runtime = formatRuntime(runtimeSeconds);

  const copyReport = async () => {
    if (!data) return;
    await navigator.clipboard.writeText(buildReportText(data, runtime, feedback, conductQueue?.summary));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="mx-auto max-w-5xl space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-[620px] w-full" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="mb-4 text-muted-foreground">Demonstration not found.</p>
            <Button variant="outline" onClick={() => navigate("/admin")}>Back to dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="no-print sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/demos/${id}`)} data-testid="button-back-editor">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to event
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={copyReport} data-testid="button-copy-event-report">
              {copied ? <Check className="mr-1 h-4 w-4" /> : <Copy className="mr-1 h-4 w-4" />}
              {copied ? "Copied" : "Copy report"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate(`/admin/demos/${id}`)} data-testid="button-open-report-export-source">
              <Download className="mr-1 h-4 w-4" />
              Export from editor
            </Button>
            <Button size="sm" onClick={() => window.print()} data-testid="button-print-event-report">
              <Printer className="mr-1 h-4 w-4" />
              Print report
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <section className="print-handout-page rounded-2xl border bg-card p-6 shadow-sm" data-testid="section-event-report">
          <div className="border-b pb-5">
            <Badge variant="secondary" className="mb-3">Post-event report</Badge>
            <h1 className="text-3xl font-bold tracking-tight">{data.demo.title}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              A copyable debrief summary for reuse decisions, accessibility review, backup-admin follow-up, and community notes.
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="mt-1 text-lg font-semibold">{data.demo.status}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Chants</p>
                <p className="mt-1 text-lg font-semibold">{data.chants.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Runtime estimate</p>
                <p className="mt-1 text-lg font-semibold">{runtime}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Viewer snapshot</p>
                <p className="mt-1 text-lg font-semibold">{data.viewerCount}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6" data-testid="card-report-feedback-summary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Check className="h-5 w-5 text-primary" />
                Participant feedback
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 text-sm md:grid-cols-4">
                <div className="rounded-lg border bg-background p-3">
                  <p className="text-xs text-muted-foreground">Responses</p>
                  <p className="mt-1 text-lg font-semibold">{feedback?.total ?? 0}</p>
                </div>
                <div className="rounded-lg border bg-background p-3">
                  <p className="text-xs text-muted-foreground">Clarity</p>
                  <p className="mt-1 text-lg font-semibold">{feedback?.averages.clarity ?? 0}/5</p>
                </div>
                <div className="rounded-lg border bg-background p-3">
                  <p className="text-xs text-muted-foreground">Safety</p>
                  <p className="mt-1 text-lg font-semibold">{feedback?.averages.safety ?? 0}/5</p>
                </div>
                <div className="rounded-lg border bg-background p-3">
                  <p className="text-xs text-muted-foreground">Accessibility</p>
                  <p className="mt-1 text-lg font-semibold">{feedback?.averages.accessibility ?? 0}/5</p>
                </div>
              </div>
              {(feedback?.comments.length ?? 0) > 0 && (
                <div className="mt-4 space-y-2">
                  {feedback?.comments.slice(0, 6).map((item) => (
                    <div key={`${item.participantLabel}-${item.updatedAt}`} className="rounded-lg border bg-background p-3 text-sm text-muted-foreground">
                      {item.comment}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mt-6 border-violet-500/30" data-testid="card-report-conduct-summary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-5 w-5 text-violet-700" aria-hidden="true" />
                Private conduct response summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">Trend counts only. Sensitive participant report text and organiser responses are intentionally excluded from print and copied reports.</p>
              <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-5">
                {[
                  ["Total", conductQueue?.summary.total ?? 0],
                  ["Urgent", conductQueue?.summary.urgent ?? 0],
                  ["Unseen", conductQueue?.summary.open ?? 0],
                  ["Acknowledged", conductQueue?.summary.acknowledged ?? 0],
                  ["Resolved", conductQueue?.summary.resolved ?? 0],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border bg-background p-3">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="mt-1 text-lg font-semibold">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                <div className="rounded-lg border bg-background p-3">
                  <p className="text-xs text-muted-foreground">Average acknowledgement</p>
                  <p className="mt-1 font-semibold">{conductQueue?.summary.averageAcknowledgementMinutes == null ? "Not available" : `${conductQueue.summary.averageAcknowledgementMinutes} min`}</p>
                </div>
                <div className="rounded-lg border bg-background p-3">
                  <p className="text-xs text-muted-foreground">Average resolution</p>
                  <p className="mt-1 font-semibold">{conductQueue?.summary.averageResolutionMinutes == null ? "Not available" : `${conductQueue.summary.averageResolutionMinutes} min`}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2" aria-label="Concern categories">
                {Object.entries(conductQueue?.summary.categories ?? {}).map(([category, count]) => (
                  <Badge key={category} variant="secondary" className="capitalize">{category.replaceAll("_", " ")}: {count}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ClipboardCheck className="h-5 w-5 text-primary" />
                  Debrief checklist
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>Did participants understand how to join?</p>
                <p>Did QR, fallback links, and printed handouts work?</p>
                <p>Did the backup admin know when to step in?</p>
                <p>Were urgent private concerns acknowledged and safely resolved?</p>
                <p>Which chants should be reused, edited, or removed?</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-5 w-5 text-primary" />
                  Admin follow-up
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                {data.admins.map((admin) => (
                  <div key={admin.id} className="rounded-lg border bg-background p-3">
                    <p className="font-medium text-foreground">{admin.name}</p>
                    <p className="text-xs">{admin.email}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Chant review</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.chants.length > 0 ? data.chants.map((chant, index) => (
                <div key={chant.id} className="rounded-lg border bg-background p-3 text-sm">
                  <p className="font-medium">#{index + 1}</p>
                  <p className="text-muted-foreground">Leader: {chant.callText || "No call text"}</p>
                  <p className="text-muted-foreground">Everyone: {chant.responseText || "No response text"}</p>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground">No chants were added to this demonstration.</p>
              )}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
