import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, Check, Copy, ExternalLink, LifeBuoy, Printer, Radio, RefreshCw, Users } from "lucide-react";
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

type RecoveryScript = {
  id: string;
  title: string;
  text: string;
};

function buildRecoveryScripts(data: DemoDetail, publicUrl: string): RecoveryScript[] {
  return [
    {
      id: "reconnect",
      title: "Participant reconnect announcement",
      text: `If your ChantLive page stops updating for ${data.demo.title}, keep the page open and press Help, then Refresh connection. If that fails, open this link again: ${publicUrl}`,
    },
    {
      id: "fallback-link",
      title: "QR fallback announcement",
      text: `If the QR code is not scanning, type or open this participant link instead: ${publicUrl}`,
    },
    {
      id: "pause",
      title: "Temporary pause announcement",
      text: "We are pausing the chant for a moment. Please follow organiser instructions first. The ChantLive page will resume when the organiser pushes the next chant.",
    },
    {
      id: "handoff",
      title: "Backup admin handoff",
      text: `Backup admin: open ${window.location.origin}/admin/demos/${data.demo.id} and be ready to control ${data.demo.title} if the primary device drops.`,
    },
  ];
}

export default function RecoveryConsole() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery<DemoDetail>({
    queryKey: ["/api/demos", id],
    refetchInterval: 5000,
  });

  const publicUrl = data?.demo ? `${window.location.origin}/d/${data.demo.publicId}` : "";
  const scripts = data ? buildRecoveryScripts(data, publicUrl) : [];
  const currentChant = useMemo(() => {
    if (!data?.state?.currentChantId) return null;
    return data.chants.find((chant) => chant.id === data.state?.currentChantId) ?? null;
  }, [data]);

  const copyScript = async (script: RecoveryScript) => {
    await navigator.clipboard.writeText(script.text);
    setCopiedId(script.id);
    setTimeout(() => setCopiedId(null), 1800);
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

  const hasBackupAdmin = data.admins.length > 1;
  const isLive = data.demo.status === "live";

  return (
    <div className="min-h-screen bg-background">
      <header className="no-print sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/demos/${id}`)} data-testid="button-back-editor">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to event
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} data-testid="button-refresh-recovery-console">
              <RefreshCw className="mr-1 h-4 w-4" />
              Refresh status
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={publicUrl} target="_blank" rel="noopener noreferrer" data-testid="link-open-recovery-participant">
                <ExternalLink className="mr-1 h-4 w-4" />
                Participant page
              </a>
            </Button>
            <Button size="sm" onClick={() => window.print()} data-testid="button-print-recovery-console">
              <Printer className="mr-1 h-4 w-4" />
              Print console
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <section className="print-handout-page rounded-2xl border bg-card p-6 shadow-sm" data-testid="section-recovery-console">
          <div className="flex flex-col gap-4 border-b pb-5 md:flex-row md:items-start md:justify-between">
            <div>
              <Badge variant={isLive ? "default" : "secondary"} className="mb-3">
                {isLive ? "Live recovery" : "Recovery prep"}
              </Badge>
              <h1 className="text-3xl font-bold tracking-tight">{data.demo.title}</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                A focused console for reconnect instructions, backup-admin handoff, participant fallback links, and live status checks.
              </p>
            </div>
            <div className="rounded-xl border bg-background p-4 text-sm">
              <p className="font-medium">Live snapshot</p>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                <div>
                  <dt>Status</dt>
                  <dd className="font-semibold text-foreground">{data.demo.status}</dd>
                </div>
                <div>
                  <dt>Viewing</dt>
                  <dd className="font-semibold text-foreground">{data.viewerCount}</dd>
                </div>
                <div>
                  <dt>Admins</dt>
                  <dd className="font-semibold text-foreground">{data.admins.length}</dd>
                </div>
                <div>
                  <dt>Current</dt>
                  <dd className="font-semibold text-foreground">{currentChant ? "Chant active" : "No chant"}</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Radio className="h-5 w-5 text-primary" />
                  Current chant
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                {currentChant ? (
                  <>
                    <p><span className="font-medium text-foreground">Leader:</span> {currentChant.callText || "No call text"}</p>
                    <p><span className="font-medium text-foreground">Everyone:</span> {currentChant.responseText || "No response text"}</p>
                  </>
                ) : (
                  <p>No chant is currently pushed live.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-5 w-5 text-primary" />
                  Backup coverage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>{hasBackupAdmin ? "Backup admin coverage is available." : "No backup admin is assigned yet."}</p>
                <p className="break-all">Participant fallback: {publicUrl}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <LifeBuoy className="h-5 w-5 text-primary" />
                  Recovery order
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>1. Keep participants on the same link.</p>
                <p>2. Ask them to use Help then Refresh connection.</p>
                <p>3. Hand control to backup admin if the primary device drops.</p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {scripts.map((script) => (
              <Card key={script.id} data-testid={`card-recovery-script-${script.id}`}>
                <CardHeader>
                  <CardTitle className="text-base">{script.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="rounded-lg border bg-muted/40 p-3 text-sm text-foreground">{script.text}</p>
                  <Button variant="outline" size="sm" onClick={() => copyScript(script)} data-testid={`button-copy-recovery-script-${script.id}`}>
                    {copiedId === script.id ? <Check className="mr-1 h-4 w-4" /> : <Copy className="mr-1 h-4 w-4" />}
                    {copiedId === script.id ? "Copied" : "Copy script"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
