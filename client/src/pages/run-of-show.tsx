import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, Check, Clock, Copy, Printer, Route } from "lucide-react";
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

type AgendaItem = {
  label: string;
  detail: string;
  minutes: number;
};

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins === 0) return `${secs}s`;
  return `${mins}m${secs > 0 ? ` ${secs}s` : ""}`;
};

function buildAgenda(data: DemoDetail): AgendaItem[] {
  const cycleDelaySeconds = (data.state?.cycleDelay ?? 500) / 1000;
  const chantSeconds = data.chants.reduce((total, chant, index) => {
    const cycles = Math.max(1, chant.cycles ?? 1);
    const duration = cycles * ((chant.leaderDuration ?? 4) + (chant.peopleDuration ?? 3));
    return total + duration + (index > 0 ? cycleDelaySeconds : 0);
  }, 0);

  return [
    {
      label: "Arrival and link check",
      detail: "Open participant link, test QR scanning, confirm backup admin access, and brief volunteers.",
      minutes: 10,
    },
    {
      label: "Safety and accessibility reminder",
      detail: "Explain marshal locations, quiet-space/accessibility help, and that local safety instructions override chant timing.",
      minutes: 3,
    },
    {
      label: "Live chant block",
      detail: `${data.chants.length} chants prepared. Estimated chant runtime is ${formatDuration(chantSeconds)} before pauses or speeches.`,
      minutes: Math.max(1, Math.ceil(chantSeconds / 60)),
    },
    {
      label: "Recovery checkpoint",
      detail: "If phones stop updating, ask participants to keep pages open and use the recovery console before changing the live flow.",
      minutes: 2,
    },
    {
      label: "Close and debrief",
      detail: "End the demonstration, thank participants, capture what worked, and review the post-event report.",
      minutes: 5,
    },
  ];
}

export default function RunOfShow() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery<DemoDetail>({
    queryKey: ["/api/demos", id],
  });

  const agenda = useMemo(() => data ? buildAgenda(data) : [], [data]);
  const totalMinutes = agenda.reduce((total, item) => total + item.minutes, 0);

  const copyAgenda = async () => {
    if (!data) return;
    const text = [
      `${data.demo.title} run of show`,
      ...agenda.map((item, index) => `${index + 1}. ${item.label} (${item.minutes} min)\n${item.detail}`),
      `Total guided runtime: ${totalMinutes} min`,
    ].join("\n\n");
    await navigator.clipboard.writeText(text);
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
            <Button variant="outline" size="sm" onClick={copyAgenda} data-testid="button-copy-run-of-show">
              {copied ? <Check className="mr-1 h-4 w-4" /> : <Copy className="mr-1 h-4 w-4" />}
              {copied ? "Copied" : "Copy run of show"}
            </Button>
            <Button size="sm" onClick={() => window.print()} data-testid="button-print-run-of-show">
              <Printer className="mr-1 h-4 w-4" />
              Print
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <section className="print-handout-page rounded-2xl border bg-card p-6 shadow-sm" data-testid="section-run-of-show">
          <div className="flex flex-col gap-4 border-b pb-5 md:flex-row md:items-start md:justify-between">
            <div>
              <Badge variant="secondary" className="mb-3">Run of show</Badge>
              <h1 className="text-3xl font-bold tracking-tight">{data.demo.title}</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                A printable event-day sequence that combines arrival, accessibility, chant timing, recovery, and debrief steps.
              </p>
            </div>
            <div className="rounded-xl border bg-background p-4 text-sm">
              <p className="flex items-center gap-2 font-medium">
                <Clock className="h-4 w-4 text-primary" />
                Guided runtime
              </p>
              <p className="mt-1 text-2xl font-bold">{totalMinutes} min</p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {agenda.map((item, index) => (
              <Card key={item.label} data-testid={`card-run-step-${index + 1}`}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-3 text-base">
                    <span className="flex items-center gap-2">
                      <Route className="h-5 w-5 text-primary" />
                      {index + 1}. {item.label}
                    </span>
                    <Badge variant="outline">{item.minutes} min</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{item.detail}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
