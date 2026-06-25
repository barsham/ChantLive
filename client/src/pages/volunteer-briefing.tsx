import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, Check, Copy, Megaphone, Printer, ShieldCheck, Users, Volume2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
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

type BriefingRole = {
  id: string;
  title: string;
  icon: LucideIcon;
  bullets: string[];
};

function buildRoles(data: DemoDetail, publicUrl: string): BriefingRole[] {
  return [
    {
      id: "speaker",
      title: "Speaker or chant leader",
      icon: Volume2,
      bullets: [
        "Keep the chant pace close to the configured timing.",
        "Tell participants to keep the ChantLive page open.",
        "Repeat the fallback link if QR scanning is difficult.",
      ],
    },
    {
      id: "marshal",
      title: "Marshal or crowd guide",
      icon: ShieldCheck,
      bullets: [
        "Prioritise local safety instructions over chant timing.",
        "Help people find exits, quiet space, water, and the organiser.",
        "Use the recovery script if participants lose updates.",
      ],
    },
    {
      id: "accessibility",
      title: "Accessibility helper",
      icon: Users,
      bullets: [
        "Offer the plain participant link for people who cannot scan QR codes.",
        "Remind participants about large text, high contrast, and low-bandwidth mode.",
        "Check that announcements are spoken clearly and repeated when needed.",
      ],
    },
    {
      id: "backup-admin",
      title: "Backup admin",
      icon: Megaphone,
      bullets: [
        `Open the event editor before ${data.demo.title} starts.`,
        "Be ready to take over if the primary device drops.",
        `Keep the participant link available: ${publicUrl}`,
      ],
    },
  ];
}

export default function VolunteerBriefing() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<DemoDetail>({
    queryKey: ["/api/demos", id],
  });

  const publicUrl = data?.demo ? `${window.location.origin}/d/${data.demo.publicId}` : "";
  const roles = data ? buildRoles(data, publicUrl) : [];

  const copyRole = async (role: BriefingRole) => {
    await navigator.clipboard.writeText(`${role.title}\n${role.bullets.map((item) => `- ${item}`).join("\n")}`);
    setCopiedId(role.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const copyAll = async () => {
    await navigator.clipboard.writeText(roles.map((role) => `${role.title}\n${role.bullets.map((item) => `- ${item}`).join("\n")}`).join("\n\n"));
    setCopiedId("all");
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

  return (
    <div className="min-h-screen bg-background">
      <header className="no-print sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/demos/${id}`)} data-testid="button-back-editor">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to event
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={copyAll} data-testid="button-copy-all-briefing">
              {copiedId === "all" ? <Check className="mr-1 h-4 w-4" /> : <Copy className="mr-1 h-4 w-4" />}
              {copiedId === "all" ? "Copied all" : "Copy all"}
            </Button>
            <Button size="sm" onClick={() => window.print()} data-testid="button-print-briefing">
              <Printer className="mr-1 h-4 w-4" />
              Print briefing
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <section className="print-handout-page rounded-2xl border bg-card p-6 shadow-sm" data-testid="section-volunteer-briefing">
          <div className="border-b pb-5">
            <Badge variant="secondary" className="mb-3">Volunteer briefing</Badge>
            <h1 className="text-3xl font-bold tracking-tight">{data.demo.title}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Role cards for the people who keep a live gathering understandable, accessible, and recoverable.
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {roles.map((role) => {
              const Icon = role.icon;
              return (
                <Card key={role.id} data-testid={`card-briefing-role-${role.id}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Icon className="h-5 w-5 text-primary" />
                      {role.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      {role.bullets.map((item) => (
                        <li key={item}>- {item}</li>
                      ))}
                    </ul>
                    <Button variant="outline" size="sm" onClick={() => copyRole(role)} data-testid={`button-copy-briefing-role-${role.id}`}>
                      {copiedId === role.id ? <Check className="mr-1 h-4 w-4" /> : <Copy className="mr-1 h-4 w-4" />}
                      {copiedId === role.id ? "Copied" : "Copy role card"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
