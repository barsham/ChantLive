import type { Express, Response } from "express";
import { type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import {
  storage,
  type AssistanceType,
  type ConductReportCategory,
  type ConductReportStatus,
  type ConductReportUrgency,
  type RunSheetItemKind,
  type RunSheetTransition,
  type SafetyCheckKind,
  type SafetyCheckResponseType,
  type StoredAssistanceRequest as AssistanceRequest,
  type StoredConductReport as ConductReport,
  type StoredRunSheetItem as RunSheetItem,
  type StoredRunSheetTemplate as RunSheetTemplate,
  type StoredSafetyCheck as SafetyCheck,
} from "./storage";
import { ensureDemoColumnsAndTables, ensureUserAuthColumns } from "./db";
import { setupAuth, requireAuth, requireSuperAdmin } from "./auth";
import QRCode from "qrcode";
import type { Demonstration, RunSheetTemplateStage, User } from "@shared/schema";
import { demoTransferPackageSchema } from "@shared/demo-transfer";

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      name: string;
      role: string;
      avatarUrl: string | null;
      createdAt: Date;
      lastActivityAt: Date | null;
    }
  }
}

const demoViewers = new Map<string, Set<string>>();
const autoRotateTimers = new Map<string, NodeJS.Timeout>();
const autoRotateProgress = new Map<string, { phase: "leader" | "people"; cycle: number }>();
type ChantPhase = "leader" | "people";
type CrowdPulseType = "too_fast" | "too_slow" | "cant_hear" | "all_good";
type CrowdPulse = {
  sessionId: string;
  type: CrowdPulseType;
  createdAt: string;
};
type OrganizerAnnouncement = {
  id: string;
  message: string;
  targetRole: "all" | "participant" | "marshal" | "speaker" | "accessibility";
  createdAt: string;
};
type AudienceQuestionStatus = "open" | "answered" | "dismissed";
type AudienceQuestion = {
  id: string;
  demoId: string;
  text: string;
  sessionId: string;
  status: AudienceQuestionStatus;
  voterSessionIds: string[];
  createdAt: string;
  resolvedAt: string | null;
};
type LivePollStatus = "open" | "closed";
type LivePollOption = {
  id: string;
  label: string;
  voterSessionIds: string[];
};
type LivePoll = {
  id: string;
  demoId: string;
  question: string;
  options: LivePollOption[];
  status: LivePollStatus;
  createdAt: string;
  closedAt: string | null;
};
type ParticipantCheckInRole = "participant" | "marshal" | "speaker" | "accessibility";
type ParticipantCheckIn = {
  sessionId: string;
  role: ParticipantCheckInRole;
  displayName: string | null;
  checkedInAt: string;
  updatedAt: string;
};
type ParticipantFeedback = {
  sessionId: string;
  clarityRating: number;
  safetyRating: number;
  accessibilityRating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
};
type EngagementAction = "checkin" | "pulse" | "question" | "upvote" | "assistance" | "feedback" | "poll_vote" | "safety_check";
type ParticipantEngagement = {
  sessionId: string;
  points: number;
  actions: Record<EngagementAction, number>;
  updatedAt: string;
};

const crowdPulses = new Map<string, Map<string, CrowdPulse>>();
const organizerAnnouncements = new Map<string, OrganizerAnnouncement[]>();
const audienceQuestions = new Map<string, AudienceQuestion[]>();
const livePolls = new Map<string, LivePoll[]>();
const participantCheckIns = new Map<string, Map<string, ParticipantCheckIn>>();
const participantFeedback = new Map<string, Map<string, ParticipantFeedback>>();
const participantEngagement = new Map<string, Map<string, ParticipantEngagement>>();

function getSingleParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function getViewerCount(demoId: string): number {
  return demoViewers.get(demoId)?.size ?? 0;
}

function serializeAssistanceRequest(request: AssistanceRequest) {
  return {
    id: request.id,
    type: request.type,
    message: request.message,
    status: request.status,
    createdAt: request.createdAt.toISOString(),
    resolvedAt: request.resolvedAt?.toISOString() ?? null,
    participantLabel: `Participant ${request.sessionId.slice(-4).toUpperCase()}`,
  };
}

function serializeConductReport(report: ConductReport, participantView = false) {
  return {
    id: report.id,
    reference: report.id.slice(0, 8).toUpperCase(),
    category: report.category,
    urgency: report.urgency,
    details: report.details,
    status: report.status,
    organizerResponse: report.organizerResponse,
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
    acknowledgedAt: report.acknowledgedAt?.toISOString() ?? null,
    resolvedAt: report.resolvedAt?.toISOString() ?? null,
    ...(participantView ? {} : { participantLabel: `Participant ${report.sessionId.slice(-4).toUpperCase()}` }),
  };
}

function summarizeConductReports(reports: ConductReport[]) {
  const categories: Record<ConductReportCategory, number> = {
    harassment: 0,
    unsafe_behavior: 0,
    privacy: 0,
    misinformation: 0,
    other: 0,
  };
  for (const report of reports) categories[report.category] += 1;
  const acknowledgedMinutes = reports
    .filter((report) => report.acknowledgedAt)
    .map((report) => Math.max(0, Math.round((report.acknowledgedAt!.getTime() - report.createdAt.getTime()) / 60_000)));
  const resolvedMinutes = reports
    .filter((report) => report.resolvedAt)
    .map((report) => Math.max(0, Math.round((report.resolvedAt!.getTime() - report.createdAt.getTime()) / 60_000)));
  const average = (values: number[]) => values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
  return {
    total: reports.length,
    open: reports.filter((report) => report.status === "open").length,
    acknowledged: reports.filter((report) => report.status === "acknowledged").length,
    resolved: reports.filter((report) => report.status === "resolved").length,
    urgent: reports.filter((report) => report.urgency === "urgent").length,
    activeUrgent: reports.filter((report) => report.urgency === "urgent" && report.status !== "resolved").length,
    categories,
    averageAcknowledgementMinutes: average(acknowledgedMinutes),
    averageResolutionMinutes: average(resolvedMinutes),
  };
}

const runSheetKinds: RunSheetItemKind[] = ["arrival", "welcome", "chant", "speaker", "movement", "break", "closing", "custom"];

type BuiltInRunSheetTemplate = {
  id: string;
  name: string;
  description: string;
  category: string;
  stages: RunSheetTemplateStage[];
};

const builtInRunSheetTemplates: BuiltInRunSheetTemplate[] = [
  {
    id: "builtin:march",
    name: "March and rally",
    description: "Arrival, briefing, movement, two chant blocks, speaker, and safe departure.",
    category: "march",
    stages: [
      { kind: "arrival", title: "Arrival and marshal check-in", participantNote: "Find your group, check the route information, and ask for access support now.", plannedDurationMinutes: 15 },
      { kind: "welcome", title: "Welcome, route, and safety briefing", participantNote: "Listen for route, safety, accessibility, and meeting-point guidance.", plannedDurationMinutes: 10 },
      { kind: "movement", title: "Move onto the route", participantNote: "Follow marshals and the latest organiser instructions.", plannedDurationMinutes: 15 },
      { kind: "chant", title: "Opening chant block", participantNote: "Follow the call-and-response shown on this screen.", plannedDurationMinutes: 15 },
      { kind: "speaker", title: "Community speaker and response", participantNote: "Pause movement and give the speaker your attention.", plannedDurationMinutes: 12 },
      { kind: "chant", title: "Closing chant block", participantNote: "Join the final chant and stay with your group.", plannedDurationMinutes: 12 },
      { kind: "closing", title: "Next steps and safe departure", participantNote: "Listen for departure routes, transport, and follow-up actions.", plannedDurationMinutes: 10 },
    ],
  },
  {
    id: "builtin:vigil",
    name: "Vigil and remembrance",
    description: "A calm sequence for arrival, welcome, reflection, speakers, silence, and closing.",
    category: "vigil",
    stages: [
      { kind: "arrival", title: "Quiet arrival and access check", participantNote: "Settle in, keep pathways clear, and ask an organiser for access support.", plannedDurationMinutes: 15 },
      { kind: "welcome", title: "Welcome and purpose", participantNote: "Listen for the purpose, care guidance, and the shape of the vigil.", plannedDurationMinutes: 8 },
      { kind: "speaker", title: "Readings and community voices", participantNote: "Please give each reader your attention.", plannedDurationMinutes: 20 },
      { kind: "custom", title: "Shared silence and reflection", participantNote: "Join the silence in the way that is comfortable for you.", plannedDurationMinutes: 10 },
      { kind: "closing", title: "Closing care and departure", participantNote: "Leave gently and use the support contacts if you need them.", plannedDurationMinutes: 8 },
    ],
  },
  {
    id: "builtin:prayer",
    name: "Prayer circle",
    description: "Welcome, opening prayer, responsive reading, reflection, and community close.",
    category: "prayer",
    stages: [
      { kind: "arrival", title: "Gather and settle", participantNote: "Join the circle or choose a comfortable nearby place.", plannedDurationMinutes: 10 },
      { kind: "welcome", title: "Welcome and opening guidance", participantNote: "Listen for participation, access, and community-care guidance.", plannedDurationMinutes: 8 },
      { kind: "custom", title: "Opening prayer", participantNote: "Participate, listen, or reflect in the way that is right for you.", plannedDurationMinutes: 10 },
      { kind: "chant", title: "Responsive prayer or chant", participantNote: "Follow the leader and the response shown on this screen.", plannedDurationMinutes: 15 },
      { kind: "speaker", title: "Reflection and community intentions", participantNote: "Listen or offer a response when invited by the facilitator.", plannedDurationMinutes: 12 },
      { kind: "closing", title: "Blessing and community close", participantNote: "Stay for final support information and next steps.", plannedDurationMinutes: 8 },
    ],
  },
  {
    id: "builtin:community",
    name: "Community gathering",
    description: "A flexible meeting with welcome, updates, discussion, a break, decisions, and closing.",
    category: "community",
    stages: [
      { kind: "arrival", title: "Arrival and informal check-in", participantNote: "Find a seat, meet the organisers, and ask for any access support.", plannedDurationMinutes: 15 },
      { kind: "welcome", title: "Welcome, access, and agenda", participantNote: "Listen for the agenda, participation options, and community agreements.", plannedDurationMinutes: 10 },
      { kind: "speaker", title: "Community updates", participantNote: "Listen for current information and note questions for discussion.", plannedDurationMinutes: 20 },
      { kind: "custom", title: "Small-group discussion", participantNote: "Join a group or use the quiet participation option announced by organisers.", plannedDurationMinutes: 20 },
      { kind: "break", title: "Water and access break", participantNote: "Take a break and ask an organiser if you need support.", plannedDurationMinutes: 10 },
      { kind: "custom", title: "Decisions and next actions", participantNote: "Listen for decisions, volunteers, and agreed follow-up actions.", plannedDurationMinutes: 15 },
      { kind: "closing", title: "Closing and departure", participantNote: "Stay for final contacts, feedback, and safe departure information.", plannedDurationMinutes: 8 },
    ],
  },
];

function serializeRunSheetTemplate(template: RunSheetTemplate | BuiltInRunSheetTemplate, source: "personal" | "built-in") {
  return {
    id: template.id,
    source,
    name: template.name,
    description: template.description,
    category: template.category,
    stages: template.stages,
    stageCount: template.stages.length,
    plannedDurationMinutes: template.stages.reduce((total, stage) => total + stage.plannedDurationMinutes, 0),
    createdAt: "createdAt" in template ? template.createdAt.toISOString() : null,
    updatedAt: "updatedAt" in template ? template.updatedAt.toISOString() : null,
  };
}

function serializeRunSheetItem(item: RunSheetItem) {
  const actualDurationMinutes = item.startedAt && item.completedAt
    ? Math.max(0, Math.round((item.completedAt.getTime() - item.startedAt.getTime()) / 60_000))
    : null;
  return {
    id: item.id,
    orderIndex: item.orderIndex,
    kind: item.kind,
    title: item.title,
    participantNote: item.participantNote,
    plannedDurationMinutes: item.plannedDurationMinutes,
    actualDurationMinutes,
    status: item.status,
    startedAt: item.startedAt?.toISOString() ?? null,
    completedAt: item.completedAt?.toISOString() ?? null,
    updatedAt: item.updatedAt.toISOString(),
  };
}

function toPublicRunSheetItem(item: ReturnType<typeof serializeRunSheetItem>) {
  return {
    id: item.id,
    orderIndex: item.orderIndex,
    kind: item.kind,
    title: item.title,
    participantNote: item.participantNote,
    plannedDurationMinutes: item.plannedDurationMinutes,
    status: item.status,
  };
}

function summarizeRunSheet(items: RunSheetItem[]) {
  const active = items.find((item) => item.status === "active") ?? null;
  const next = items.find((item) => item.status === "pending" && (!active || item.orderIndex > active.orderIndex))
    ?? items.find((item) => item.status === "pending")
    ?? null;
  return {
    total: items.length,
    plannedDurationMinutes: items.reduce((total, item) => total + item.plannedDurationMinutes, 0),
    completed: items.filter((item) => item.status === "completed").length,
    skipped: items.filter((item) => item.status === "skipped").length,
    pending: items.filter((item) => item.status === "pending").length,
    active: active ? serializeRunSheetItem(active) : null,
    next: next ? serializeRunSheetItem(next) : null,
    storage: "shared" as const,
    updatedAt: items.reduce<Date | null>((latest, item) => !latest || item.updatedAt > latest ? item.updatedAt : latest, null)?.toISOString() ?? null,
  };
}

async function getRunSheetPayload(demoId: string) {
  const items = await storage.getRunSheetItems(demoId);
  return { items: items.map(serializeRunSheetItem), summary: summarizeRunSheet(items) };
}

async function emitRunSheetUpdate(io: SocketIOServer, demo: Demonstration) {
  const payload = await getRunSheetPayload(demo.id);
  io.to(`demo:${demo.publicId}`).emit("run_sheet_update", { ...payload.summary, items: payload.items.map(toPublicRunSheetItem) });
  return payload;
}

function parseRunSheetItemInput(body: unknown) {
  const input = body as Record<string, unknown> | null | undefined;
  const title = typeof input?.title === "string" ? input.title.trim().slice(0, 100) : "";
  const participantNote = typeof input?.participantNote === "string" && input.participantNote.trim()
    ? input.participantNote.trim().slice(0, 240)
    : null;
  const kind = runSheetKinds.includes(input?.kind as RunSheetItemKind) ? input?.kind as RunSheetItemKind : "custom";
  const rawDuration = typeof input?.plannedDurationMinutes === "number" ? input.plannedDurationMinutes : Number(input?.plannedDurationMinutes);
  const plannedDurationMinutes = Number.isInteger(rawDuration) ? rawDuration : 0;
  if (title.length < 3) return { error: "Stage title must be at least 3 characters" } as const;
  if (plannedDurationMinutes < 1 || plannedDurationMinutes > 180) return { error: "Planned duration must be between 1 and 180 minutes" } as const;
  return { data: { kind, title, participantNote, plannedDurationMinutes } } as const;
}

function parseRunSheetTemplateInput(body: unknown) {
  const input = body as Record<string, unknown> | null | undefined;
  const name = typeof input?.name === "string" ? input.name.trim().slice(0, 80) : "";
  const description = typeof input?.description === "string" && input.description.trim()
    ? input.description.trim().slice(0, 240)
    : null;
  if (name.length < 3) return { error: "Template name must be at least 3 characters" } as const;
  return { data: { name, description } } as const;
}

function getCrowdPulseSummary(demoId: string) {
  const pulses = Array.from(crowdPulses.get(demoId)?.values() ?? []);
  const counts: Record<CrowdPulseType, number> = {
    too_fast: 0,
    too_slow: 0,
    cant_hear: 0,
    all_good: 0,
  };

  for (const pulse of pulses) {
    counts[pulse.type] += 1;
  }

  return {
    counts,
    total: pulses.length,
    updatedAt: pulses[0]?.createdAt ?? null,
  };
}

function serializeAudienceQuestion(question: AudienceQuestion) {
  return {
    id: question.id,
    text: question.text,
    status: question.status,
    votes: question.voterSessionIds.length,
    createdAt: question.createdAt,
    resolvedAt: question.resolvedAt,
    participantLabel: `Participant ${question.sessionId.slice(-4).toUpperCase()}`,
  };
}

function getAudienceQuestions(demoId: string) {
  return audienceQuestions.get(demoId) ?? [];
}

function getLivePolls(demoId: string) {
  return livePolls.get(demoId) ?? [];
}

function getActiveLivePoll(demoId: string) {
  return getLivePolls(demoId).find((poll) => poll.status === "open") ?? null;
}

function serializeLivePoll(poll: LivePoll) {
  const totalVotes = poll.options.reduce((sum, option) => sum + option.voterSessionIds.length, 0);

  return {
    id: poll.id,
    question: poll.question,
    status: poll.status,
    options: poll.options.map((option) => ({
      id: option.id,
      label: option.label,
      votes: option.voterSessionIds.length,
    })),
    totalVotes,
    createdAt: poll.createdAt,
    closedAt: poll.closedAt,
  };
}

function getCurrentSafetyCheck(checks: SafetyCheck[]) {
  const latest = checks[0] ?? null;
  if (!latest || latest.status === "open") return latest;
  if (!latest.closedAt) return null;
  return Date.now() - latest.closedAt.getTime() <= 30 * 60 * 1000 ? latest : null;
}

function serializeSafetyCheck(check: SafetyCheck, participantSessionId?: string) {
  const counts: Record<SafetyCheckResponseType, number> = {
    ok: 0,
    need_help: 0,
    leaving: 0,
    not_sure: 0,
  };

  for (const response of check.responses) {
    counts[response.response] += 1;
  }

  return {
    id: check.id,
    kind: check.kind,
    message: check.message,
    instruction: check.instruction,
    status: check.status,
    counts,
    totalResponses: check.responses.length,
    needsAttention: check.responses
      .filter((response) => response.response === "need_help" || response.response === "not_sure")
      .slice(0, 8)
      .map((response) => ({
        response: response.response,
        note: response.note,
        updatedAt: response.updatedAt.toISOString(),
        participantLabel: `Participant ${response.sessionId.slice(-4).toUpperCase()}`,
      })),
    participantResponse: participantSessionId
      ? check.responses.find((response) => response.sessionId === participantSessionId)?.response ?? null
      : null,
    storage: "shared" as const,
    createdAt: check.createdAt.toISOString(),
    resolutionMessage: check.resolutionMessage,
    closedAt: check.closedAt?.toISOString() ?? null,
  };
}

function getCheckInSummary(demoId: string) {
  const checkIns = Array.from(participantCheckIns.get(demoId)?.values() ?? [])
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const roles: Record<ParticipantCheckInRole, number> = {
    participant: 0,
    marshal: 0,
    speaker: 0,
    accessibility: 0,
  };

  for (const checkIn of checkIns) {
    roles[checkIn.role] += 1;
  }

  return {
    total: checkIns.length,
    roles,
    checkIns: checkIns.slice(0, 20).map((checkIn) => ({
      role: checkIn.role,
      displayName: checkIn.displayName,
      checkedInAt: checkIn.checkedInAt,
      updatedAt: checkIn.updatedAt,
      participantLabel: checkIn.displayName || `Participant ${checkIn.sessionId.slice(-4).toUpperCase()}`,
    })),
  };
}

function getFeedbackSummary(demoId: string) {
  const feedback = Array.from(participantFeedback.get(demoId)?.values() ?? [])
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const average = (values: number[]) => values.length
    ? Math.round((values.reduce((total, value) => total + value, 0) / values.length) * 10) / 10
    : 0;

  return {
    total: feedback.length,
    averages: {
      clarity: average(feedback.map((item) => item.clarityRating)),
      safety: average(feedback.map((item) => item.safetyRating)),
      accessibility: average(feedback.map((item) => item.accessibilityRating)),
    },
    comments: feedback
      .filter((item) => item.comment)
      .slice(0, 10)
      .map((item) => ({
        comment: item.comment,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        participantLabel: `Participant ${item.sessionId.slice(-4).toUpperCase()}`,
      })),
  };
}

function getEmptyEngagementActions(): Record<EngagementAction, number> {
  return {
    checkin: 0,
    pulse: 0,
    question: 0,
    upvote: 0,
    assistance: 0,
    feedback: 0,
    poll_vote: 0,
    safety_check: 0,
  };
}

function awardEngagement(demoId: string, publicId: string, sessionId: string, action: EngagementAction, io: SocketIOServer) {
  const pointsByAction: Record<EngagementAction, number> = {
    checkin: 10,
    pulse: 2,
    question: 5,
    upvote: 1,
    assistance: 4,
    feedback: 8,
    poll_vote: 3,
    safety_check: 4,
  };
  const demoEngagement = participantEngagement.get(demoId) ?? new Map<string, ParticipantEngagement>();
  const current = demoEngagement.get(sessionId) ?? {
    sessionId,
    points: 0,
    actions: getEmptyEngagementActions(),
    updatedAt: new Date().toISOString(),
  };

  current.actions[action] += 1;
  current.points += pointsByAction[action];
  current.updatedAt = new Date().toISOString();
  demoEngagement.set(sessionId, current);
  participantEngagement.set(demoId, demoEngagement);
  io.to(`demo:${publicId}`).emit("engagement_update", getEngagementSummary(demoId));
  return current;
}

function getBadges(engagement: ParticipantEngagement) {
  const badges: string[] = [];
  if (engagement.actions.checkin > 0) badges.push("Checked in");
  if (engagement.actions.pulse >= 3) badges.push("Pulse contributor");
  if (engagement.actions.question > 0) badges.push("Asked a question");
  if (engagement.actions.feedback > 0) badges.push("Gave feedback");
  if (engagement.actions.assistance > 0) badges.push("Asked for help");
  if (engagement.actions.poll_vote > 0) badges.push("Poll voter");
  if (engagement.actions.safety_check > 0) badges.push("Safety check responder");
  if (engagement.points >= 25) badges.push("Active participant");
  return badges;
}

function serializeParticipantEngagement(engagement: ParticipantEngagement) {
  return {
    points: engagement.points,
    actions: engagement.actions,
    badges: getBadges(engagement),
    participantLabel: `Participant ${engagement.sessionId.slice(-4).toUpperCase()}`,
    updatedAt: engagement.updatedAt,
  };
}

function getEngagementSummary(demoId: string) {
  const participants = Array.from(participantEngagement.get(demoId)?.values() ?? [])
    .sort((a, b) => b.points - a.points || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .map(serializeParticipantEngagement);

  return {
    totalParticipants: participants.length,
    totalPoints: participants.reduce((total, item) => total + item.points, 0),
    topParticipants: participants.slice(0, 10),
  };
}

async function canAccessDemo(user: User, demoIdOrPublicId: string | string[] | undefined): Promise<boolean> {
  if (user.role === "super_admin") return true;
  const demo = await getDemoByIdentifier(demoIdOrPublicId);
  if (!demo) return false;
  if (demo.createdBy === user.id) return true;
  return storage.isDemoAdmin(demo.id, user.id);
}

async function getDemoByIdentifier(idOrPublicId: string | string[] | undefined) {
  const normalizedId = getSingleParam(idOrPublicId);
  if (!normalizedId) return undefined;

  const byId = await storage.getDemonstration(normalizedId);
  if (byId) return byId;
  return storage.getDemonstrationByPublicId(normalizedId);
}

function buildExportFilename(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "demonstration";

  return `${slug}.chantlive.json`;
}

async function requireLiveController(user: User, demo: Demonstration, res: Response): Promise<boolean> {
  if (demo.status !== "live") return true;
  const state = await storage.getDemoState(demo.id);
  if (state?.liveControllerUserId === user.id) return true;

  const controller = state?.liveControllerUserId
    ? await storage.getUser(state.liveControllerUserId)
    : undefined;
  res.status(409).json({
    code: "LIVE_CONTROL_REQUIRED",
    message: controller
      ? `${controller.name} currently has live control. Ask them to hand it over, or use owner takeover from the Command Center.`
      : "No organiser currently has live control. Claim it from the Command Center before changing participant-facing state.",
    liveControllerUserId: state?.liveControllerUserId ?? null,
  });
  return false;
}

function getPhaseDurationMs(
  chant: { leaderDuration?: number | null; peopleDuration?: number | null } | null | undefined,
  phase: ChantPhase,
): number {
  const durationSeconds = phase === "leader"
    ? (chant?.leaderDuration ?? 4)
    : (chant?.peopleDuration ?? 3);

  return Math.max(1, durationSeconds) * 1000;
}

function getPhaseStartedAt(state: { updatedAt?: Date | string | null } | null | undefined): string {
  const updatedAt = state?.updatedAt ? new Date(state.updatedAt) : new Date();
  return Number.isNaN(updatedAt.getTime()) ? new Date().toISOString() : updatedAt.toISOString();
}



async function emitCurrentChant(io: SocketIOServer, demo: any) {
  const chantsList = await storage.getChants(demo.id);
  const state = await storage.getDemoState(demo.id);
  const currentChant = state?.currentChantId ? chantsList.find((c) => c.id === state.currentChantId) : null;
  const chantIndex = currentChant ? chantsList.findIndex((c) => c.id === currentChant.id) : null;
  const nextChantIndex = chantIndex !== null && chantsList.length > 0 ? (chantIndex + 1) % chantsList.length : null;
  const nextChant = nextChantIndex !== null ? chantsList[nextChantIndex] : null;
  const currentPhase = state?.currentPhase === "people" ? "people" : "leader";

  io.to(`demo:${demo.publicId}`).emit("chant_update", {
    callText: currentChant?.callText || null,
    responseText: currentChant?.responseText || null,
    nextCallText: nextChant?.callText || null,
    nextResponseText: nextChant?.responseText || null,
    chantIndex,
    totalChants: chantsList.length,
    demoTitle: demo.title,
    demoStatus: demo.status,
    currentPhase,
    currentCycle: state?.currentCycle ?? 1,
    cycleCount: currentChant?.cycles ?? state?.cycleCount ?? 1,
    phaseStartedAt: getPhaseStartedAt(state),
    phaseDurationMs: getPhaseDurationMs(currentChant, currentPhase),
    serverNow: new Date().toISOString(),
    supportUrl: demo.supportUrl ?? null,
    supportLabel: demo.supportLabel ?? null,
    scheduledAt: demo.scheduledAt ? new Date(demo.scheduledAt).toISOString() : null,
    locationName: demo.locationName ?? null,
    meetingPoint: demo.meetingPoint ?? null,
    arrivalNote: demo.arrivalNote ?? null,
  });
}
export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await ensureUserAuthColumns();
  await ensureDemoColumnsAndTables();
  setupAuth(app);

  const io = new SocketIOServer(httpServer, {
    cors: { origin: "*" },
    path: "/socket.io",
  });

  app.get("/api/demos", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const demos = await storage.getDemonstrations(user.id, user.role);
      const creatorIds = Array.from(new Set(demos.map((demo) => demo.createdBy)));
      const creators = await storage.getUsersByIds(creatorIds);
      const creatorsById = new Map(creators.map((creator) => [creator.id, creator]));

      res.json(demos.map((demo) => ({
        ...demo,
        creator: creatorsById.get(demo.createdBy) ?? null,
      })));
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch demonstrations" });
    }
  });

  app.post("/api/demos", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { title, scheduledAt, locationName, meetingPoint, arrivalNote, eventDurationMinutes } = req.body;
      if (!title || typeof title !== "string" || title.trim().length === 0) {
        return res.status(400).json({ message: "Title is required" });
      }
      if (locationName != null && (typeof locationName !== "string" || locationName.length > 160)) {
        return res.status(400).json({ message: "Location must be 160 characters or fewer" });
      }
      if (meetingPoint != null && (typeof meetingPoint !== "string" || meetingPoint.length > 240)) {
        return res.status(400).json({ message: "Meeting point must be 240 characters or fewer" });
      }
      if (arrivalNote != null && (typeof arrivalNote !== "string" || arrivalNote.length > 500)) {
        return res.status(400).json({ message: "Arrival guidance must be 500 characters or fewer" });
      }
      const parsedScheduledAt = scheduledAt ? new Date(scheduledAt) : null;
      if (parsedScheduledAt && Number.isNaN(parsedScheduledAt.getTime())) {
        return res.status(400).json({ message: "Choose a valid event date and time" });
      }
      const normalizedDuration = typeof eventDurationMinutes === "number"
        ? Math.round(eventDurationMinutes)
        : 120;
      if (normalizedDuration < 15 || normalizedDuration > 300) {
        return res.status(400).json({ message: "Event duration must be between 15 and 300 minutes" });
      }
      const demo = await storage.createDemonstration({
        title: title.trim(),
        status: "draft",
        createdBy: user.id,
        scheduledAt: parsedScheduledAt,
        locationName: typeof locationName === "string" && locationName.trim() ? locationName.trim() : null,
        meetingPoint: typeof meetingPoint === "string" && meetingPoint.trim() ? meetingPoint.trim() : null,
        arrivalNote: typeof arrivalNote === "string" && arrivalNote.trim() ? arrivalNote.trim() : null,
      });
      await storage.addDemoAdmin(demo.id, user.id);
      await storage.updateEventDuration(demo.id, normalizedDuration);
      res.json(demo);
    } catch (err) {
      res.status(500).json({ message: "Failed to create demonstration" });
    }
  });

  app.post("/api/demos/import", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const parsed = demoTransferPackageSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid demonstration import file." });
      }

      const transferPackage = parsed.data;
      const importedDemo = await storage.createDemonstration({
        title: transferPackage.demonstration.title.trim(),
        status: "draft",
        createdBy: user.id,
      });

      if (transferPackage.demonstration.supportUrl || transferPackage.demonstration.supportLabel) {
        await storage.updateDemoSupport(importedDemo.id, {
          supportUrl: transferPackage.demonstration.supportUrl ?? null,
          supportLabel: transferPackage.demonstration.supportLabel ?? null,
        });
      }

      if (
        transferPackage.demonstration.scheduledAt ||
        transferPackage.demonstration.locationName ||
        transferPackage.demonstration.meetingPoint ||
        transferPackage.demonstration.arrivalNote
      ) {
        await storage.updateDemoLogistics(importedDemo.id, {
          scheduledAt: transferPackage.demonstration.scheduledAt ? new Date(transferPackage.demonstration.scheduledAt) : null,
          locationName: transferPackage.demonstration.locationName ?? null,
          meetingPoint: transferPackage.demonstration.meetingPoint ?? null,
          arrivalNote: transferPackage.demonstration.arrivalNote ?? null,
        });
      }

      await storage.addDemoAdmin(importedDemo.id, user.id);

      const chantIdByOrderIndex = new Map<number, string>();
      const chantsToImport = [...transferPackage.chants].sort((a, b) => a.orderIndex - b.orderIndex);

      for (const chant of chantsToImport) {
        const createdChant = await storage.addChant({
          demonstrationId: importedDemo.id,
          orderIndex: chant.orderIndex,
          callText: chant.callText,
          responseText: chant.responseText,
          cycles: chant.cycles,
          leaderDuration: chant.leaderDuration,
          peopleDuration: chant.peopleDuration,
        });

        chantIdByOrderIndex.set(chant.orderIndex, createdChant.id);
      }

      if (transferPackage.state) {
        await storage.updateAutoRotation(
          importedDemo.id,
          transferPackage.state.autoRotate,
          transferPackage.state.rotationInterval,
          transferPackage.state.cycleCount,
          transferPackage.state.leaderDuration,
          transferPackage.state.peopleDuration,
          transferPackage.state.cycleDelay,
        );
        await storage.updateEventDuration(importedDemo.id, transferPackage.state.eventDurationMinutes);

        if (transferPackage.state.currentChantOrderIndex !== null) {
          const currentChantId = chantIdByOrderIndex.get(transferPackage.state.currentChantOrderIndex);
          if (currentChantId) {
            await storage.setCurrentChant(importedDemo.id, currentChantId);
            await storage.setRotationPhase(
              importedDemo.id,
              transferPackage.state.currentPhase,
              transferPackage.state.currentCycle,
            );
          }
        }
      }

      const importedAdminEmails: string[] = [];
      const skippedAdminEmails: string[] = [];

      for (const admin of transferPackage.admins) {
        const normalizedEmail = admin.email.trim().toLowerCase();
        if (!normalizedEmail || normalizedEmail === user.email.toLowerCase()) {
          continue;
        }

        const existingUser = await storage.getUserByEmail(normalizedEmail);
        if (!existingUser) {
          skippedAdminEmails.push(normalizedEmail);
          continue;
        }

        await storage.addDemoAdmin(importedDemo.id, existingUser.id);
        importedAdminEmails.push(normalizedEmail);
      }

      res.json({
        demo: importedDemo,
        importedAdminEmails,
        skippedAdminEmails,
        importedChants: chantsToImport.length,
      });
    } catch (err) {
      console.error("Demonstration import error:", err);
      res.status(500).json({ message: "Failed to import demonstration" });
    }
  });

  app.get("/api/demos/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const demo = await getDemoByIdentifier(req.params.id);
      if (!demo) return res.status(404).json({ message: "Not found" });

      if (!(await canAccessDemo(user, demo.id))) {
        return res.status(403).json({ message: "Access denied" });
      }

      const chantsList = await storage.getChants(demo.id);
      const state = await storage.getDemoState(demo.id);
      const viewerCount = getViewerCount(demo.id);

      const adminLinks = await storage.getDemoAdmins(demo.id);
      const admins = await Promise.all(
        adminLinks.map(async (a) => {
          const u = await storage.getUser(a.userId);
          return u ? {
            id: u.id,
            email: u.email,
            name: u.name,
            avatarUrl: u.avatarUrl,
            eventRole: u.id === demo.createdBy ? "owner" : "admin",
          } : null;
        })
      );

      const liveController = state?.liveControllerUserId
        ? await storage.getUser(state.liveControllerUserId)
        : undefined;
      res.json({
        demo,
        chants: chantsList,
        state,
        viewerCount,
        admins: admins.filter(Boolean),
        liveControl: {
          controller: liveController ? {
            id: liveController.id,
            name: liveController.name,
            avatarUrl: liveController.avatarUrl,
          } : null,
          claimedAt: state?.liveControlClaimedAt ?? null,
        },
      });
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch demonstration" });
    }
  });

  app.post("/api/demos/:id/live-control", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const demo = await getDemoByIdentifier(req.params.id);
      if (!demo) return res.status(404).json({ message: "Demonstration not found" });
      if (!(await canAccessDemo(user, demo.id))) return res.status(403).json({ message: "Access denied" });
      if (demo.status !== "live") {
        return res.status(400).json({ message: "Live control is available only while the event is live" });
      }

      const action = req.body?.action;
      const state = await storage.getDemoState(demo.id);
      const isOwner = demo.createdBy === user.id || user.role === "super_admin";
      let updatedState;

      if (action === "claim") {
        updatedState = await storage.claimLiveControl(demo.id, user.id, isOwner);
      } else if (action === "release") {
        updatedState = await storage.releaseLiveControl(demo.id, user.id, isOwner);
      } else if (action === "transfer") {
        const targetUserId = typeof req.body?.targetUserId === "string" ? req.body.targetUserId : "";
        if (!targetUserId || !(await storage.isDemoAdmin(demo.id, targetUserId))) {
          return res.status(400).json({ message: "Choose a verified admin for this event" });
        }
        updatedState = await storage.transferLiveControl(demo.id, user.id, targetUserId, isOwner);
      } else {
        return res.status(400).json({ message: "Choose claim, transfer, or release" });
      }

      if (!updatedState) {
        const currentController = state?.liveControllerUserId
          ? await storage.getUser(state.liveControllerUserId)
          : undefined;
        return res.status(409).json({
          code: "LIVE_CONTROL_CONFLICT",
          message: currentController
            ? `${currentController.name} still has live control. Refresh the handoff desk and ask them to transfer it.`
            : "Live control changed on another device. Refresh the handoff desk and try again.",
        });
      }

      const controller = updatedState.liveControllerUserId
        ? await storage.getUser(updatedState.liveControllerUserId)
        : undefined;
      res.json({
        controller: controller ? { id: controller.id, name: controller.name, avatarUrl: controller.avatarUrl } : null,
        claimedAt: updatedState.liveControlClaimedAt,
      });
    } catch (err) {
      res.status(500).json({ message: "Failed to update live control" });
    }
  });

  app.post("/api/demos/:id/repeat", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const source = await getDemoByIdentifier(req.params.id);
      if (!source) return res.status(404).json({ message: "Demonstration not found" });
      if (!(await canAccessDemo(user, source.id))) {
        return res.status(403).json({ message: "Access denied" });
      }

      const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
      if (!title) return res.status(400).json({ message: "A title is required for the repeated event" });
      if (title.length > 120) return res.status(400).json({ message: "The title must be 120 characters or fewer" });

      let scheduledAt: Date | null = null;
      if (req.body?.scheduledAt) {
        scheduledAt = new Date(req.body.scheduledAt);
        if (Number.isNaN(scheduledAt.getTime())) {
          return res.status(400).json({ message: "Choose a valid date and time" });
        }
        if (scheduledAt.getTime() < Date.now() - 60_000) {
          return res.status(400).json({ message: "The repeated event cannot be scheduled in the past" });
        }
      }

      const repeated = await storage.repeatDemonstration(source.id, user.id, {
        title,
        scheduledAt,
        copyChants: req.body?.copyChants !== false,
        copyLogistics: req.body?.copyLogistics !== false,
        copySupport: req.body?.copySupport === true,
      });

      res.status(201).json({
        ...repeated,
        source: { id: source.id, title: source.title, publicId: source.publicId },
      });
    } catch (err) {
      if (err instanceof Error && err.message === "SOURCE_DEMONSTRATION_NOT_FOUND") {
        return res.status(404).json({ message: "Demonstration not found" });
      }
      console.error("Repeat demonstration error:", err);
      res.status(500).json({ message: "Failed to repeat demonstration" });
    }
  });

  app.get("/api/demos/:id/assistance", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const demo = await getDemoByIdentifier(req.params.id);
      if (!demo) return res.status(404).json({ message: "Demonstration not found" });
      if (!(await canAccessDemo(user, demo.id))) return res.status(403).json({ message: "Access denied" });

      const requests = await storage.getAssistanceRequests(demo.id);
      res.json(requests.map(serializeAssistanceRequest));
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch assistance requests" });
    }
  });

  app.patch("/api/demos/:id/assistance/:requestId", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const demo = await getDemoByIdentifier(req.params.id);
      if (!demo) return res.status(404).json({ message: "Demonstration not found" });
      if (!(await canAccessDemo(user, demo.id))) return res.status(403).json({ message: "Access denied" });
      if (!(await requireLiveController(user, demo, res))) return;

      const requestId = getSingleParam(req.params.requestId);
      const request = requestId ? await storage.resolveAssistanceRequest(demo.id, requestId) : undefined;
      if (!request) return res.status(404).json({ message: "Assistance request not found" });

      const requests = await storage.getAssistanceRequests(demo.id);
      io.to(`demo:${demo.publicId}`).emit("assistance_update", requests.map(serializeAssistanceRequest));
      res.json(serializeAssistanceRequest(request));
    } catch (err) {
      res.status(500).json({ message: "Failed to update assistance request" });
    }
  });

  app.get("/api/demos/:id/conduct-reports", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const demo = await getDemoByIdentifier(req.params.id);
      if (!demo) return res.status(404).json({ message: "Demonstration not found" });
      if (!(await canAccessDemo(user, demo.id))) return res.status(403).json({ message: "Access denied" });
      const reports = await storage.getConductReports(demo.id);
      res.json({ reports: reports.map((report) => serializeConductReport(report)), summary: summarizeConductReports(reports) });
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch private conduct reports" });
    }
  });

  app.patch("/api/demos/:id/conduct-reports/:reportId", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const demo = await getDemoByIdentifier(req.params.id);
      if (!demo) return res.status(404).json({ message: "Demonstration not found" });
      if (!(await canAccessDemo(user, demo.id))) return res.status(403).json({ message: "Access denied" });
      if (!(await requireLiveController(user, demo, res))) return;
      const rawStatus = typeof req.body?.status === "string" ? req.body.status : "acknowledged";
      if (!["open", "acknowledged", "resolved"].includes(rawStatus)) return res.status(400).json({ message: "Choose open, acknowledged, or resolved" });
      const status = rawStatus as ConductReportStatus;
      const organizerResponse = typeof req.body?.organizerResponse === "string" && req.body.organizerResponse.trim()
        ? req.body.organizerResponse.trim().slice(0, 300)
        : null;
      if (status === "resolved" && !organizerResponse) return res.status(400).json({ message: "Add a private response before resolving the concern" });
      const reportId = getSingleParam(req.params.reportId);
      const report = reportId ? await storage.updateConductReport(demo.id, reportId, { status, organizerResponse }) : undefined;
      if (!report) return res.status(404).json({ message: "Conduct report not found" });
      io.to(`demo:${demo.publicId}`).emit("conduct_report_status_update", { updatedAt: report.updatedAt.toISOString() });
      res.json(serializeConductReport(report));
    } catch (err) {
      res.status(500).json({ message: "Failed to update private conduct report" });
    }
  });

  app.get("/api/run-sheet-templates", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const personal = await storage.getRunSheetTemplates(user.id);
      res.json({
        templates: [
          ...builtInRunSheetTemplates.map((template) => serializeRunSheetTemplate(template, "built-in")),
          ...personal.map((template) => serializeRunSheetTemplate(template, "personal")),
        ],
        limits: { personal: 20, stagesPerTemplate: 40 },
      });
    } catch {
      res.status(500).json({ message: "Failed to fetch programme templates" });
    }
  });

  app.post("/api/run-sheet-templates", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const parsed = parseRunSheetTemplateInput(req.body);
      if ("error" in parsed) return res.status(400).json({ message: parsed.error });
      const demoId = typeof req.body?.demonstrationId === "string" ? req.body.demonstrationId : "";
      const demo = await getDemoByIdentifier(demoId);
      if (!demo) return res.status(404).json({ message: "Demonstration not found" });
      if (!(await canAccessDemo(user, demo.id))) return res.status(403).json({ message: "Access denied" });
      const existingTemplates = await storage.getRunSheetTemplates(user.id);
      if (existingTemplates.length >= 20) return res.status(400).json({ message: "You can save up to 20 personal programme templates" });
      const items = await storage.getRunSheetItems(demo.id);
      if (items.length === 0) return res.status(400).json({ message: "Add at least one run-sheet stage before saving a template" });
      const stages: RunSheetTemplateStage[] = items.map((item) => ({
        kind: item.kind,
        title: item.title,
        participantNote: item.participantNote,
        plannedDurationMinutes: item.plannedDurationMinutes,
      }));
      const created = await storage.createRunSheetTemplate(user.id, {
        ...parsed.data,
        category: "custom",
        stages,
      });
      res.status(201).json(serializeRunSheetTemplate(created, "personal"));
    } catch {
      res.status(500).json({ message: "Failed to save the programme template" });
    }
  });

  app.delete("/api/run-sheet-templates/:templateId", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const templateId = getSingleParam(req.params.templateId) ?? "";
      if (templateId.startsWith("builtin:")) return res.status(400).json({ message: "Built-in templates cannot be deleted" });
      const deleted = await storage.deleteRunSheetTemplate(user.id, templateId);
      if (!deleted) return res.status(404).json({ message: "Personal template not found" });
      res.json({ success: true });
    } catch {
      res.status(500).json({ message: "Failed to delete the programme template" });
    }
  });

  app.get("/api/demos/:id/run-sheet", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const demo = await getDemoByIdentifier(req.params.id);
      if (!demo) return res.status(404).json({ message: "Demonstration not found" });
      if (!(await canAccessDemo(user, demo.id))) return res.status(403).json({ message: "Access denied" });
      res.json(await getRunSheetPayload(demo.id));
    } catch {
      res.status(500).json({ message: "Failed to fetch the event run sheet" });
    }
  });

  app.post("/api/demos/:id/run-sheet", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const demo = await getDemoByIdentifier(req.params.id);
      if (!demo) return res.status(404).json({ message: "Demonstration not found" });
      if (!(await canAccessDemo(user, demo.id))) return res.status(403).json({ message: "Access denied" });
      if (demo.status === "ended") return res.status(409).json({ message: "Ended event run sheets are read-only" });
      if (demo.status === "live" && !(await requireLiveController(user, demo, res))) return;
      const parsed = parseRunSheetItemInput(req.body);
      if ("error" in parsed) return res.status(400).json({ message: parsed.error });
      const existing = await storage.getRunSheetItems(demo.id);
      if (existing.length >= 40) return res.status(400).json({ message: "A run sheet can contain up to 40 stages" });
      const created = await storage.createRunSheetItem(demo.id, parsed.data);
      await emitRunSheetUpdate(io, demo);
      res.status(201).json(serializeRunSheetItem(created));
    } catch {
      res.status(500).json({ message: "Failed to add the run-sheet stage" });
    }
  });

  app.post("/api/demos/:id/run-sheet/apply-template", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const demo = await getDemoByIdentifier(req.params.id);
      if (!demo) return res.status(404).json({ message: "Demonstration not found" });
      if (!(await canAccessDemo(user, demo.id))) return res.status(403).json({ message: "Access denied" });
      if (demo.status !== "draft") return res.status(409).json({ message: "Programme templates can only be applied to draft events" });
      const templateId = typeof req.body?.templateId === "string" ? req.body.templateId : "";
      const mode = req.body?.mode === "append" ? "append" : req.body?.mode === "replace" ? "replace" : null;
      if (!templateId || !mode) return res.status(400).json({ message: "Choose a template and whether to replace or append" });
      const builtIn = builtInRunSheetTemplates.find((template) => template.id === templateId);
      const personal = builtIn ? undefined : await storage.getRunSheetTemplate(user.id, templateId);
      const template = builtIn ?? personal;
      if (!template) return res.status(404).json({ message: "Programme template not found" });
      const updated = await storage.applyRunSheetTemplate(demo.id, template.stages, mode);
      const payload = { items: updated.map(serializeRunSheetItem), summary: summarizeRunSheet(updated) };
      io.to(`demo:${demo.publicId}`).emit("run_sheet_update", { ...payload.summary, items: payload.items.map(toPublicRunSheetItem) });
      res.json({ ...payload, appliedTemplate: { id: template.id, name: template.name, mode } });
    } catch (err) {
      if (err instanceof Error && err.message === "RUN_SHEET_TEMPLATE_STARTED") {
        return res.status(409).json({ message: "This run sheet has already started and cannot be replaced" });
      }
      if (err instanceof Error && err.message === "RUN_SHEET_TEMPLATE_LIMIT") {
        return res.status(400).json({ message: "Applying this template would exceed the 40-stage limit" });
      }
      res.status(500).json({ message: "Failed to apply the programme template" });
    }
  });

  app.patch("/api/demos/:id/run-sheet/:itemId", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const demo = await getDemoByIdentifier(req.params.id);
      if (!demo) return res.status(404).json({ message: "Demonstration not found" });
      if (!(await canAccessDemo(user, demo.id))) return res.status(403).json({ message: "Access denied" });
      if (demo.status === "ended") return res.status(409).json({ message: "Ended event run sheets are read-only" });
      if (demo.status === "live" && !(await requireLiveController(user, demo, res))) return;
      const itemId = getSingleParam(req.params.itemId) ?? "";
      const items = await storage.getRunSheetItems(demo.id);
      const existing = items.find((item) => item.id === itemId);
      if (!existing) return res.status(404).json({ message: "Run-sheet stage not found" });
      if (existing.status !== "pending") return res.status(409).json({ message: "Only pending stages can be edited" });
      const parsed = parseRunSheetItemInput(req.body);
      if ("error" in parsed) return res.status(400).json({ message: parsed.error });
      const updated = await storage.updateRunSheetItem(demo.id, itemId, parsed.data);
      if (!updated) return res.status(404).json({ message: "Run-sheet stage not found" });
      await emitRunSheetUpdate(io, demo);
      res.json(serializeRunSheetItem(updated));
    } catch {
      res.status(500).json({ message: "Failed to update the run-sheet stage" });
    }
  });

  app.post("/api/demos/:id/run-sheet/:itemId/move", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const demo = await getDemoByIdentifier(req.params.id);
      if (!demo) return res.status(404).json({ message: "Demonstration not found" });
      if (!(await canAccessDemo(user, demo.id))) return res.status(403).json({ message: "Access denied" });
      if (demo.status === "ended") return res.status(409).json({ message: "Ended event run sheets are read-only" });
      if (demo.status === "live" && !(await requireLiveController(user, demo, res))) return;
      const direction = req.body?.direction === "up" ? "up" : req.body?.direction === "down" ? "down" : null;
      if (!direction) return res.status(400).json({ message: "Choose up or down" });
      const itemId = getSingleParam(req.params.itemId) ?? "";
      const items = await storage.getRunSheetItems(demo.id);
      const item = items.find((candidate) => candidate.id === itemId);
      if (!item) return res.status(404).json({ message: "Run-sheet stage not found" });
      if (item.status !== "pending" || items.some((candidate) => candidate.status !== "pending")) {
        return res.status(409).json({ message: "Reordering is available before the run sheet starts" });
      }
      const updated = await storage.moveRunSheetItem(demo.id, itemId, direction);
      await emitRunSheetUpdate(io, demo);
      res.json({ items: updated.map(serializeRunSheetItem), summary: summarizeRunSheet(updated) });
    } catch {
      res.status(500).json({ message: "Failed to reorder the run sheet" });
    }
  });

  app.delete("/api/demos/:id/run-sheet/:itemId", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const demo = await getDemoByIdentifier(req.params.id);
      if (!demo) return res.status(404).json({ message: "Demonstration not found" });
      if (!(await canAccessDemo(user, demo.id))) return res.status(403).json({ message: "Access denied" });
      if (demo.status === "ended") return res.status(409).json({ message: "Ended event run sheets are read-only" });
      if (demo.status === "live" && !(await requireLiveController(user, demo, res))) return;
      const itemId = getSingleParam(req.params.itemId) ?? "";
      const items = await storage.getRunSheetItems(demo.id);
      const item = items.find((candidate) => candidate.id === itemId);
      if (!item) return res.status(404).json({ message: "Run-sheet stage not found" });
      if (item.status !== "pending") return res.status(409).json({ message: "Only pending stages can be removed" });
      await storage.deleteRunSheetItem(demo.id, itemId);
      const payload = await emitRunSheetUpdate(io, demo);
      res.json(payload);
    } catch {
      res.status(500).json({ message: "Failed to remove the run-sheet stage" });
    }
  });

  app.post("/api/demos/:id/run-sheet/:itemId/transition", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const demo = await getDemoByIdentifier(req.params.id);
      if (!demo) return res.status(404).json({ message: "Demonstration not found" });
      if (!(await canAccessDemo(user, demo.id))) return res.status(403).json({ message: "Access denied" });
      if (demo.status !== "live") return res.status(409).json({ message: "Go live before progressing the run sheet" });
      if (!(await requireLiveController(user, demo, res))) return;
      const transition = ["start", "advance", "skip", "reopen"].includes(req.body?.transition)
        ? req.body.transition as RunSheetTransition
        : null;
      if (!transition) return res.status(400).json({ message: "Choose start, advance, skip, or reopen" });
      const itemId = getSingleParam(req.params.itemId) ?? "";
      const updated = await storage.transitionRunSheetItem(demo.id, itemId, transition);
      const payload = { items: updated.map(serializeRunSheetItem), summary: summarizeRunSheet(updated) };
      io.to(`demo:${demo.publicId}`).emit("run_sheet_update", payload.summary);
      res.json(payload);
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("RUN_SHEET_")) {
        return res.status(err.message === "RUN_SHEET_ITEM_NOT_FOUND" ? 404 : 409).json({ message: "The run sheet changed on another device. Refresh and try again." });
      }
      res.status(500).json({ message: "Failed to progress the run sheet" });
    }
  });

  app.get("/api/demos/:id/pulse", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const demo = await getDemoByIdentifier(req.params.id);
      if (!demo) return res.status(404).json({ message: "Demonstration not found" });
      if (!(await canAccessDemo(user, demo.id))) return res.status(403).json({ message: "Access denied" });

      res.json(getCrowdPulseSummary(demo.id));
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch crowd pulse" });
    }
  });

  app.post("/api/demos/:id/announcement", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const demo = await getDemoByIdentifier(req.params.id);
      if (!demo) return res.status(404).json({ message: "Demonstration not found" });
      if (!(await canAccessDemo(user, demo.id))) return res.status(403).json({ message: "Access denied" });
      if (!(await requireLiveController(user, demo, res))) return;

      const message = typeof req.body?.message === "string" ? req.body.message.trim().slice(0, 180) : "";
      if (!message) return res.status(400).json({ message: "Announcement message is required" });
      const rawTargetRole = typeof req.body?.targetRole === "string" ? req.body.targetRole : "all";
      const targetRole: OrganizerAnnouncement["targetRole"] = ["all", "participant", "marshal", "speaker", "accessibility"].includes(rawTargetRole)
        ? rawTargetRole as OrganizerAnnouncement["targetRole"]
        : "all";

      const announcement: OrganizerAnnouncement = {
        id: crypto.randomUUID(),
        message,
        targetRole,
        createdAt: new Date().toISOString(),
      };
      const announcements = organizerAnnouncements.get(demo.id) ?? [];
      organizerAnnouncements.set(demo.id, [announcement, ...announcements].slice(0, 10));
      io.to(`demo:${demo.publicId}`).emit("organizer_announcement", announcement);
      res.status(201).json(announcement);
    } catch (err) {
      res.status(500).json({ message: "Failed to send announcement" });
    }
  });

  app.get("/api/demos/:id/questions", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const demo = await getDemoByIdentifier(req.params.id);
      if (!demo) return res.status(404).json({ message: "Demonstration not found" });
      if (!(await canAccessDemo(user, demo.id))) return res.status(403).json({ message: "Access denied" });

      res.json(getAudienceQuestions(demo.id).map(serializeAudienceQuestion));
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch audience questions" });
    }
  });

  app.patch("/api/demos/:id/questions/:questionId", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const demo = await getDemoByIdentifier(req.params.id);
      if (!demo) return res.status(404).json({ message: "Demonstration not found" });
      if (!(await canAccessDemo(user, demo.id))) return res.status(403).json({ message: "Access denied" });
      if (!(await requireLiveController(user, demo, res))) return;

      const questionId = getSingleParam(req.params.questionId);
      const status = req.body?.status === "answered" ? "answered" : req.body?.status === "dismissed" ? "dismissed" : null;
      if (!status) return res.status(400).json({ message: "Valid question status is required" });

      const questions = getAudienceQuestions(demo.id);
      const question = questions.find((item) => item.id === questionId);
      if (!question) return res.status(404).json({ message: "Audience question not found" });

      question.status = status;
      question.resolvedAt = new Date().toISOString();
      io.to(`demo:${demo.publicId}`).emit("question_update", questions.filter((item) => item.status === "open").map(serializeAudienceQuestion));
      res.json(serializeAudienceQuestion(question));
    } catch (err) {
      res.status(500).json({ message: "Failed to update audience question" });
    }
  });

  app.get("/api/demos/:id/checkins", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const demo = await getDemoByIdentifier(req.params.id);
      if (!demo) return res.status(404).json({ message: "Demonstration not found" });
      if (!(await canAccessDemo(user, demo.id))) return res.status(403).json({ message: "Access denied" });

      res.json(getCheckInSummary(demo.id));
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch participant check-ins" });
    }
  });

  app.get("/api/demos/:id/feedback", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const demo = await getDemoByIdentifier(req.params.id);
      if (!demo) return res.status(404).json({ message: "Demonstration not found" });
      if (!(await canAccessDemo(user, demo.id))) return res.status(403).json({ message: "Access denied" });

      res.json(getFeedbackSummary(demo.id));
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch participant feedback" });
    }
  });

  app.get("/api/demos/:id/engagement", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const demo = await getDemoByIdentifier(req.params.id);
      if (!demo) return res.status(404).json({ message: "Demonstration not found" });
      if (!(await canAccessDemo(user, demo.id))) return res.status(403).json({ message: "Access denied" });

      res.json(getEngagementSummary(demo.id));
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch participant engagement" });
    }
  });

  app.get("/api/demos/:id/polls", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const demo = await getDemoByIdentifier(req.params.id);
      if (!demo) return res.status(404).json({ message: "Demonstration not found" });
      if (!(await canAccessDemo(user, demo.id))) return res.status(403).json({ message: "Access denied" });

      res.json(getLivePolls(demo.id).map(serializeLivePoll));
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch live polls" });
    }
  });

  app.post("/api/demos/:id/polls", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const demo = await getDemoByIdentifier(req.params.id);
      if (!demo) return res.status(404).json({ message: "Demonstration not found" });
      if (!(await canAccessDemo(user, demo.id))) return res.status(403).json({ message: "Access denied" });
      if (!(await requireLiveController(user, demo, res))) return;

      const question = typeof req.body?.question === "string" ? req.body.question.trim().slice(0, 160) : "";
      const optionLabels: string[] = Array.isArray(req.body?.options)
        ? req.body.options
            .map((option: unknown) => typeof option === "string" ? option.trim().slice(0, 48) : "")
            .filter(Boolean)
            .slice(0, 4)
        : [];
      const uniqueOptionLabels = Array.from(new Set(optionLabels));
      if (!question) return res.status(400).json({ message: "Poll question is required" });
      if (uniqueOptionLabels.length < 2) return res.status(400).json({ message: "Add at least two poll options" });

      const polls = getLivePolls(demo.id).map((poll) => (
        poll.status === "open" ? { ...poll, status: "closed" as LivePollStatus, closedAt: new Date().toISOString() } : poll
      ));
      const poll: LivePoll = {
        id: crypto.randomUUID(),
        demoId: demo.id,
        question,
        options: uniqueOptionLabels.map((label) => ({
          id: crypto.randomUUID(),
          label,
          voterSessionIds: [],
        })),
        status: "open",
        createdAt: new Date().toISOString(),
        closedAt: null,
      };

      livePolls.set(demo.id, [poll, ...polls].slice(0, 12));
      const serializedPoll = serializeLivePoll(poll);
      io.to(`demo:${demo.publicId}`).emit("poll_update", serializedPoll);
      res.status(201).json(serializedPoll);
    } catch (err) {
      res.status(500).json({ message: "Failed to create live poll" });
    }
  });

  app.patch("/api/demos/:id/polls/:pollId", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const demo = await getDemoByIdentifier(req.params.id);
      if (!demo) return res.status(404).json({ message: "Demonstration not found" });
      if (!(await canAccessDemo(user, demo.id))) return res.status(403).json({ message: "Access denied" });
      if (!(await requireLiveController(user, demo, res))) return;

      const pollId = getSingleParam(req.params.pollId);
      const polls = getLivePolls(demo.id);
      const poll = polls.find((item) => item.id === pollId);
      if (!poll) return res.status(404).json({ message: "Live poll not found" });

      poll.status = "closed";
      poll.closedAt = new Date().toISOString();
      const serializedPoll = serializeLivePoll(poll);
      io.to(`demo:${demo.publicId}`).emit("poll_update", null);
      io.to(`demo:${demo.publicId}`).emit("poll_results_update", serializedPoll);
      res.json(serializedPoll);
    } catch (err) {
      res.status(500).json({ message: "Failed to update live poll" });
    }
  });

  app.get("/api/demos/:id/safety-checks", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const demo = await getDemoByIdentifier(req.params.id);
      if (!demo) return res.status(404).json({ message: "Demonstration not found" });
      if (!(await canAccessDemo(user, demo.id))) return res.status(403).json({ message: "Access denied" });

      const checks = await storage.getSafetyChecks(demo.id);
      res.json(checks.map((check) => serializeSafetyCheck(check)));
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch safety checks" });
    }
  });

  app.post("/api/demos/:id/safety-checks", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const demo = await getDemoByIdentifier(req.params.id);
      if (!demo) return res.status(404).json({ message: "Demonstration not found" });
      if (!(await canAccessDemo(user, demo.id))) return res.status(403).json({ message: "Access denied" });
      if (!(await requireLiveController(user, demo, res))) return;

      const rawKind = typeof req.body?.kind === "string" ? req.body.kind : "general";
      const kind: SafetyCheckKind = ["route_change", "separation", "weather", "accessibility", "general"].includes(rawKind)
        ? rawKind as SafetyCheckKind
        : "general";
      const message = typeof req.body?.message === "string" && req.body.message.trim()
        ? req.body.message.trim().slice(0, 120)
        : "Safety check: please confirm whether you are okay.";
      const instruction = typeof req.body?.instruction === "string" && req.body.instruction.trim()
        ? req.body.instruction.trim().slice(0, 240)
        : "Pause where you are, look for an organiser, and respond below.";
      const check = await storage.createSafetyCheck(demo.id, { kind, message, instruction });
      const serializedCheck = serializeSafetyCheck(check);
      io.to(`demo:${demo.publicId}`).emit("safety_check_update", serializedCheck);
      res.status(201).json(serializedCheck);
    } catch (err) {
      res.status(500).json({ message: "Failed to start safety check" });
    }
  });

  app.patch("/api/demos/:id/safety-checks/:checkId", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const demo = await getDemoByIdentifier(req.params.id);
      if (!demo) return res.status(404).json({ message: "Demonstration not found" });
      if (!(await canAccessDemo(user, demo.id))) return res.status(403).json({ message: "Access denied" });
      if (!(await requireLiveController(user, demo, res))) return;

      const checkId = getSingleParam(req.params.checkId);
      const resolutionMessage = typeof req.body?.resolutionMessage === "string" && req.body.resolutionMessage.trim()
        ? req.body.resolutionMessage.trim().slice(0, 180)
        : "The safety check is complete. Continue following current organiser instructions.";
      const check = checkId ? await storage.closeSafetyCheck(demo.id, checkId, resolutionMessage) : undefined;
      if (!check) return res.status(404).json({ message: "Safety check not found" });
      const serializedCheck = serializeSafetyCheck(check);
      io.to(`demo:${demo.publicId}`).emit("safety_check_update", serializedCheck);
      io.to(`demo:${demo.publicId}`).emit("safety_check_results_update", serializedCheck);
      res.json(serializedCheck);
    } catch (err) {
      res.status(500).json({ message: "Failed to update safety check" });
    }
  });

  app.post("/api/public/demos/:publicId/assistance", async (req, res) => {
    try {
      const demo = await storage.getDemonstrationByPublicId(getSingleParam(req.params.publicId) ?? "");
      if (!demo) return res.status(404).json({ message: "Demonstration not found" });

      const rawType = typeof req.body?.type === "string" ? req.body.type : "organizer";
      const type: AssistanceType = ["accessibility", "connection", "safety", "organizer"].includes(rawType)
        ? rawType as AssistanceType
        : "organizer";
      const sessionId = typeof req.body?.sessionId === "string" && req.body.sessionId.trim()
        ? req.body.sessionId.trim().slice(0, 80)
        : crypto.randomUUID();
      const message = typeof req.body?.message === "string" && req.body.message.trim()
        ? req.body.message.trim().slice(0, 240)
        : "Participant requested help.";
      const result = await storage.createAssistanceRequest(demo.id, {
        type,
        message,
        sessionId,
      });
      if (result.created) awardEngagement(demo.id, demo.publicId, sessionId, "assistance", io);
      const requests = await storage.getAssistanceRequests(demo.id);
      io.to(`demo:${demo.publicId}`).emit("assistance_update", requests.map(serializeAssistanceRequest));
      res.status(result.created ? 201 : 200).json(serializeAssistanceRequest(result.request));
    } catch (err) {
      res.status(500).json({ message: "Failed to submit assistance request" });
    }
  });

  app.get("/api/public/demos/:publicId/conduct-reports", async (req, res) => {
    try {
      const demo = await storage.getDemonstrationByPublicId(getSingleParam(req.params.publicId) ?? "");
      if (!demo) return res.status(404).json({ message: "Demonstration not found" });
      const sessionId = typeof req.query.sessionId === "string" ? req.query.sessionId.trim().slice(0, 80) : "";
      if (!sessionId) return res.status(400).json({ message: "sessionId is required" });
      const reports = await storage.getParticipantConductReports(demo.id, sessionId);
      res.json(reports.map((report) => serializeConductReport(report, true)));
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch your private reports" });
    }
  });

  app.post("/api/public/demos/:publicId/conduct-reports", async (req, res) => {
    try {
      const demo = await storage.getDemonstrationByPublicId(getSingleParam(req.params.publicId) ?? "");
      if (!demo) return res.status(404).json({ message: "Demonstration not found" });
      const sessionId = typeof req.body?.sessionId === "string" ? req.body.sessionId.trim().slice(0, 80) : "";
      if (!sessionId) return res.status(400).json({ message: "A private device session is required" });
      const rawCategory = typeof req.body?.category === "string" ? req.body.category : "other";
      const category: ConductReportCategory = ["harassment", "unsafe_behavior", "privacy", "misinformation", "other"].includes(rawCategory)
        ? rawCategory as ConductReportCategory
        : "other";
      const urgency: ConductReportUrgency = req.body?.urgency === "urgent" ? "urgent" : "follow_up";
      const details = typeof req.body?.details === "string" ? req.body.details.trim().replace(/\s+/g, " ").slice(0, 600) : "";
      if (details.length < 20) return res.status(400).json({ message: "Add at least 20 characters so organisers can understand the concern" });
      const result = await storage.createConductReport(demo.id, { sessionId, category, urgency, details });
      io.to(`demo:${demo.publicId}`).emit("conduct_report_status_update", { updatedAt: result.report.updatedAt.toISOString() });
      res.status(result.created ? 201 : 200).json({ ...serializeConductReport(result.report, true), duplicate: !result.created });
    } catch (err) {
      res.status(500).json({ message: "Failed to submit the private conduct report" });
    }
  });

  app.get("/api/public/demos/:publicId/run-sheet", async (req, res) => {
    try {
      const demo = await storage.getDemonstrationByPublicId(getSingleParam(req.params.publicId) ?? "");
      if (!demo) return res.status(404).json({ message: "Demonstration not found" });
      const items = await storage.getRunSheetItems(demo.id);
      res.json({ ...summarizeRunSheet(items), items: items.map(serializeRunSheetItem).map(toPublicRunSheetItem) });
    } catch {
      res.status(500).json({ message: "Failed to fetch the live event stage" });
    }
  });

  app.post("/api/public/demos/:publicId/feedback", async (req, res) => {
    try {
      const demo = await storage.getDemonstrationByPublicId(getSingleParam(req.params.publicId) ?? "");
      if (!demo) return res.status(404).json({ message: "Demonstration not found" });

      const sessionId = typeof req.body?.sessionId === "string" && req.body.sessionId.trim()
        ? req.body.sessionId.trim().slice(0, 80)
        : crypto.randomUUID();
      const toRating = (value: unknown) => Math.min(5, Math.max(1, Number.parseInt(String(value), 10) || 3));
      const comment = typeof req.body?.comment === "string" && req.body.comment.trim()
        ? req.body.comment.trim().slice(0, 300)
        : null;
      const now = new Date().toISOString();
      const demoFeedback = participantFeedback.get(demo.id) ?? new Map<string, ParticipantFeedback>();
      const existing = demoFeedback.get(sessionId);

      demoFeedback.set(sessionId, {
        sessionId,
        clarityRating: toRating(req.body?.clarityRating),
        safetyRating: toRating(req.body?.safetyRating),
        accessibilityRating: toRating(req.body?.accessibilityRating),
        comment,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      });
      participantFeedback.set(demo.id, demoFeedback);
      awardEngagement(demo.id, demo.publicId, sessionId, "feedback", io);
      const summary = getFeedbackSummary(demo.id);
      io.to(`demo:${demo.publicId}`).emit("feedback_update", summary);
      res.status(existing ? 200 : 201).json(summary);
    } catch (err) {
      res.status(500).json({ message: "Failed to submit participant feedback" });
    }
  });

  app.post("/api/public/demos/:publicId/checkin", async (req, res) => {
    try {
      const demo = await storage.getDemonstrationByPublicId(getSingleParam(req.params.publicId) ?? "");
      if (!demo) return res.status(404).json({ message: "Demonstration not found" });

      const rawRole = typeof req.body?.role === "string" ? req.body.role : "participant";
      const role: ParticipantCheckInRole = ["participant", "marshal", "speaker", "accessibility"].includes(rawRole)
        ? rawRole as ParticipantCheckInRole
        : "participant";
      const sessionId = typeof req.body?.sessionId === "string" && req.body.sessionId.trim()
        ? req.body.sessionId.trim().slice(0, 80)
        : crypto.randomUUID();
      const displayName = typeof req.body?.displayName === "string" && req.body.displayName.trim()
        ? req.body.displayName.trim().slice(0, 60)
        : null;
      const now = new Date().toISOString();
      const demoCheckIns = participantCheckIns.get(demo.id) ?? new Map<string, ParticipantCheckIn>();
      const existing = demoCheckIns.get(sessionId);

      demoCheckIns.set(sessionId, {
        sessionId,
        role,
        displayName,
        checkedInAt: existing?.checkedInAt ?? now,
        updatedAt: now,
      });
      participantCheckIns.set(demo.id, demoCheckIns);
      awardEngagement(demo.id, demo.publicId, sessionId, "checkin", io);
      const summary = getCheckInSummary(demo.id);
      io.to(`demo:${demo.publicId}`).emit("checkin_update", summary);
      res.status(existing ? 200 : 201).json(summary);
    } catch (err) {
      res.status(500).json({ message: "Failed to check in participant" });
    }
  });

  app.get("/api/public/demos/:publicId/polls/active", async (req, res) => {
    try {
      const demo = await storage.getDemonstrationByPublicId(getSingleParam(req.params.publicId) ?? "");
      if (!demo) return res.status(404).json({ message: "Demonstration not found" });

      const activePoll = getActiveLivePoll(demo.id);
      res.json(activePoll ? serializeLivePoll(activePoll) : null);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch active poll" });
    }
  });

  app.post("/api/public/demos/:publicId/polls/:pollId/vote", async (req, res) => {
    try {
      const demo = await storage.getDemonstrationByPublicId(getSingleParam(req.params.publicId) ?? "");
      if (!demo) return res.status(404).json({ message: "Demonstration not found" });

      const pollId = getSingleParam(req.params.pollId);
      const optionId = typeof req.body?.optionId === "string" ? req.body.optionId : "";
      const sessionId = typeof req.body?.sessionId === "string" && req.body.sessionId.trim()
        ? req.body.sessionId.trim().slice(0, 80)
        : crypto.randomUUID();
      const poll = getLivePolls(demo.id).find((item) => item.id === pollId && item.status === "open");
      if (!poll) return res.status(404).json({ message: "Live poll not found" });

      const selectedOption = poll.options.find((option) => option.id === optionId);
      if (!selectedOption) return res.status(400).json({ message: "Valid poll option is required" });

      const alreadyVoted = poll.options.some((option) => option.voterSessionIds.includes(sessionId));
      for (const option of poll.options) {
        option.voterSessionIds = option.voterSessionIds.filter((voterSessionId) => voterSessionId !== sessionId);
      }
      selectedOption.voterSessionIds.push(sessionId);
      if (!alreadyVoted) {
        awardEngagement(demo.id, demo.publicId, sessionId, "poll_vote", io);
      }

      const serializedPoll = serializeLivePoll(poll);
      io.to(`demo:${demo.publicId}`).emit("poll_results_update", serializedPoll);
      res.json(serializedPoll);
    } catch (err) {
      res.status(500).json({ message: "Failed to submit poll vote" });
    }
  });

  app.get("/api/public/demos/:publicId/safety-checks/active", async (req, res) => {
    try {
      const demo = await storage.getDemonstrationByPublicId(getSingleParam(req.params.publicId) ?? "");
      if (!demo) return res.status(404).json({ message: "Demonstration not found" });

      const activeCheck = (await storage.getSafetyChecks(demo.id)).find((check) => check.status === "open") ?? null;
      res.json(activeCheck ? serializeSafetyCheck(activeCheck) : null);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch active safety check" });
    }
  });

  app.get("/api/public/demos/:publicId/safety-checks/current", async (req, res) => {
    try {
      const demo = await storage.getDemonstrationByPublicId(getSingleParam(req.params.publicId) ?? "");
      if (!demo) return res.status(404).json({ message: "Demonstration not found" });

      const sessionId = typeof req.query.sessionId === "string" ? req.query.sessionId.trim().slice(0, 80) : undefined;
      const currentCheck = getCurrentSafetyCheck(await storage.getSafetyChecks(demo.id));
      res.json(currentCheck ? serializeSafetyCheck(currentCheck, sessionId) : null);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch current safety check" });
    }
  });

  app.post("/api/public/demos/:publicId/safety-checks/:checkId/respond", async (req, res) => {
    try {
      const demo = await storage.getDemonstrationByPublicId(getSingleParam(req.params.publicId) ?? "");
      if (!demo) return res.status(404).json({ message: "Demonstration not found" });

      const checkId = getSingleParam(req.params.checkId);
      const rawResponse = typeof req.body?.response === "string" ? req.body.response : "ok";
      const response: SafetyCheckResponseType = ["ok", "need_help", "leaving", "not_sure"].includes(rawResponse)
        ? rawResponse as SafetyCheckResponseType
        : "ok";
      const sessionId = typeof req.body?.sessionId === "string" && req.body.sessionId.trim()
        ? req.body.sessionId.trim().slice(0, 80)
        : crypto.randomUUID();
      const note = typeof req.body?.note === "string" && req.body.note.trim()
        ? req.body.note.trim().slice(0, 160)
        : null;
      if (!checkId) return res.status(404).json({ message: "Safety check not found" });
      const responseResult = await storage.upsertSafetyCheckResponse(demo.id, checkId, { sessionId, response, note });
      if (!responseResult) return res.status(404).json({ message: "Safety check not found" });
      if (responseResult.created) awardEngagement(demo.id, demo.publicId, sessionId, "safety_check", io);

      if (response === "need_help") {
        const helpResult = await storage.createAssistanceRequest(demo.id, {
            type: "safety",
            message: note || "Participant marked need help during safety check.",
            sessionId,
        });
        if (helpResult.created) awardEngagement(demo.id, demo.publicId, sessionId, "assistance", io);
        const requests = await storage.getAssistanceRequests(demo.id);
        io.to(`demo:${demo.publicId}`).emit("assistance_update", requests.map(serializeAssistanceRequest));
      }

      const sharedCheck = serializeSafetyCheck(responseResult.check);
      io.to(`demo:${demo.publicId}`).emit("safety_check_results_update", sharedCheck);
      res.json(serializeSafetyCheck(responseResult.check, sessionId));
    } catch (err) {
      res.status(500).json({ message: "Failed to submit safety check response" });
    }
  });

  app.get("/api/public/demos/:publicId/questions", async (req, res) => {
    try {
      const demo = await storage.getDemonstrationByPublicId(getSingleParam(req.params.publicId) ?? "");
      if (!demo) return res.status(404).json({ message: "Demonstration not found" });

      res.json(getAudienceQuestions(demo.id).filter((question) => question.status === "open").map(serializeAudienceQuestion));
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch audience questions" });
    }
  });

  app.post("/api/public/demos/:publicId/questions", async (req, res) => {
    try {
      const demo = await storage.getDemonstrationByPublicId(getSingleParam(req.params.publicId) ?? "");
      if (!demo) return res.status(404).json({ message: "Demonstration not found" });

      const text = typeof req.body?.text === "string" ? req.body.text.trim().slice(0, 220) : "";
      if (!text) return res.status(400).json({ message: "Question text is required" });
      const sessionId = typeof req.body?.sessionId === "string" && req.body.sessionId.trim()
        ? req.body.sessionId.trim().slice(0, 80)
        : crypto.randomUUID();
      const questions = getAudienceQuestions(demo.id);
      const duplicate = questions.find((question) => question.sessionId === sessionId && question.status === "open" && question.text.toLowerCase() === text.toLowerCase());

      if (duplicate) {
        return res.json(serializeAudienceQuestion(duplicate));
      }

      const question: AudienceQuestion = {
        id: crypto.randomUUID(),
        demoId: demo.id,
        text,
        sessionId,
        status: "open",
        voterSessionIds: [sessionId],
        createdAt: new Date().toISOString(),
        resolvedAt: null,
      };

      questions.unshift(question);
      audienceQuestions.set(demo.id, questions.slice(0, 80));
      awardEngagement(demo.id, demo.publicId, sessionId, "question", io);
      const openQuestions = getAudienceQuestions(demo.id).filter((item) => item.status === "open").map(serializeAudienceQuestion);
      io.to(`demo:${demo.publicId}`).emit("question_update", openQuestions);
      res.status(201).json(serializeAudienceQuestion(question));
    } catch (err) {
      res.status(500).json({ message: "Failed to submit audience question" });
    }
  });

  app.post("/api/public/demos/:publicId/questions/:questionId/upvote", async (req, res) => {
    try {
      const demo = await storage.getDemonstrationByPublicId(getSingleParam(req.params.publicId) ?? "");
      if (!demo) return res.status(404).json({ message: "Demonstration not found" });

      const questionId = getSingleParam(req.params.questionId);
      const sessionId = typeof req.body?.sessionId === "string" && req.body.sessionId.trim()
        ? req.body.sessionId.trim().slice(0, 80)
        : crypto.randomUUID();
      const questions = getAudienceQuestions(demo.id);
      const question = questions.find((item) => item.id === questionId && item.status === "open");
      if (!question) return res.status(404).json({ message: "Audience question not found" });

      if (!question.voterSessionIds.includes(sessionId)) {
        question.voterSessionIds.push(sessionId);
        awardEngagement(demo.id, demo.publicId, sessionId, "upvote", io);
      }

      const openQuestions = questions.filter((item) => item.status === "open").map(serializeAudienceQuestion);
      io.to(`demo:${demo.publicId}`).emit("question_update", openQuestions);
      res.json(serializeAudienceQuestion(question));
    } catch (err) {
      res.status(500).json({ message: "Failed to upvote audience question" });
    }
  });

  app.post("/api/public/demos/:publicId/pulse", async (req, res) => {
    try {
      const demo = await storage.getDemonstrationByPublicId(getSingleParam(req.params.publicId) ?? "");
      if (!demo) return res.status(404).json({ message: "Demonstration not found" });

      const rawType = typeof req.body?.type === "string" ? req.body.type : "all_good";
      const type: CrowdPulseType = ["too_fast", "too_slow", "cant_hear", "all_good"].includes(rawType)
        ? rawType as CrowdPulseType
        : "all_good";
      const sessionId = typeof req.body?.sessionId === "string" && req.body.sessionId.trim()
        ? req.body.sessionId.trim().slice(0, 80)
        : crypto.randomUUID();
      const demoPulseMap = crowdPulses.get(demo.id) ?? new Map<string, CrowdPulse>();

      demoPulseMap.set(sessionId, {
        sessionId,
        type,
        createdAt: new Date().toISOString(),
      });
      crowdPulses.set(demo.id, demoPulseMap);
      awardEngagement(demo.id, demo.publicId, sessionId, "pulse", io);
      const summary = getCrowdPulseSummary(demo.id);
      io.to(`demo:${demo.publicId}`).emit("pulse_update", summary);
      res.status(201).json(summary);
    } catch (err) {
      res.status(500).json({ message: "Failed to submit crowd pulse" });
    }
  });

  app.get("/api/demos/:id/export", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const demo = await getDemoByIdentifier(req.params.id);
      if (!demo) return res.status(404).json({ message: "Not found" });
      if (!(await canAccessDemo(user, demo.id))) return res.status(403).json({ message: "Access denied" });

      const chantsList = await storage.getChants(demo.id);
      const state = await storage.getDemoState(demo.id);
      const adminLinks = await storage.getDemoAdmins(demo.id);
      const admins = await Promise.all(
        adminLinks.map(async (adminLink) => {
          const adminUser = await storage.getUser(adminLink.userId);
          if (!adminUser) return null;

          return {
            email: adminUser.email,
            name: adminUser.name,
            role: adminUser.id === demo.createdBy ? "creator" as const : "admin" as const,
          };
        }),
      );

      const currentChantOrderIndex = state?.currentChantId
        ? chantsList.find((chant) => chant.id === state.currentChantId)?.orderIndex ?? null
        : null;

      const payload = {
        version: 1 as const,
        exportedAt: new Date().toISOString(),
        demonstration: {
          title: demo.title,
          originalStatus: demo.status as "draft" | "live" | "ended",
          createdAt: demo.createdAt.toISOString(),
          supportUrl: demo.supportUrl ?? null,
          supportLabel: demo.supportLabel ?? null,
          scheduledAt: demo.scheduledAt ? demo.scheduledAt.toISOString() : null,
          locationName: demo.locationName ?? null,
          meetingPoint: demo.meetingPoint ?? null,
          arrivalNote: demo.arrivalNote ?? null,
        },
        chants: chantsList.map((chant) => ({
          orderIndex: chant.orderIndex,
          callText: chant.callText,
          responseText: chant.responseText,
          cycles: chant.cycles ?? 1,
          leaderDuration: chant.leaderDuration ?? 4,
          peopleDuration: chant.peopleDuration ?? 3,
        })),
        state: state ? {
          autoRotate: state.autoRotate ?? false,
          rotationInterval: state.rotationInterval ?? 60,
          cycleCount: state.cycleCount ?? 1,
          leaderDuration: state.leaderDuration ?? 4,
          peopleDuration: state.peopleDuration ?? 3,
          cycleDelay: state.cycleDelay ?? 500,
          eventDurationMinutes: state.eventDurationMinutes ?? 300,
          currentPhase: state.currentPhase ?? "leader",
          currentCycle: state.currentCycle ?? 1,
          currentChantOrderIndex,
        } : null,
        admins: admins.filter(Boolean),
      };

      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="${buildExportFilename(demo.title)}"`);
      res.json(payload);
    } catch (err) {
      console.error("Demonstration export error:", err);
      res.status(500).json({ message: "Failed to export demonstration" });
    }
  });

  app.patch("/api/demos/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const demo = await getDemoByIdentifier(req.params.id);
      if (!demo) return res.status(404).json({ message: "Not found" });
      if (!(await canAccessDemo(user, demo.id))) return res.status(403).json({ message: "Access denied" });

      const { title, supportUrl, supportLabel, scheduledAt, locationName, meetingPoint, arrivalNote } = req.body;
      if (typeof title === "string") {
        if (title.trim().length === 0) {
          return res.status(400).json({ message: "Title is required" });
        }

        const updated = await storage.updateDemoTitle(demo.id, title.trim());
        return res.json(updated);
      }

      if (supportUrl !== undefined || supportLabel !== undefined) {
        const trimmedUrl = typeof supportUrl === "string" ? supportUrl.trim() : "";
        let normalizedUrl: string | null = null;

        if (trimmedUrl) {
          try {
            const parsedUrl = new URL(trimmedUrl);
            if (!["http:", "https:"].includes(parsedUrl.protocol)) {
              return res.status(400).json({ message: "Support link must start with http:// or https://" });
            }
            normalizedUrl = parsedUrl.toString();
          } catch {
            return res.status(400).json({ message: "Enter a valid support link URL" });
          }
        }

        const normalizedLabel = typeof supportLabel === "string" && supportLabel.trim()
          ? supportLabel.trim().slice(0, 80)
          : null;
        const updated = await storage.updateDemoSupport(demo.id, {
          supportUrl: normalizedUrl,
          supportLabel: normalizedLabel,
        });
        if (updated?.status === "live") {
          await emitCurrentChant(io, updated);
        }
        return res.json(updated);
      }

      if (
        scheduledAt !== undefined ||
        locationName !== undefined ||
        meetingPoint !== undefined ||
        arrivalNote !== undefined
      ) {
        let normalizedScheduledAt: Date | null = null;
        const rawScheduledAt = typeof scheduledAt === "string" ? scheduledAt.trim() : "";

        if (rawScheduledAt) {
          normalizedScheduledAt = new Date(rawScheduledAt);
          if (Number.isNaN(normalizedScheduledAt.getTime())) {
            return res.status(400).json({ message: "Enter a valid event date and time" });
          }
        }

        const updated = await storage.updateDemoLogistics(demo.id, {
          scheduledAt: normalizedScheduledAt,
          locationName: typeof locationName === "string" && locationName.trim() ? locationName.trim().slice(0, 160) : null,
          meetingPoint: typeof meetingPoint === "string" && meetingPoint.trim() ? meetingPoint.trim().slice(0, 240) : null,
          arrivalNote: typeof arrivalNote === "string" && arrivalNote.trim() ? arrivalNote.trim().slice(0, 500) : null,
        });
        if (updated?.status === "live") {
          await emitCurrentChant(io, updated);
        }
        return res.json(updated);
      }

      if (!title || typeof title !== "string" || title.trim().length === 0) {
        return res.status(400).json({ message: "Title is required" });
      }

      const updated = await storage.updateDemoTitle(demo.id, title.trim());
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Failed to update demonstration" });
    }
  });

  app.post("/api/demos/:id/admins", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const demo = await getDemoByIdentifier(req.params.id);
      if (!demo) return res.status(404).json({ message: "Not found" });
      if (demo.createdBy !== user.id && user.role !== "super_admin") {
        return res.status(403).json({ message: "Only the demo creator or super admin can invite admins" });
      }

      const { email } = req.body;
      if (!email || typeof email !== "string" || !email.includes("@")) {
        return res.status(400).json({ message: "Valid email is required" });
      }

      const targetUser = await storage.getUserByEmail(email.trim().toLowerCase());
      if (!targetUser) {
        return res.status(404).json({ message: "No account found with that email. They need to register first." });
      }

      const alreadyAdmin = await storage.isDemoAdmin(demo.id, targetUser.id);
      if (alreadyAdmin) {
        return res.status(400).json({ message: "This person is already an admin for this event" });
      }

      await storage.addDemoAdmin(demo.id, targetUser.id);

      try {
        const { sendInviteEmail } = await import("./email");
        const demoUrl = `${req.protocol}://${req.get("host")}/admin/demos/${demo.id}`;
        await sendInviteEmail(targetUser.email, targetUser.name, user.name, demo.title, demoUrl);
      } catch (emailErr) {
        console.error("Failed to send invite email:", emailErr);
      }

      res.json({ success: true, admin: { id: targetUser.id, email: targetUser.email, name: targetUser.name, avatarUrl: targetUser.avatarUrl } });
    } catch (err) {
      res.status(500).json({ message: "Failed to invite admin" });
    }
  });

  app.delete("/api/demos/:id/admins/:userId", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const demo = await getDemoByIdentifier(req.params.id);
      if (!demo) return res.status(404).json({ message: "Not found" });
      if (demo.createdBy !== user.id && user.role !== "super_admin") {
        return res.status(403).json({ message: "Only the demo creator or super admin can remove admins" });
      }

      const adminUserId = getSingleParam(req.params.userId);
      if (!adminUserId) return res.status(400).json({ message: "userId is required" });

      if (adminUserId === demo.createdBy) {
        return res.status(400).json({ message: "Cannot remove the creator from the admin list" });
      }

      const state = await storage.getDemoState(demo.id);
      if (state?.liveControllerUserId === adminUserId) {
        return res.status(409).json({ message: "Hand live control to another admin before removing this person" });
      }

      await storage.removeDemoAdmin(demo.id, adminUserId);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to remove admin" });
    }
  });

  app.delete("/api/demos/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const demo = await getDemoByIdentifier(req.params.id);
      if (!demo) return res.status(404).json({ message: "Not found" });
      if (demo.createdBy !== user.id && user.role !== "super_admin") {
        return res.status(403).json({ message: "Only the demo creator or super admin can delete a demonstration" });
      }
      await storage.deleteDemonstration(demo.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete demonstration" });
    }
  });

  app.post("/api/demos/:id/chants", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const demo = await getDemoByIdentifier(req.params.id);
      if (!demo) return res.status(404).json({ message: "Not found" });
      if (!(await canAccessDemo(user, demo.id))) return res.status(403).json({ message: "Access denied" });

      const { callText, responseText, cycles, leaderDuration, peopleDuration } = req.body;
      if ((!callText || typeof callText !== "string" || callText.trim().length === 0) &&
          (!responseText || typeof responseText !== "string" || responseText.trim().length === 0)) {
        return res.status(400).json({ message: "At least one of call or response text is required" });
      }

      const existingChants = await storage.getChants(demo.id);
      if (existingChants.length >= 30) {
        return res.status(400).json({ message: "Maximum 30 chants per demonstration" });
      }

      const normalizedCycles = typeof cycles === "number" && cycles >= 1 && cycles <= 10 ? cycles : 1;
      const normalizedLeaderDuration = typeof leaderDuration === "number" && leaderDuration >= 1 && leaderDuration <= 30 ? leaderDuration : 4;
      const normalizedPeopleDuration = typeof peopleDuration === "number" && peopleDuration >= 1 && peopleDuration <= 30 ? peopleDuration : 3;

      const chant = await storage.addChant({
        demonstrationId: demo.id,
        orderIndex: existingChants.length,
        callText: (callText || "").trim(),
        responseText: (responseText || "").trim(),
        cycles: normalizedCycles,
        leaderDuration: normalizedLeaderDuration,
        peopleDuration: normalizedPeopleDuration,
      });

      res.json(chant);
    } catch (err) {
      res.status(500).json({ message: "Failed to add chant" });
    }
  });

  app.patch("/api/demos/:id/chants/:chantId", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const demo = await getDemoByIdentifier(req.params.id);
      if (!demo) return res.status(404).json({ message: "Not found" });
      if (!(await canAccessDemo(user, demo.id))) return res.status(403).json({ message: "Access denied" });

      const demoChants = await storage.getChants(demo.id);
      const chantId = getSingleParam(req.params.chantId);
      if (!chantId) return res.status(400).json({ message: "chantId is required" });
      const existingChant = demoChants.find((c) => c.id === chantId);
      if (!existingChant) return res.status(404).json({ message: "Chant not found in this demonstration" });

      const { callText, responseText, cycles, leaderDuration, peopleDuration } = req.body;
      if ((!callText || typeof callText !== "string" || callText.trim().length === 0) &&
          (!responseText || typeof responseText !== "string" || responseText.trim().length === 0)) {
        return res.status(400).json({ message: "At least one of call or response text is required" });
      }

      const updateData: any = {
        callText: (callText || "").trim(),
        responseText: (responseText || "").trim(),
      };
      if (typeof cycles === "number" && cycles >= 1 && cycles <= 10) updateData.cycles = cycles;
      if (typeof leaderDuration === "number" && leaderDuration >= 1 && leaderDuration <= 30) updateData.leaderDuration = leaderDuration;
      if (typeof peopleDuration === "number" && peopleDuration >= 1 && peopleDuration <= 30) updateData.peopleDuration = peopleDuration;

      const chant = await storage.updateChant(chantId, updateData);
      if (!chant) return res.status(404).json({ message: "Chant not found" });

      const state = await storage.getDemoState(demo.id);
      if (state?.currentChantId === chant.id && demo.status === "live") {
        const chantsList = await storage.getChants(demo.id);
        const chantIndex = chantsList.findIndex((c) => c.id === chant.id);
        const nextChantIndex = chantIndex >= 0 && chantsList.length > 0 ? (chantIndex + 1) % chantsList.length : null;
        const nextChant = nextChantIndex !== null ? chantsList[nextChantIndex] : null;
        const currentPhase = state.currentPhase === "people" ? "people" : "leader";

        io.to(`demo:${demo.publicId}`).emit("chant_update", {
          callText: chant.callText,
          responseText: chant.responseText,
          nextCallText: nextChant?.callText || null,
          nextResponseText: nextChant?.responseText || null,
          chantIndex: chantIndex >= 0 ? chantIndex : null,
          totalChants: chantsList.length,
          demoTitle: demo.title,
          demoStatus: demo.status,
          currentPhase,
          currentCycle: state.currentCycle ?? 1,
          cycleCount: chant.cycles ?? state.cycleCount ?? 1,
          phaseStartedAt: getPhaseStartedAt(state),
          phaseDurationMs: getPhaseDurationMs(chant, currentPhase),
          serverNow: new Date().toISOString(),
          supportUrl: demo.supportUrl ?? null,
          supportLabel: demo.supportLabel ?? null,
          scheduledAt: demo.scheduledAt ? new Date(demo.scheduledAt).toISOString() : null,
          locationName: demo.locationName ?? null,
          meetingPoint: demo.meetingPoint ?? null,
          arrivalNote: demo.arrivalNote ?? null,
          eventDurationMinutes: state?.eventDurationMinutes ?? 120,
        });
      }

      res.json(chant);
    } catch (err) {
      res.status(500).json({ message: "Failed to update chant" });
    }
  });

  app.delete("/api/demos/:id/chants/:chantId", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const demo = await getDemoByIdentifier(req.params.id);
      if (!demo) return res.status(404).json({ message: "Not found" });
      if (!(await canAccessDemo(user, demo.id))) return res.status(403).json({ message: "Access denied" });
      const demoChants = await storage.getChants(demo.id);
      const chantId = getSingleParam(req.params.chantId);
      if (!chantId) return res.status(400).json({ message: "chantId is required" });
      const chantExists = demoChants.some((c) => c.id === chantId);
      if (!chantExists) return res.status(404).json({ message: "Chant not found in this demonstration" });
      await storage.deleteChant(chantId);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete chant" });
    }
  });

  app.post("/api/demos/:id/chants/:chantId/reorder", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const demo = await getDemoByIdentifier(req.params.id);
      if (!demo) return res.status(404).json({ message: "Not found" });
      if (!(await canAccessDemo(user, demo.id))) return res.status(403).json({ message: "Access denied" });
      const { direction } = req.body;
      if (direction !== "up" && direction !== "down") {
        return res.status(400).json({ message: "Direction must be 'up' or 'down'" });
      }
      const chantId = getSingleParam(req.params.chantId);
      if (!chantId) return res.status(400).json({ message: "chantId is required" });
      await storage.reorderChants(demo.id, chantId, direction);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to reorder" });
    }
  });

  app.post("/api/demos/:id/current", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const demo = await getDemoByIdentifier(req.params.id);
      if (!demo) return res.status(404).json({ message: "Not found" });
      if (!(await canAccessDemo(user, demo.id))) return res.status(403).json({ message: "Access denied" });
      if (demo.status !== "live") return res.status(400).json({ message: "Demo is not live" });
      if (!(await requireLiveController(user, demo, res))) return;

      const { chantId } = req.body;
      if (!chantId) return res.status(400).json({ message: "chantId is required" });

      await storage.setCurrentChant(demo.id, chantId);

      const chantsList = await storage.getChants(demo.id);
      const chant = chantsList.find((c) => c.id === chantId);
      const chantIndex = chantsList.findIndex((c) => c.id === chantId);
      const nextChantIndex = chantIndex >= 0 && chantsList.length > 0 ? (chantIndex + 1) % chantsList.length : null;
      const nextChant = nextChantIndex !== null ? chantsList[nextChantIndex] : null;

      const currentState = await storage.getDemoState(demo.id);
      const currentPhase = currentState?.currentPhase === "people" ? "people" : "leader";
      io.to(`demo:${demo.publicId}`).emit("chant_update", {
        callText: chant?.callText || null,
        responseText: chant?.responseText || null,
        nextCallText: nextChant?.callText || null,
        nextResponseText: nextChant?.responseText || null,
        chantIndex: chantIndex >= 0 ? chantIndex : null,
        totalChants: chantsList.length,
        demoTitle: demo.title,
        demoStatus: demo.status,
        currentPhase,
        currentCycle: currentState?.currentCycle ?? 1,
        cycleCount: chant?.cycles ?? currentState?.cycleCount ?? 1,
        phaseStartedAt: getPhaseStartedAt(currentState),
        phaseDurationMs: getPhaseDurationMs(chant, currentPhase),
        serverNow: new Date().toISOString(),
        supportUrl: demo.supportUrl ?? null,
        supportLabel: demo.supportLabel ?? null,
        scheduledAt: demo.scheduledAt ? new Date(demo.scheduledAt).toISOString() : null,
        locationName: demo.locationName ?? null,
        meetingPoint: demo.meetingPoint ?? null,
        arrivalNote: demo.arrivalNote ?? null,
      });

      io.to(`demo:${demo.publicId}`).emit("viewer_count", getViewerCount(demo.id));

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to set current chant" });
    }
  });

  app.post("/api/demos/:id/live", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const demo = await getDemoByIdentifier(req.params.id);
      if (!demo) return res.status(404).json({ message: "Not found" });
      if (!(await canAccessDemo(user, demo.id))) return res.status(403).json({ message: "Access denied" });
      if (demo.status === "live") return res.status(400).json({ message: "Demo is already live" });

      const chantsList = await storage.getChants(demo.id);
      if (chantsList.length === 0) return res.status(400).json({ message: "Add at least one chant before going live" });

      await storage.updateDemoStatus(demo.id, "live");
      await storage.initDemoState(demo.id);
      await storage.claimLiveControl(demo.id, user.id, true);
      await storage.setLiveStartedAt(demo.id, new Date());

      await storage.setCurrentChant(demo.id, chantsList[0].id);

      const state = await storage.getDemoState(demo.id);
      const nextChantIndex = chantsList.length > 0 ? 1 % chantsList.length : null;
      const nextChant = nextChantIndex !== null ? chantsList[nextChantIndex] : null;
      const currentPhase = state?.currentPhase === "people" ? "people" : "leader";

      io.to(`demo:${demo.publicId}`).emit("chant_update", {
        callText: chantsList[0].callText,
        responseText: chantsList[0].responseText,
        nextCallText: nextChant?.callText || null,
        nextResponseText: nextChant?.responseText || null,
        chantIndex: 0,
        totalChants: chantsList.length,
        demoTitle: demo.title,
        demoStatus: "live",
        currentPhase,
        currentCycle: state?.currentCycle ?? 1,
        cycleCount: chantsList[0].cycles ?? state?.cycleCount ?? 1,
        phaseStartedAt: getPhaseStartedAt(state),
        phaseDurationMs: getPhaseDurationMs(chantsList[0], currentPhase),
        serverNow: new Date().toISOString(),
        supportUrl: demo.supportUrl ?? null,
        supportLabel: demo.supportLabel ?? null,
        scheduledAt: demo.scheduledAt ? new Date(demo.scheduledAt).toISOString() : null,
        locationName: demo.locationName ?? null,
        meetingPoint: demo.meetingPoint ?? null,
        arrivalNote: demo.arrivalNote ?? null,
      });

      if (state?.autoRotate) {
        await startAutoRotation(demo.id, demo.publicId);
      }

      res.json({ success: true, liveControllerUserId: user.id });
    } catch (err) {
      res.status(500).json({ message: "Failed to go live" });
    }
  });

  app.post("/api/demos/:id/end", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const demo = await getDemoByIdentifier(req.params.id);
      if (!demo) return res.status(404).json({ message: "Not found" });
      if (!(await canAccessDemo(user, demo.id))) return res.status(403).json({ message: "Access denied" });
      if (!(await requireLiveController(user, demo, res))) return;

      await storage.updateDemoStatus(demo.id, "ended");
      await storage.resetLiveStartedAt(demo.id);
      await storage.releaseLiveControl(demo.id, user.id, true);
      stopAutoRotation(demo.id);

      io.to(`demo:${demo.publicId}`).emit("demo_ended");

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to end demo" });
    }
  });

  function stopAutoRotation(demoId: string) {
    const timer = autoRotateTimers.get(demoId);
    if (timer) {
      clearTimeout(timer);
      autoRotateTimers.delete(demoId);
      autoRotateProgress.delete(demoId);
    }
  }

  async function startAutoRotation(demoId: string, publicId: string, options?: { resume?: boolean }) {
    stopAutoRotation(demoId);

    const tick = async () => {
      try {
        const demo = await storage.getDemonstration(demoId);
        if (!demo || demo.status !== "live") {
          stopAutoRotation(demoId);
          return;
        }

        const state = await storage.getDemoState(demoId);
        if (!state?.autoRotate) {
          stopAutoRotation(demoId);
          return;
        }

        const chantsList = await storage.getChants(demoId);
        if (chantsList.length === 0) return;

        const currentIndex = state.currentChantId ? chantsList.findIndex((c) => c.id === state.currentChantId) : 0;
        const resolvedIndex = currentIndex >= 0 ? currentIndex : 0;
        const progress = autoRotateProgress.get(demoId) ?? { phase: "leader" as const, cycle: 1 };

        let nextPhase: "leader" | "people" = progress.phase === "leader" ? "people" : "leader";
        let nextCycle = progress.cycle;
        let nextIndex = resolvedIndex;

        const activeChant = chantsList[resolvedIndex];
        const cycleCountForChant = activeChant?.cycles ?? 1;

        let addCycleDelay = false;
        if (progress.phase === "people") {
          addCycleDelay = true;
          if (progress.cycle >= cycleCountForChant) {
            nextCycle = 1;
            nextIndex = (resolvedIndex + 1) % chantsList.length;
            await storage.setCurrentChant(demoId, chantsList[nextIndex].id);
          } else {
            nextCycle = progress.cycle + 1;
          }
        }

        const cycleDelayMs = state.cycleDelay ?? 500;
        if (addCycleDelay && cycleDelayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, cycleDelayMs));
        }

        await storage.setRotationPhase(demoId, nextPhase, nextCycle);
        autoRotateProgress.set(demoId, { phase: nextPhase, cycle: nextCycle });

        const refreshedState = await storage.getDemoState(demoId);
        const nextSequenceIndex = chantsList.length > 0 ? (nextIndex + 1) % chantsList.length : null;
        const autoNextChant = nextSequenceIndex !== null ? chantsList[nextSequenceIndex] : null;
        const chantForEmit = chantsList[nextIndex];
        const emittedPhase = refreshedState?.currentPhase === "people" ? "people" : nextPhase;

        io.to(`demo:${publicId}`).emit("chant_update", {
          callText: chantForEmit.callText,
          responseText: chantForEmit.responseText,
          nextCallText: autoNextChant?.callText || null,
          nextResponseText: autoNextChant?.responseText || null,
          chantIndex: nextIndex,
          totalChants: chantsList.length,
          demoTitle: demo.title,
          demoStatus: demo.status,
          currentPhase: emittedPhase,
          currentCycle: refreshedState?.currentCycle ?? nextCycle,
          cycleCount: chantForEmit?.cycles ?? 1,
          phaseStartedAt: getPhaseStartedAt(refreshedState),
          phaseDurationMs: getPhaseDurationMs(chantForEmit, emittedPhase),
          serverNow: new Date().toISOString(),
          supportUrl: demo.supportUrl ?? null,
          supportLabel: demo.supportLabel ?? null,
          scheduledAt: demo.scheduledAt ? new Date(demo.scheduledAt).toISOString() : null,
          locationName: demo.locationName ?? null,
          meetingPoint: demo.meetingPoint ?? null,
          arrivalNote: demo.arrivalNote ?? null,
        });

        const delaySeconds = nextPhase === "leader" ? (chantForEmit?.leaderDuration ?? 4) : (chantForEmit?.peopleDuration ?? 3);
        const timeout = setTimeout(tick, Math.max(1, delaySeconds) * 1000);
        autoRotateTimers.set(demoId, timeout);
      } catch (err) {
        console.error("Auto-rotation error:", err);
        const retryTimeout = setTimeout(tick, 1000);
        autoRotateTimers.set(demoId, retryTimeout);
      }
    };

    const initialState = await storage.getDemoState(demoId);
    const initialChantsList = await storage.getChants(demoId);
    if (initialChantsList.length === 0) {
      return;
    }

    const savedIndex = initialState?.currentChantId
      ? initialChantsList.findIndex((chant) => chant.id === initialState.currentChantId)
      : -1;
    const resolvedIndex = savedIndex >= 0 ? savedIndex : 0;
    const activeChant = initialChantsList[resolvedIndex];

    if (options?.resume) {
      if (!initialState?.currentChantId || savedIndex < 0) {
        await storage.setCurrentChant(demoId, activeChant.id);
      }

      const resumedPhase = initialState?.currentPhase === "people" ? "people" : "leader";
      const resumedCycle = initialState?.currentCycle && initialState.currentCycle > 0 ? initialState.currentCycle : 1;
      const resumedDelaySeconds = resumedPhase === "leader"
        ? (activeChant?.leaderDuration ?? 4)
        : (activeChant?.peopleDuration ?? 3);

      autoRotateProgress.set(demoId, { phase: resumedPhase, cycle: resumedCycle });

      const timeout = setTimeout(tick, Math.max(1, resumedDelaySeconds) * 1000);
      autoRotateTimers.set(demoId, timeout);
      return;
    }

    await storage.setCurrentChant(demoId, activeChant.id);
    autoRotateProgress.set(demoId, { phase: "leader", cycle: 1 });
    const initialDelay = Math.max(1, activeChant?.leaderDuration ?? 4) * 1000;
    const timeout = setTimeout(tick, initialDelay);
    autoRotateTimers.set(demoId, timeout);
  }

  async function resumeLiveAutoRotations() {
    const liveDemos = await storage.getLiveDemonstrations();
    for (const liveDemo of liveDemos) {
      const state = await storage.getDemoState(liveDemo.id);
      if (!state?.autoRotate) {
        continue;
      }

      await startAutoRotation(liveDemo.id, liveDemo.publicId, { resume: true });
    }
  }

  app.post("/api/demos/:id/auto-rotate", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const demo = await getDemoByIdentifier(req.params.id);
      if (!demo) return res.status(404).json({ message: "Not found" });
      if (!(await canAccessDemo(user, demo.id))) return res.status(403).json({ message: "Access denied" });
      if (!(await requireLiveController(user, demo, res))) return;

      const { autoRotate, rotationInterval, cycleCount, leaderDuration, peopleDuration, cycleDelay } = req.body;
      if (typeof autoRotate !== "boolean") {
        return res.status(400).json({ message: "autoRotate must be a boolean" });
      }
      
      const interval = typeof rotationInterval === "number" && rotationInterval >= 5 && rotationInterval <= 18000 ? rotationInterval : 60;
      const normalizedCycleCount = typeof cycleCount === "number" && cycleCount >= 1 && cycleCount <= 10 ? cycleCount : 1;
      const normalizedLeaderDuration = typeof leaderDuration === "number" && leaderDuration >= 1 && leaderDuration <= 30 ? leaderDuration : 4;
      const normalizedPeopleDuration = typeof peopleDuration === "number" && peopleDuration >= 1 && peopleDuration <= 30 ? peopleDuration : 3;
      const normalizedCycleDelay = typeof cycleDelay === "number" && cycleDelay >= 0 && cycleDelay <= 5000 ? cycleDelay : 500;

      await storage.updateAutoRotation(demo.id, autoRotate, interval, normalizedCycleCount, normalizedLeaderDuration, normalizedPeopleDuration, normalizedCycleDelay);

      if (autoRotate && demo.status === "live") {
        await startAutoRotation(demo.id, demo.publicId);
      } else {
        stopAutoRotation(demo.id);
      }

      res.json({ success: true, autoRotate, rotationInterval: interval, cycleCount: normalizedCycleCount, leaderDuration: normalizedLeaderDuration, peopleDuration: normalizedPeopleDuration, cycleDelay: normalizedCycleDelay });
    } catch (err) {
      res.status(500).json({ message: "Failed to update auto-rotation" });
    }
  });

  app.post("/api/demos/:id/event-duration", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const demo = await getDemoByIdentifier(req.params.id);
      if (!demo) return res.status(404).json({ message: "Not found" });
      if (!(await canAccessDemo(user, demo.id))) return res.status(403).json({ message: "Access denied" });
      if (!(await requireLiveController(user, demo, res))) return;

      const { eventDurationMinutes } = req.body;
      const duration = typeof eventDurationMinutes === "number" && eventDurationMinutes >= 1 && eventDurationMinutes <= 300 ? eventDurationMinutes : 60;

      await storage.updateEventDuration(demo.id, duration);

      res.json({ success: true, eventDurationMinutes: duration });
    } catch (err) {
      res.status(500).json({ message: "Failed to update event duration" });
    }
  });

  app.get("/api/public/demos/:publicId/engagement/:sessionId", async (req, res) => {
    try {
      const demo = await storage.getDemonstrationByPublicId(getSingleParam(req.params.publicId) ?? "");
      if (!demo) return res.status(404).json({ message: "Demonstration not found" });

      const sessionId = getSingleParam(req.params.sessionId);
      if (!sessionId) return res.status(400).json({ message: "sessionId is required" });
      const engagement = participantEngagement.get(demo.id)?.get(sessionId);
      res.json(engagement ? serializeParticipantEngagement(engagement) : serializeParticipantEngagement({
        sessionId,
        points: 0,
        actions: getEmptyEngagementActions(),
        updatedAt: new Date().toISOString(),
      }));
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch participant engagement" });
    }
  });

  app.get("/api/demos/:id/qrcode", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const demo = await getDemoByIdentifier(req.params.id);
      if (!demo) return res.status(404).json({ message: "Not found" });
      if (!(await canAccessDemo(user, demo.id))) return res.status(403).json({ message: "Access denied" });

      const protocol = req.headers["x-forwarded-proto"] || req.protocol;
      const host = req.headers["x-forwarded-host"] || req.headers.host;
      const publicUrl = `${protocol}://${host}/d/${demo.publicId}`;

      const qrDataUrl = await QRCode.toDataURL(publicUrl, {
        width: 512,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      });

      res.json({ qrDataUrl, publicUrl });
    } catch (err) {
      res.status(500).json({ message: "Failed to generate QR code" });
    }
  });

  app.get("/api/admin/users", requireSuperAdmin, async (_req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const demoStats = await storage.getUserDemoStats();
      const statsByUserId = new Map(demoStats.map((stats) => [stats.userId, stats]));

      res.json(allUsers.map((user) => {
        const stats = statsByUserId.get(user.id);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatarUrl: user.avatarUrl,
          createdAt: user.createdAt,
          lastActivityAt: user.lastActivityAt,
          demonstrationCount: stats?.demonstrationCount ?? 0,
          lastDemonstrationAt: stats?.lastDemonstrationAt ?? null,
        };
      }));
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch("/api/admin/users/:userId/role", requireSuperAdmin, async (req, res) => {
    try {
      const { role } = req.body;
      if (role !== "admin" && role !== "super_admin") {
        return res.status(400).json({ message: "Invalid role" });
      }
      const userId = getSingleParam(req.params.userId);
      if (!userId) return res.status(400).json({ message: "userId is required" });
      await storage.updateUserRole(userId, role);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to update role" });
    }
  });

  app.delete("/api/admin/users/:userId", requireSuperAdmin, async (req, res) => {
    try {
      const currentUser = req.user as User;
      const userId = getSingleParam(req.params.userId);
      if (!userId) return res.status(400).json({ message: "userId is required" });
      if (userId === currentUser.id) {
        return res.status(400).json({ message: "Cannot remove yourself" });
      }
      await storage.deleteUser(userId);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to remove user" });
    }
  });

  io.on("connection", (socket) => {
    let currentDemo: { publicId: string; demoId: string; socketId: string } | null = null;

    socket.on("join_demo", async ({ publicId, sessionId }) => {
      try {
        const demo = await storage.getDemonstrationByPublicId(publicId);
        if (!demo) {
          socket.emit("demo_error", "Demonstration not found");
          return;
        }

        socket.join(`demo:${publicId}`);
        currentDemo = { publicId, demoId: demo.id, socketId: socket.id };

        if (!demoViewers.has(demo.id)) {
          demoViewers.set(demo.id, new Set());
        }
        demoViewers.get(demo.id)!.add(socket.id);

        const chantsList = await storage.getChants(demo.id);
        const state = await storage.getDemoState(demo.id);
        const currentChant = state?.currentChantId
          ? chantsList.find((c) => c.id === state.currentChantId)
          : null;
        const chantIndex = currentChant
          ? chantsList.findIndex((c) => c.id === currentChant.id)
          : null;
        const nextChantIndex = chantIndex !== null && chantsList.length > 0 ? (chantIndex + 1) % chantsList.length : null;
        const nextChant = nextChantIndex !== null ? chantsList[nextChantIndex] : null;
        const currentPhase = state?.currentPhase === "people" ? "people" : "leader";

        socket.emit("chant_update", {
          callText: currentChant?.callText || null,
          responseText: currentChant?.responseText || null,
          nextCallText: nextChant?.callText || null,
          nextResponseText: nextChant?.responseText || null,
          chantIndex,
          totalChants: chantsList.length,
          demoTitle: demo.title,
          demoStatus: demo.status,
          currentPhase,
          currentCycle: state?.currentCycle ?? 1,
          cycleCount: currentChant?.cycles ?? state?.cycleCount ?? 1,
          phaseStartedAt: getPhaseStartedAt(state),
          phaseDurationMs: getPhaseDurationMs(currentChant, currentPhase),
          serverNow: new Date().toISOString(),
          supportUrl: demo.supportUrl ?? null,
          supportLabel: demo.supportLabel ?? null,
          scheduledAt: demo.scheduledAt ? new Date(demo.scheduledAt).toISOString() : null,
          locationName: demo.locationName ?? null,
          meetingPoint: demo.meetingPoint ?? null,
          arrivalNote: demo.arrivalNote ?? null,
          eventDurationMinutes: state?.eventDurationMinutes ?? 120,
        });

        const participantSessionId = typeof sessionId === "string" ? sessionId.trim().slice(0, 80) : undefined;
        const currentSafetyCheck = getCurrentSafetyCheck(await storage.getSafetyChecks(demo.id));
        socket.emit("safety_check_update", currentSafetyCheck ? serializeSafetyCheck(currentSafetyCheck, participantSessionId) : null);

        const count = getViewerCount(demo.id);
        io.to(`demo:${publicId}`).emit("viewer_count", count);
      } catch (err) {
        socket.emit("demo_error", "Failed to join demonstration");
      }
    });

    socket.on("leave_demo", ({ publicId }) => {
      socket.leave(`demo:${publicId}`);
      if (currentDemo) {
        demoViewers.get(currentDemo.demoId)?.delete(socket.id);
        const count = getViewerCount(currentDemo.demoId);
        io.to(`demo:${publicId}`).emit("viewer_count", count);
        currentDemo = null;
      }
    });

    socket.on("disconnect", () => {
      if (currentDemo) {
        demoViewers.get(currentDemo.demoId)?.delete(socket.id);
        const count = getViewerCount(currentDemo.demoId);
        io.to(`demo:${currentDemo.publicId}`).emit("viewer_count", count);
      }
    });
  });

  await resumeLiveAutoRotations();

  return httpServer;
}
