import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, CheckCircle2, Copy, ExternalLink, Printer, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

function formatMinutes(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);

  if (minutes === 0) return `${seconds}s`;
  if (seconds === 0) return `${minutes}m`;
  return `${minutes}m ${seconds}s`;
}

function formatEventDateTime(value: Date | string | null | undefined) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not scheduled";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function buildPlanText(data: DemoDetail, publicUrl: string) {
  const chantCount = data.chants.length;
  const admins = data.admins.map((admin) => `${admin.name} <${admin.email}>`).join(", ") || "Add a backup admin";
  const eventDuration = data.state?.eventDurationMinutes ?? 300;

  return [
    `ChantLive Event-Day Plan: ${data.demo.title}`,
    "",
    `Participant link: ${publicUrl}`,
    `Status: ${data.demo.status}`,
    `Date and time: ${formatEventDateTime(data.demo.scheduledAt)}`,
    `Location: ${data.demo.locationName || "Not set"}`,
    `Meeting point: ${data.demo.meetingPoint || "Not set"}`,
    `Planned duration: ${eventDuration} minutes`,
    `Chants prepared: ${chantCount}`,
    `Admins: ${admins}`,
    data.demo.arrivalNote ? `Arrival note: ${data.demo.arrivalNote}` : "",
    "",
    "Before arrival:",
    "- Confirm permits, gathering rules, amplification limits, route, and site contact.",
    "- Share QR handout and fallback link with marshals, speakers, and accessibility helpers.",
    "- Confirm accessible meeting points, quiet area, water, first-aid point, exits, and shelter option.",
    "",
    "At the event:",
    "- Keep one admin on ChantLive controls and one backup admin ready.",
    "- Test the participant page from a phone before inviting the crowd.",
    "- Announce the fallback link for people who cannot scan the QR code.",
    "- Use clear, calm instructions if the crowd needs to pause, move, or reconnect.",
    "",
    "After the event:",
    "- End the demonstration in ChantLive.",
    "- Export the demonstration if the chant plan should be reused.",
    "- Capture lessons learned for permits, accessibility, safety, and participation.",
  ].join("\n");
}

export default function EventPlan() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery<DemoDetail>({
    queryKey: ["/api/demos", id],
  });

  const publicUrl = data?.demo ? `${window.location.origin}/d/${data.demo.publicId}` : "";
  const totalChantSeconds = useMemo(() => {
    if (!data) return 0;

    const cycleDelaySeconds = (data.state?.cycleDelay ?? 500) / 1000;
    return data.chants.reduce((total, chant, index) => {
      const cycles = Math.max(1, chant.cycles ?? 1);
      const chantSeconds = cycles * ((chant.leaderDuration ?? 4) + (chant.peopleDuration ?? 3));
      const delaySeconds = index > 0 ? cycleDelaySeconds : 0;
      return total + chantSeconds + delaySeconds;
    }, 0);
  }, [data]);

  const copyPlan = async () => {
    if (!data) return;
    await navigator.clipboard.writeText(buildPlanText(data, publicUrl));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="mx-auto max-w-5xl space-y-4">
          <Skeleton className="h-10 w-60" />
          <Skeleton className="h-[680px] w-full" />
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

  const eventDuration = data.state?.eventDurationMinutes ?? 300;
  const hasBackupAdmin = data.admins.length > 1;
  const readinessChecks = [
    { label: "Chants prepared", ready: data.chants.length > 0 },
    { label: "Backup admin assigned", ready: hasBackupAdmin },
    { label: "Participant link available", ready: Boolean(publicUrl) },
    { label: "Logistics added", ready: Boolean(data.demo.scheduledAt || data.demo.locationName || data.demo.meetingPoint) },
    { label: "Timing configured", ready: eventDuration > 0 },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="no-print sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/demos/${id}`)} data-testid="button-back-editor">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to event
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={copyPlan} data-testid="button-copy-event-plan">
              <Copy className="mr-1 h-4 w-4" />
              {copied ? "Copied" : "Copy plan"}
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={publicUrl} target="_blank" rel="noopener noreferrer" data-testid="link-open-event-plan-participant">
                <ExternalLink className="mr-1 h-4 w-4" />
                Participant page
              </a>
            </Button>
            <Button size="sm" onClick={() => window.print()} data-testid="button-print-event-plan">
              <Printer className="mr-1 h-4 w-4" />
              Print runbook
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <section className="print-handout-page rounded-2xl border bg-card p-6 shadow-sm" data-testid="section-event-day-plan">
          <div className="flex flex-col gap-4 border-b pb-5 md:flex-row md:items-start md:justify-between">
            <div>
              <Badge variant="secondary" className="mb-3">Event-day runbook</Badge>
              <h1 className="text-3xl font-bold tracking-tight">{data.demo.title}</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                A practical command sheet for permits, accessibility, safety, QR sharing, live controls, and post-event wrap-up.
              </p>
            </div>
            <div className="rounded-xl border bg-background p-4 text-sm">
              <p className="font-medium">Operational snapshot</p>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                <div>
                  <dt>When</dt>
                  <dd className="font-semibold text-foreground">{formatEventDateTime(data.demo.scheduledAt)}</dd>
                </div>
                <div>
                  <dt>Where</dt>
                  <dd className="font-semibold text-foreground">{data.demo.locationName || "Not set"}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd className="font-semibold text-foreground">{data.demo.status}</dd>
                </div>
                <div>
                  <dt>Admins</dt>
                  <dd className="font-semibold text-foreground">{data.admins.length}</dd>
                </div>
                <div>
                  <dt>Chants</dt>
                  <dd className="font-semibold text-foreground">{data.chants.length}</dd>
                </div>
                <div>
                  <dt>Chant runtime</dt>
                  <dd className="font-semibold text-foreground">{formatMinutes(totalChantSeconds)}</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-5">
            {readinessChecks.map((item) => (
              <div key={item.label} className="rounded-xl border bg-background p-4" data-testid={`text-plan-readiness-${item.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
                <CheckCircle2 className={`mb-2 h-5 w-5 ${item.ready ? "text-emerald-600" : "text-muted-foreground"}`} />
                <p className="text-sm font-medium">{item.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.ready ? "Ready" : "Needs attention"}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  Permits, safety, and access
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>Confirm local permit requirements, amplification limits, route boundaries, site contacts, and any private-property permissions.</p>
                {data.demo.locationName && <p>Use the configured location as the single source of truth: {data.demo.locationName}.</p>}
                {data.demo.meetingPoint && <p>Tell volunteers to direct arrivals to: {data.demo.meetingPoint}.</p>}
                {data.demo.arrivalNote && <p>Arrival note to repeat: {data.demo.arrivalNote}</p>}
                <p>Pick accessible meeting points, exits, shelter options, water, first-aid point, and a quiet place for anyone who needs support.</p>
                <p>Agree who gives crowd instructions if the route changes, the event pauses, or people need to reconnect.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-5 w-5 text-primary" />
                  Admin roles
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                {data.admins.map((admin) => (
                  <div key={admin.id} className="rounded-lg border bg-background p-3">
                    <p className="font-medium text-foreground">{admin.name}</p>
                    <p className="text-xs">{admin.email}</p>
                  </div>
                ))}
                {!hasBackupAdmin && (
                  <p className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-xs text-orange-900">
                    Add a backup admin before going live so another device can keep the chant running.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Participant joining plan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p className="break-all rounded-lg border bg-background p-3 font-medium text-foreground">{publicUrl}</p>
                <p>Print the QR handout, share the fallback link by message, and announce the link for people who cannot scan the QR code.</p>
                <p>Ask participants to keep the page open and use large text or high contrast if visibility is difficult.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Live control checklist</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>Test the participant page from a phone before inviting the crowd.</p>
                <p>Keep one admin focused on ChantLive controls and one backup admin ready to take over.</p>
                <p>After the gathering, end the demonstration and export it if the chant plan should be reused.</p>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}
