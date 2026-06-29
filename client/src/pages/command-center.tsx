import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, CheckCircle2, ClipboardList, FileText, LifeBuoy, Megaphone, QrCode, Route, Share2, ShieldCheck, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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

type AssistanceRequest = {
  id: string;
  type: "accessibility" | "connection" | "safety" | "organizer";
  message: string;
  status: "open" | "resolved";
  createdAt: string;
  resolvedAt: string | null;
  participantLabel: string;
};
type CrowdPulseSummary = {
  counts: {
    too_fast: number;
    too_slow: number;
    cant_hear: number;
    all_good: number;
  };
  total: number;
  updatedAt: string | null;
};
type AudienceQuestion = {
  id: string;
  text: string;
  status: "open" | "answered" | "dismissed";
  votes: number;
  createdAt: string;
  resolvedAt: string | null;
  participantLabel: string;
};
type CheckInRole = "participant" | "marshal" | "speaker" | "accessibility";
type CheckInSummary = {
  total: number;
  roles: Record<CheckInRole, number>;
  checkIns: Array<{
    role: CheckInRole;
    displayName: string | null;
    checkedInAt: string;
    updatedAt: string;
    participantLabel: string;
  }>;
};

function statusTone(status: string) {
  if (status === "live") return "Live event: prioritize recovery, current chant, and participant link visibility.";
  if (status === "ended") return "Ended event: prioritize report, export, and reuse decisions.";
  return "Draft event: prioritize readiness, sharing, volunteer briefing, and handouts.";
}

export default function CommandCenter() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [announcementMessage, setAnnouncementMessage] = useState("");

  const { data, isLoading } = useQuery<DemoDetail>({
    queryKey: ["/api/demos", id],
    refetchInterval: 5000,
  });
  const { data: assistance = [] } = useQuery<AssistanceRequest[]>({
    queryKey: ["/api/demos", id, "assistance"],
    refetchInterval: 3000,
    enabled: Boolean(id),
  });
  const { data: pulse } = useQuery<CrowdPulseSummary>({
    queryKey: ["/api/demos", id, "pulse"],
    refetchInterval: 3000,
    enabled: Boolean(id),
  });
  const { data: audienceQuestions = [] } = useQuery<AudienceQuestion[]>({
    queryKey: ["/api/demos", id, "questions"],
    refetchInterval: 3000,
    enabled: Boolean(id),
  });
  const { data: checkIns } = useQuery<CheckInSummary>({
    queryKey: ["/api/demos", id, "checkins"],
    refetchInterval: 3000,
    enabled: Boolean(id),
  });
  const resolveAssistance = useMutation({
    mutationFn: async (requestId: string) => {
      await apiRequest("PATCH", `/api/demos/${id}/assistance/${requestId}`, { status: "resolved" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/demos", id, "assistance"] });
      toast({ title: "Assistance request resolved" });
    },
    onError: (err: Error) => {
      toast({ title: "Could not resolve request", description: err.message, variant: "destructive" });
    },
  });
  const sendAnnouncement = useMutation({
    mutationFn: async (message: string) => {
      await apiRequest("POST", `/api/demos/${id}/announcement`, { message });
    },
    onSuccess: () => {
      setAnnouncementMessage("");
      toast({ title: "Announcement sent to participants" });
    },
    onError: (err: Error) => {
      toast({ title: "Could not send announcement", description: err.message, variant: "destructive" });
    },
  });
  const moderateQuestion = useMutation({
    mutationFn: async ({ questionId, status }: { questionId: string; status: "answered" | "dismissed" }) => {
      await apiRequest("PATCH", `/api/demos/${id}/questions/${questionId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/demos", id, "questions"] });
      toast({ title: "Audience question updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Could not update question", description: err.message, variant: "destructive" });
    },
  });

  const currentChant = useMemo(() => {
    if (!data?.state?.currentChantId) return null;
    return data.chants.find((chant) => chant.id === data.state?.currentChantId) ?? null;
  }, [data]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="mx-auto max-w-6xl space-y-4">
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

  const publicUrl = `${window.location.origin}/d/${data.demo.publicId}`;
  const openAssistance = assistance.filter((request) => request.status === "open");
  const openQuestions = audienceQuestions
    .filter((question) => question.status === "open")
    .sort((a, b) => b.votes - a.votes || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const readiness = [
    { label: "Chants", ready: data.chants.length > 0, detail: `${data.chants.length} prepared` },
    { label: "Backup admin", ready: data.admins.length > 1, detail: `${data.admins.length} admin${data.admins.length === 1 ? "" : "s"}` },
    { label: "Participant link", ready: Boolean(publicUrl), detail: "Available" },
    { label: "Live state", ready: data.demo.status === "live", detail: data.demo.status },
    { label: "Checked in", ready: (checkIns?.total ?? 0) > 0, detail: `${checkIns?.total ?? 0} people` },
    { label: "Help requests", ready: openAssistance.length === 0, detail: `${openAssistance.length} open` },
    { label: "Questions", ready: openQuestions.length === 0, detail: `${openQuestions.length} open` },
  ];

  const tools = [
    { label: "Control event", description: "Edit chants, push live, manage timing, and invite admins.", icon: Megaphone, path: `/admin/demos/${id}` },
    { label: "Run of show", description: "Print a timed event-day sequence for arrival, safety, chanting, recovery, and debrief.", icon: Route, path: `/admin/demos/${id}/run-of-show` },
    { label: "Safety board", description: "Brief marshals, accessibility helpers, backup admins, and participants on event-day safety.", icon: ShieldCheck, path: `/admin/demos/${id}/safety` },
    { label: "Event plan", description: "Open the operational runbook for permits, access, safety, and admin roles.", icon: ClipboardList, path: `/admin/demos/${id}/plan` },
    { label: "Share kit", description: "Copy participant, backup-admin, recovery, and follow-up messages.", icon: Share2, path: `/admin/demos/${id}/share-kit` },
    { label: "Participant handout", description: "Print or project the participant QR code and fallback link.", icon: QrCode, path: `/admin/demos/${id}/handout` },
    { label: "Recovery console", description: "Use reconnect scripts, fallback links, and backup-admin handoff during disruption.", icon: LifeBuoy, path: `/admin/demos/${id}/recovery` },
    { label: "Volunteer briefing", description: "Give speakers, marshals, accessibility helpers, and backup admins role cards.", icon: Users, path: `/admin/demos/${id}/briefing` },
    { label: "Post-event report", description: "Review chants, runtime, viewer snapshot, and debrief checklist.", icon: FileText, path: `/admin/demos/${id}/report` },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/demos/${id}`)} data-testid="button-back-editor">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to event
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={publicUrl} target="_blank" rel="noopener noreferrer" data-testid="link-command-participant">Participant page</a>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <section className="rounded-2xl border bg-card p-6 shadow-sm" data-testid="section-command-center">
          <div className="border-b pb-5">
            <Badge variant={data.demo.status === "live" ? "default" : "secondary"} className="mb-3">Command center</Badge>
            <h1 className="text-3xl font-bold tracking-tight">{data.demo.title}</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{statusTone(data.demo.status)}</p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-7">
            {readiness.map((item) => (
              <Card key={item.label} data-testid={`card-command-readiness-${item.label.toLowerCase().replace(/\s+/g, "-")}`}>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="mt-1 text-lg font-semibold">{item.detail}</p>
                  <p className={`mt-1 text-xs ${item.ready ? "text-emerald-600" : "text-orange-600"}`}>
                    {item.ready ? "Ready" : "Needs attention"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Current live context</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm text-muted-foreground md:grid-cols-3">
              <p><span className="font-medium text-foreground">Viewers:</span> {data.viewerCount}</p>
              <p><span className="font-medium text-foreground">Current chant:</span> {currentChant ? currentChant.callText || "Chant selected" : "None"}</p>
              <p className="break-all"><span className="font-medium text-foreground">Participant link:</span> {publicUrl}</p>
            </CardContent>
          </Card>

          <Card className="mt-6" data-testid="card-participant-checkins">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-3 text-base">
                <span className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Participant check-ins
                </span>
                <Badge variant={(checkIns?.total ?? 0) > 0 ? "default" : "secondary"}>
                  {checkIns?.total ?? 0} checked in
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ["Participants", checkIns?.roles.participant ?? 0],
                  ["Marshals", checkIns?.roles.marshal ?? 0],
                  ["Speakers", checkIns?.roles.speaker ?? 0],
                  ["Accessibility helpers", checkIns?.roles.accessibility ?? 0],
                ].map(([label, count]) => (
                  <div key={label} className="rounded-lg border bg-background p-3">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="mt-1 text-2xl font-bold">{count}</p>
                  </div>
                ))}
              </div>
              {(checkIns?.checkIns.length ?? 0) === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground" data-testid="text-no-checkins">
                  No participant check-ins yet. Ask people to open Help and check in with their event role.
                </p>
              ) : (
                <div className="mt-4 grid gap-2 md:grid-cols-2">
                  {checkIns?.checkIns.slice(0, 8).map((checkIn) => (
                    <div key={`${checkIn.participantLabel}-${checkIn.updatedAt}`} className="rounded-lg border bg-background p-3" data-testid={`card-checkin-${checkIn.role}`}>
                      <p className="text-sm font-medium">{checkIn.participantLabel}</p>
                      <p className="mt-1 text-xs capitalize text-muted-foreground">
                        {checkIn.role === "accessibility" ? "Accessibility helper" : checkIn.role} - {new Date(checkIn.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Card data-testid="card-crowd-pulse">
              <CardHeader>
                <CardTitle className="text-base">Crowd pulse</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    ["Too fast", pulse?.counts.too_fast ?? 0],
                    ["Too slow", pulse?.counts.too_slow ?? 0],
                    ["Can't hear", pulse?.counts.cant_hear ?? 0],
                    ["All good", pulse?.counts.all_good ?? 0],
                  ].map(([label, count]) => (
                    <div key={label} className="rounded-lg border bg-background p-3">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="mt-1 text-2xl font-bold">{count}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {pulse?.total ? `${pulse.total} participants have sent their latest signal.` : "No participant pulse signals yet."}
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-send-announcement">
              <CardHeader>
                <CardTitle className="text-base">Send participant announcement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  value={announcementMessage}
                  onChange={(event) => setAnnouncementMessage(event.target.value)}
                  placeholder="Example: Move closer to the speaker, then keep this page open."
                  rows={3}
                  maxLength={180}
                  data-testid="input-announcement-message"
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">{announcementMessage.length}/180 characters</p>
                  <Button
                    size="sm"
                    onClick={() => sendAnnouncement.mutate(announcementMessage.trim())}
                    disabled={!announcementMessage.trim() || sendAnnouncement.isPending}
                    data-testid="button-send-announcement"
                  >
                    Send to participants
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6 border-primary/20 bg-primary/5" data-testid="card-live-assistance-queue">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-3 text-base">
                <span className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Live participant assistance
                </span>
                <Badge variant={openAssistance.length > 0 ? "default" : "secondary"}>
                  {openAssistance.length} open
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {openAssistance.length === 0 ? (
                <p className="text-sm text-muted-foreground" data-testid="text-no-assistance-requests">
                  No active participant help requests. When someone asks for accessibility, connection, or safety help, it appears here.
                </p>
              ) : (
                <div className="space-y-3">
                  {openAssistance.map((request) => (
                    <div key={request.id} className="rounded-lg border bg-background p-3" data-testid={`card-assistance-request-${request.id}`}>
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="font-medium capitalize">{request.type} help</p>
                          <p className="mt-1 text-sm text-muted-foreground">{request.message}</p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {request.participantLabel} - {new Date(request.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => resolveAssistance.mutate(request.id)}
                          disabled={resolveAssistance.isPending}
                          data-testid={`button-resolve-assistance-${request.id}`}
                        >
                          <CheckCircle2 className="mr-1 h-4 w-4" />
                          Mark resolved
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mt-6" data-testid="card-audience-question-queue">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-3 text-base">
                <span className="flex items-center gap-2">
                  <Megaphone className="h-5 w-5 text-primary" />
                  Live audience Q&A
                </span>
                <Badge variant={openQuestions.length > 0 ? "default" : "secondary"}>{openQuestions.length} open</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {openQuestions.length === 0 ? (
                <p className="text-sm text-muted-foreground" data-testid="text-no-audience-question-queue">
                  No open audience questions. Participant questions and upvotes will appear here.
                </p>
              ) : (
                <div className="space-y-3">
                  {openQuestions.slice(0, 8).map((question) => (
                    <div key={question.id} className="rounded-lg border bg-background p-3" data-testid={`card-admin-audience-question-${question.id}`}>
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="text-sm font-medium">{question.text}</p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {question.votes} vote{question.votes === 1 ? "" : "s"} - {question.participantLabel} - {new Date(question.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => moderateQuestion.mutate({ questionId: question.id, status: "answered" })}
                            disabled={moderateQuestion.isPending}
                            data-testid={`button-answer-question-${question.id}`}
                          >
                            Answered
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => moderateQuestion.mutate({ questionId: question.id, status: "dismissed" })}
                            disabled={moderateQuestion.isPending}
                            data-testid={`button-dismiss-question-${question.id}`}
                          >
                            Dismiss
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {tools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Card key={tool.label} data-testid={`card-command-tool-${tool.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Icon className="h-5 w-5 text-primary" />
                      {tool.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">{tool.description}</p>
                    <Button variant="outline" size="sm" onClick={() => navigate(tool.path)}>
                      Open
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
