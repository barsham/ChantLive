import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, CalendarCheck2, Check, ClipboardCheck, Copy, Download, ListOrdered, MessageCircleQuestion, Printer, ShieldCheck, Users } from "lucide-react";
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
type AttendanceSummary = {
  liveNow: number;
  uniqueParticipants: number;
  totalVisits: number;
  returningParticipants: number;
  reconnectVisits: number;
  peakConcurrent: number;
  observedSeconds: number;
  firstJoinAt: string | null;
  lastSeenAt: string | null;
  timeline: Array<{ startedAt: string; firstJoins: number; returnVisits: number }>;
  privacy: string;
};
type RegistrationSummary = {
  enabled: boolean;
  capacity: number | null;
  closesAt: string | null;
  closed: boolean;
  confirmed: number;
  waitlisted: number;
  available: number | null;
  overCapacity: number;
  confirmedAttended: number;
  turnoutRate: number | null;
  privacy: string;
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
type RunSheetItem = {
  id: string;
  orderIndex: number;
  kind: string;
  title: string;
  participantNote: string | null;
  plannedDurationMinutes: number;
  actualDurationMinutes: number | null;
  status: "pending" | "active" | "completed" | "skipped";
  startedAt: string | null;
  completedAt: string | null;
};
type RunSheetPayload = {
  items: RunSheetItem[];
  summary: { total: number; plannedDurationMinutes: number; completed: number; skipped: number; pending: number; active: RunSheetItem | null; next: RunSheetItem | null; storage: "shared"; updatedAt: string | null };
};
type AudienceQuestion = {
  id: string;
  text: string;
  status: "open" | "answering" | "answered" | "dismissed";
  votes: number;
  organizerResponse: string | null;
  createdAt: string;
};
type AudienceQuestionPayload = {
  questions: AudienceQuestion[];
  summary: { total: number; open: number; answering: number; answered: number; dismissed: number; votes: number; answerRate: number | null };
  storage: "shared";
  privacy: string;
};

function formatRuntime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  if (minutes === 0) return `${seconds}s`;
  return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
}

function buildReportText(data: DemoDetail, runtime: string, feedback?: FeedbackSummary, conduct?: ConductReportSummary, runSheet?: RunSheetPayload, attendance?: AttendanceSummary, registration?: RegistrationSummary, questions?: AudienceQuestionPayload) {
  return [
    `ChantLive Post-Event Report: ${data.demo.title}`,
    "",
    `Status: ${data.demo.status}`,
    `Created: ${new Date(data.demo.createdAt).toLocaleString()}`,
    `Chants prepared: ${data.chants.length}`,
    `Estimated chant runtime: ${runtime}`,
    `Admins: ${data.admins.map((admin) => `${admin.name} <${admin.email}>`).join(", ") || "None listed"}`,
    `Attendance: ${attendance?.uniqueParticipants ?? 0} unique people, ${attendance?.totalVisits ?? 0} total visits, ${attendance?.returningParticipants ?? 0} returning, ${attendance?.peakConcurrent ?? 0} peak together`,
    `Observed participant time: ${formatRuntime(attendance?.observedSeconds ?? 0)}`,
    `Anonymous RSVP: ${registration?.confirmed ?? 0} confirmed, ${registration?.waitlisted ?? 0} waitlisted, ${registration?.capacity ?? "no capacity set"} capacity`,
    `Confirmed RSVP turnout: ${registration?.confirmedAttended ?? 0} attended${registration?.turnoutRate == null ? "" : ` (${registration.turnoutRate}%)`}`,
    `Participant feedback responses: ${feedback?.total ?? 0}`,
    `Feedback averages: clarity ${feedback?.averages.clarity ?? 0}/5, safety ${feedback?.averages.safety ?? 0}/5, accessibility ${feedback?.averages.accessibility ?? 0}/5`,
    `Private conduct concerns: ${conduct?.total ?? 0} total, ${conduct?.open ?? 0} unseen, ${conduct?.acknowledged ?? 0} acknowledged, ${conduct?.resolved ?? 0} resolved, ${conduct?.urgent ?? 0} urgent`,
    `Average acknowledgement: ${conduct?.averageAcknowledgementMinutes ?? "not available"} minutes`,
    `Average resolution: ${conduct?.averageResolutionMinutes ?? "not available"} minutes`,
    `Run sheet: ${runSheet?.summary.total ?? 0} stages, ${runSheet?.summary.plannedDurationMinutes ?? 0} planned minutes, ${runSheet?.summary.completed ?? 0} completed, ${runSheet?.summary.skipped ?? 0} skipped`,
    `Audience Q&A: ${questions?.summary.total ?? 0} questions, ${questions?.summary.answered ?? 0} answered, ${questions?.summary.dismissed ?? 0} dismissed, ${questions?.summary.votes ?? 0} votes${questions?.summary.answerRate == null ? "" : `, ${questions.summary.answerRate}% answer rate`}`,
    "",
    "Run-sheet delivery timeline:",
    ...(runSheet?.items.length ? runSheet.items.map((item, index) => `- ${index + 1}. ${item.title}: ${item.status}; ${item.plannedDurationMinutes} min planned${item.actualDurationMinutes == null ? "" : `; ${item.actualDurationMinutes} min actual`}`) : ["- No run sheet was prepared."]),
    "",
    "Audience Q&A:",
    ...(questions?.questions.length ? questions.questions.map((question) => `- [${question.status}] ${question.text} (${question.votes} votes)${question.organizerResponse ? ` — ${question.organizerResponse}` : ""}`) : ["- No audience questions were submitted."]),
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
  const { data: attendance, isLoading: attendanceLoading, error: attendanceError } = useQuery<AttendanceSummary>({
    queryKey: ["/api/demos", id, "attendance"],
    enabled: Boolean(id),
  });
  const { data: registration, isLoading: registrationLoading, error: registrationError } = useQuery<RegistrationSummary>({
    queryKey: ["/api/demos", id, "registration"],
    enabled: Boolean(id),
  });
  const { data: conductQueue } = useQuery<ConductReportQueue>({
    queryKey: ["/api/demos", id, "conduct-reports"],
    enabled: Boolean(id),
  });
  const { data: runSheet } = useQuery<RunSheetPayload>({
    queryKey: ["/api/demos", id, "run-sheet"],
    enabled: Boolean(id),
  });
  const { data: audienceQuestions, isLoading: audienceQuestionsLoading, error: audienceQuestionsError, refetch: refetchAudienceQuestions } = useQuery<AudienceQuestionPayload>({
    queryKey: ["/api/demos", id, "questions"],
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
    await navigator.clipboard.writeText(buildReportText(data, runtime, feedback, conductQueue?.summary, runSheet, attendance, registration, audienceQuestions));
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
                <p className="text-xs text-muted-foreground">Unique attendance</p>
                <p className="mt-1 text-lg font-semibold">{attendance?.uniqueParticipants ?? 0}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6 border-sky-500/30" data-testid="card-report-attendance-journey">
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
                <span className="flex items-center gap-2"><Users className="h-5 w-5 text-sky-700" aria-hidden="true" /> Anonymous attendance journey</span>
                <Badge variant="secondary">Retained after disconnect</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {attendanceLoading ? (
                <div className="grid gap-3 sm:grid-cols-3"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>
              ) : attendanceError ? (
                <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm" role="alert">Attendance history is temporarily unavailable; other report sections are still complete.</p>
              ) : (
                <>
                  <p className="mb-4 text-sm text-muted-foreground">See whether participants arrived, returned, and stayed. Counts are event-scoped and pseudonymous; the report contains no individual session list.</p>
                  <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-6">
                    {[
                      ["Unique", attendance?.uniqueParticipants ?? 0],
                      ["Visits", attendance?.totalVisits ?? 0],
                      ["Returned", attendance?.returningParticipants ?? 0],
                      ["Reconnects", attendance?.reconnectVisits ?? 0],
                      ["Peak together", attendance?.peakConcurrent ?? 0],
                      ["Observed", formatRuntime(attendance?.observedSeconds ?? 0)],
                    ].map(([label, value]) => <div key={label} className="rounded-lg border bg-background p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-lg font-semibold">{value}</p></div>)}
                  </div>
                  {(attendance?.timeline.length ?? 0) > 0 ? (
                    <ol className="mt-4 grid gap-2" aria-label="Attendance arrivals timeline">
                      {attendance?.timeline.map((point) => <li key={point.startedAt} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-background p-3 text-sm"><time dateTime={point.startedAt}>{new Date(point.startedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</time><span>{point.firstJoins} new · {point.returnVisits} return</span></li>)}
                    </ol>
                  ) : <p className="mt-4 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No anonymous attendance was shared for this event.</p>}
                  <p className="mt-4 text-xs text-muted-foreground">{attendance?.privacy}</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="mt-6 border-cyan-500/30" data-testid="card-report-registration">
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
                <span className="flex items-center gap-2"><CalendarCheck2 className="h-5 w-5 text-cyan-700" aria-hidden="true" /> RSVP-to-turnout planning</span>
                <Badge variant="secondary">Anonymous aggregate</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {registrationLoading ? (
                <div className="grid gap-3 sm:grid-cols-4"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>
              ) : registrationError ? (
                <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm" role="alert">Registration totals are temporarily unavailable; other report sections are still complete.</p>
              ) : (
                <>
                  <p className="mb-4 text-sm text-muted-foreground">Compare intended attendance with devices that actually opened the live event. The match uses the same event-only anonymous hash and never creates a participant roster.</p>
                  <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-5">
                    {[
                      ["Capacity", registration?.capacity ?? "—"],
                      ["Confirmed", registration?.confirmed ?? 0],
                      ["Waitlisted", registration?.waitlisted ?? 0],
                      ["Confirmed attended", registration?.confirmedAttended ?? 0],
                      ["Turnout", registration?.turnoutRate == null ? "—" : `${registration.turnoutRate}%`],
                    ].map(([label, value]) => <div key={label} className="rounded-lg border bg-background p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-lg font-semibold">{value}</p></div>)}
                  </div>
                  {(registration?.confirmed ?? 0) === 0 ? <p className="mt-4 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No anonymous RSVP was collected for this event.</p> : null}
                  <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan-700" aria-hidden="true" />{registration?.privacy}</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="mt-6 border-indigo-500/30" data-testid="card-report-run-sheet">
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
                <span className="flex items-center gap-2"><ListOrdered className="h-5 w-5 text-indigo-700" aria-hidden="true" /> Run-sheet delivery timeline</span>
                <span className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{runSheet?.summary.completed ?? 0} completed</Badge>
                  <Badge variant="outline">{runSheet?.summary.skipped ?? 0} skipped</Badge>
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">Compare the plan with what the live operator delivered. This timeline is stored through restarts and is included in the copied report.</p>
              {(runSheet?.items.length ?? 0) > 0 ? (
                <ol className="grid gap-3" aria-label="Delivered event run sheet">
                  {runSheet?.items.map((item, index) => (
                    <li key={item.id} className="rounded-lg border bg-background p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium">{index + 1}. {item.title}</p>
                        <Badge variant={item.status === "completed" ? "secondary" : item.status === "skipped" ? "outline" : "default"}>{item.status}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{item.plannedDurationMinutes} min planned{item.actualDurationMinutes == null ? "" : ` · ${item.actualDurationMinutes} min actual`} · {item.kind}</p>
                      {item.participantNote && <p className="mt-2 text-sm text-muted-foreground">Participant guidance: {item.participantNote}</p>}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No run sheet was prepared for this event.</p>
              )}
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border bg-background p-3"><p className="text-xs text-muted-foreground">Stages</p><p className="mt-1 text-lg font-semibold">{runSheet?.summary.total ?? 0}</p></div>
                <div className="rounded-lg border bg-background p-3"><p className="text-xs text-muted-foreground">Planned duration</p><p className="mt-1 text-lg font-semibold">{runSheet?.summary.plannedDurationMinutes ?? 0} min</p></div>
                <div className="rounded-lg border bg-background p-3"><p className="text-xs text-muted-foreground">Still pending</p><p className="mt-1 text-lg font-semibold">{runSheet?.summary.pending ?? 0}</p></div>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6 border-emerald-500/30" data-testid="card-report-audience-questions">
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
                <span className="flex items-center gap-2"><MessageCircleQuestion className="h-5 w-5 text-emerald-700" aria-hidden="true" /> Audience Q&amp;A outcomes</span>
                <Badge variant="secondary">Shared after restart</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {audienceQuestionsLoading ? (
                <div className="grid gap-3 sm:grid-cols-4" aria-label="Loading audience question outcomes"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>
              ) : audienceQuestionsError ? (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4" role="alert">
                  <p className="text-sm">Audience Q&amp;A outcomes are temporarily unavailable; the rest of this report is still complete.</p>
                  <Button className="mt-3 min-h-11" size="sm" variant="outline" onClick={() => void refetchAudienceQuestions()}>Retry Q&amp;A outcomes</Button>
                </div>
              ) : (
                <>
                  <p className="mb-4 text-sm text-muted-foreground">Review what participants asked, which topics mattered most, and the answers your team published. Anonymous session hashes and withdrawn question text are never shown here.</p>
                  <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      ["Questions", audienceQuestions?.summary.total ?? 0],
                      ["Answered", audienceQuestions?.summary.answered ?? 0],
                      ["Audience votes", audienceQuestions?.summary.votes ?? 0],
                      ["Answer rate", audienceQuestions?.summary.answerRate == null ? "—" : `${audienceQuestions.summary.answerRate}%`],
                    ].map(([label, value]) => <div key={label} className="rounded-lg border bg-background p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-lg font-semibold">{value}</p></div>)}
                  </div>
                  {(audienceQuestions?.questions.length ?? 0) > 0 ? (
                    <ol className="mt-4 grid gap-3" aria-label="Audience question outcomes">
                      {audienceQuestions?.questions.slice(0, 8).map((question) => (
                        <li key={question.id} className="rounded-lg border bg-background p-3 text-sm">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <Badge variant={question.status === "answered" ? "secondary" : question.status === "dismissed" ? "outline" : "default"}>{question.status}</Badge>
                            <span className="text-xs text-muted-foreground">{question.votes} {question.votes === 1 ? "vote" : "votes"}</span>
                          </div>
                          <p className="mt-2 font-medium">{question.text}</p>
                          {question.organizerResponse ? <p className="mt-2 rounded-md bg-emerald-500/10 p-3 text-muted-foreground"><span className="font-medium text-foreground">Published answer:</span> {question.organizerResponse}</p> : null}
                        </li>
                      ))}
                    </ol>
                  ) : <p className="mt-4 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No audience questions were submitted for this event.</p>}
                  <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />{audienceQuestions?.privacy}</p>
                </>
              )}
            </CardContent>
          </Card>

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
