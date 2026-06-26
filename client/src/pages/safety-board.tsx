import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, Check, Copy, HeartHandshake, Megaphone, Printer, ShieldCheck, Users } from "lucide-react";
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

const safetySections = [
  {
    title: "Marshal briefing",
    icon: ShieldCheck,
    items: [
      "Point participants to exits, water, quiet space, and the organiser before chanting starts.",
      "Repeat safety directions verbally because not everyone will be looking at a phone.",
      "If the crowd needs to move, pause chanting and follow local safety instructions first.",
    ],
  },
  {
    title: "Accessibility support",
    icon: HeartHandshake,
    items: [
      "Offer the plain participant link to anyone who cannot scan a QR code.",
      "Tell participants about large text, high contrast, low-bandwidth mode, and the Help panel.",
      "Make sure important announcements are spoken clearly and repeated.",
    ],
  },
  {
    title: "Organizer fallback",
    icon: Megaphone,
    items: [
      "Keep the command center and recovery console open on a backup device.",
      "If ChantLive disconnects, ask people to keep the page open before refreshing.",
      "Use the backup admin handoff if the primary organiser loses access.",
    ],
  },
  {
    title: "Participant guidance",
    icon: Users,
    items: [
      "Chant timing is guidance, not a safety instruction.",
      "Follow marshals, venue staff, or emergency instructions immediately.",
      "Ask for help if the screen is hard to read, audio is unclear, or the page stops updating.",
    ],
  },
];

export default function SafetyBoard() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery<DemoDetail>({
    queryKey: ["/api/demos", id],
  });

  const copySafetyBoard = async () => {
    if (!data) return;
    const text = [
      `${data.demo.title} safety board`,
      ...safetySections.map((section) => `${section.title}\n${section.items.map((item) => `- ${item}`).join("\n")}`),
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
            <Button variant="outline" size="sm" onClick={copySafetyBoard} data-testid="button-copy-safety-board">
              {copied ? <Check className="mr-1 h-4 w-4" /> : <Copy className="mr-1 h-4 w-4" />}
              {copied ? "Copied" : "Copy safety board"}
            </Button>
            <Button size="sm" onClick={() => window.print()} data-testid="button-print-safety-board">
              <Printer className="mr-1 h-4 w-4" />
              Print
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <section className="print-handout-page rounded-2xl border bg-card p-6 shadow-sm" data-testid="section-safety-board">
          <div className="border-b pb-5">
            <Badge variant="secondary" className="mb-3">Safety board</Badge>
            <h1 className="text-3xl font-bold tracking-tight">{data.demo.title}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              A visible organiser checklist for marshals, accessibility helpers, backup admins, and participant safety reminders.
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {safetySections.map((section) => {
              const Icon = section.icon;
              return (
                <Card key={section.title} data-testid={`card-safety-${section.title.toLowerCase().replace(/\s+/g, "-")}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Icon className="h-5 w-5 text-primary" />
                      {section.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      {section.items.map((item) => (
                        <li key={item}>- {item}</li>
                      ))}
                    </ul>
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
