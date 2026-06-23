import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, Check, Copy, ExternalLink, MessageSquare, Printer, Share2 } from "lucide-react";
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

type MessageTemplate = {
  id: string;
  title: string;
  audience: string;
  body: string;
};

function buildTemplates(data: DemoDetail, publicUrl: string, handoutUrl: string, planUrl: string): MessageTemplate[] {
  const title = data.demo.title;
  const chantCount = data.chants.length;
  const duration = data.state?.eventDurationMinutes ?? 300;
  const backupAdminLine = data.admins.length > 1
    ? `Backup admins are set: ${data.admins.map((admin) => admin.name).join(", ")}.`
    : "Please add one backup admin before going live.";

  return [
    {
      id: "participant-invite",
      title: "Participant invite",
      audience: "Send before the event",
      body: [
        `Join ${title} on ChantLive:`,
        publicUrl,
        "",
        "Open this link before the event starts and keep the page open. The current chant will update automatically.",
        "If QR scanning does not work, use this same link.",
      ].join("\n"),
    },
    {
      id: "accessibility-fallback",
      title: "Accessible joining fallback",
      audience: "Read aloud or print",
      body: [
        `For ${title}, you can join without scanning a QR code.`,
        `Open this link: ${publicUrl}`,
        "",
        "Ask an organiser if you need large text, high contrast, a quieter place, or help reconnecting.",
      ].join("\n"),
    },
    {
      id: "backup-admin",
      title: "Backup admin handoff",
      audience: "Send to co-organisers",
      body: [
        `You are a backup admin for ${title}.`,
        `Event plan: ${planUrl}`,
        `Participant handout: ${handoutUrl}`,
        "",
        backupAdminLine,
        "Please open the event before we go live and be ready to take over if the primary device drops.",
      ].join("\n"),
    },
    {
      id: "day-of-announcement",
      title: "Day-of announcement",
      audience: "Speaker or marshal script",
      body: [
        `We are using ChantLive for ${title}.`,
        "Please scan the QR code or open the participant link, then keep the page open.",
        `There are ${chantCount} chants prepared and the event timer is set for ${duration} minutes.`,
        "If the page stops updating, use the Help button or refresh your connection.",
      ].join("\n"),
    },
    {
      id: "social-post",
      title: "Short public post",
      audience: "Share with the community",
      body: [
        `${title} will use ChantLive for live chant coordination.`,
        "Participants can join from a phone without creating an account.",
        `Join link: ${publicUrl}`,
      ].join("\n"),
    },
  ];
}

export default function ShareKit() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<DemoDetail>({
    queryKey: ["/api/demos", id],
  });

  const origin = window.location.origin;
  const publicUrl = data?.demo ? `${origin}/d/${data.demo.publicId}` : "";
  const handoutUrl = id ? `${origin}/admin/demos/${id}/handout` : "";
  const planUrl = id ? `${origin}/admin/demos/${id}/plan` : "";
  const templates = data ? buildTemplates(data, publicUrl, handoutUrl, planUrl) : [];

  const copyMessage = async (template: MessageTemplate) => {
    await navigator.clipboard.writeText(template.body);
    setCopiedId(template.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const copyAll = async () => {
    await navigator.clipboard.writeText(templates.map((template) => `${template.title}\n${template.body}`).join("\n\n---\n\n"));
    setCopiedId("all");
    setTimeout(() => setCopiedId(null), 1800);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="mx-auto max-w-5xl space-y-4">
          <Skeleton className="h-10 w-60" />
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
            <Button variant="outline" size="sm" onClick={copyAll} data-testid="button-copy-all-share-kit">
              {copiedId === "all" ? <Check className="mr-1 h-4 w-4" /> : <Copy className="mr-1 h-4 w-4" />}
              {copiedId === "all" ? "Copied all" : "Copy all"}
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={publicUrl} target="_blank" rel="noopener noreferrer" data-testid="link-share-kit-participant">
                <ExternalLink className="mr-1 h-4 w-4" />
                Participant page
              </a>
            </Button>
            <Button size="sm" onClick={() => window.print()} data-testid="button-print-share-kit">
              <Printer className="mr-1 h-4 w-4" />
              Print kit
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <section className="print-handout-page rounded-2xl border bg-card p-6 shadow-sm" data-testid="section-share-kit">
          <div className="flex flex-col gap-4 border-b pb-5 md:flex-row md:items-start md:justify-between">
            <div>
              <Badge variant="secondary" className="mb-3">Share kit</Badge>
              <h1 className="text-3xl font-bold tracking-tight">{data.demo.title}</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Copy-ready plain-language messages for participants, backup admins, accessibility fallback, day-of announcements, and public posts.
              </p>
            </div>
            <div className="rounded-xl border bg-background p-4 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Useful links</p>
              <p className="mt-2 break-all">Participant: {publicUrl}</p>
              <p className="mt-1 break-all">Handout: {handoutUrl}</p>
              <p className="mt-1 break-all">Plan: {planUrl}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {templates.map((template) => (
              <Card key={template.id} data-testid={`card-share-template-${template.id}`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    {template.title}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">{template.audience}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <pre className="whitespace-pre-wrap rounded-lg border bg-muted/40 p-3 text-sm leading-relaxed text-foreground">
                    {template.body}
                  </pre>
                  <Button variant="outline" size="sm" onClick={() => copyMessage(template)} data-testid={`button-copy-share-template-${template.id}`}>
                    {copiedId === template.id ? <Check className="mr-1 h-4 w-4" /> : <Copy className="mr-1 h-4 w-4" />}
                    {copiedId === template.id ? "Copied" : "Copy message"}
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
