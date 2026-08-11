import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { ArrowDown, ArrowLeft, ArrowUp, BookOpen, CalendarPlus, CheckCircle2, ClipboardList, Clock3, Copy, Database, Download, ExternalLink, FileText, History, LifeBuoy, ListOrdered, LockKeyhole, Megaphone, Play, Plus, QrCode, RotateCcw, Route, Save, Share2, ShieldCheck, SkipForward, Trash2, UserRoundCheck, Users, WifiOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { buildGoogleCalendarUrl, buildOutlookCalendarUrl, downloadCalendarFile, type CalendarEventDetails } from "@/lib/calendar";
import type { Chant, DemoState, Demonstration } from "@shared/schema";

type AdminInfo = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  eventRole: "owner" | "admin";
};

type LiveControl = {
  controller: Pick<AdminInfo, "id" | "name" | "avatarUrl"> | null;
  claimedAt: string | null;
};

type DemoDetail = {
  demo: Demonstration;
  chants: Chant[];
  state: DemoState | null;
  viewerCount: number;
  admins: AdminInfo[];
  liveControl: LiveControl;
};

function formatCommandSchedule(value: Date | string | null | undefined) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not scheduled";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

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
type LivePoll = {
  id: string;
  question: string;
  status: "open" | "closed";
  options: Array<{
    id: string;
    label: string;
    votes: number;
  }>;
  totalVotes: number;
  createdAt: string;
  closedAt: string | null;
};
type SafetyCheckKind = "route_change" | "separation" | "weather" | "accessibility" | "general";
type SafetyCheck = {
  id: string;
  kind: SafetyCheckKind;
  message: string;
  instruction: string;
  status: "open" | "closed";
  counts: {
    ok: number;
    need_help: number;
    leaving: number;
    not_sure: number;
  };
  totalResponses: number;
  needsAttention: Array<{
    response: "need_help" | "not_sure";
    note: string | null;
    updatedAt: string;
    participantLabel: string;
  }>;
  resolutionMessage: string | null;
  createdAt: string;
  closedAt: string | null;
  storage: "shared";
};
type CheckInRole = "participant" | "marshal" | "speaker" | "accessibility";
type AnnouncementTargetRole = "all" | CheckInRole;
type AnnouncementLanguage = "en" | "es" | "fr" | "ar" | "fa";
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
type EngagementSummary = {
  totalParticipants: number;
  totalPoints: number;
  topParticipants: Array<{
    points: number;
    badges: string[];
    participantLabel: string;
    updatedAt: string;
  }>;
};
type ConductReport = {
  id: string;
  reference: string;
  category: "harassment" | "unsafe_behavior" | "privacy" | "misinformation" | "other";
  urgency: "urgent" | "follow_up";
  details: string;
  status: "open" | "acknowledged" | "resolved";
  organizerResponse: string | null;
  createdAt: string;
  updatedAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  participantLabel: string;
};
type ConductReportSummary = {
  total: number;
  open: number;
  acknowledged: number;
  resolved: number;
  urgent: number;
  activeUrgent: number;
  categories: Record<ConductReport["category"], number>;
  averageAcknowledgementMinutes: number | null;
  averageResolutionMinutes: number | null;
};
type ConductReportQueue = { reports: ConductReport[]; summary: ConductReportSummary };
type RunSheetItemKind = "arrival" | "welcome" | "chant" | "speaker" | "movement" | "break" | "closing" | "custom";
type RunSheetItem = {
  id: string;
  orderIndex: number;
  kind: RunSheetItemKind;
  title: string;
  participantNote: string | null;
  plannedDurationMinutes: number;
  actualDurationMinutes: number | null;
  status: "pending" | "active" | "completed" | "skipped";
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
};
type RunSheetSummary = {
  total: number;
  plannedDurationMinutes: number;
  completed: number;
  skipped: number;
  pending: number;
  active: RunSheetItem | null;
  next: RunSheetItem | null;
  storage: "shared";
  updatedAt: string | null;
};
type RunSheetPayload = { items: RunSheetItem[]; summary: RunSheetSummary };
type RunSheetTemplateStage = Pick<RunSheetItem, "kind" | "title" | "participantNote" | "plannedDurationMinutes">;
type RunSheetTemplate = {
  id: string;
  source: "built-in" | "personal";
  name: string;
  description: string | null;
  category: string;
  stages: RunSheetTemplateStage[];
  stageCount: number;
  plannedDurationMinutes: number;
  createdAt: string | null;
  updatedAt: string | null;
};
type RunSheetTemplatePayload = {
  templates: RunSheetTemplate[];
  limits: { personal: number; stagesPerTemplate: number };
};

const runSheetPresets: Array<{ kind: RunSheetItemKind; label: string; title: string; note: string; duration: number }> = [
  { kind: "arrival", label: "Arrival", title: "Arrival and check-in", note: "Arrive, find your group, and check in with an organiser.", duration: 15 },
  { kind: "welcome", label: "Welcome", title: "Welcome and safety briefing", note: "Listen for the welcome, access information, and safety guidance.", duration: 10 },
  { kind: "chant", label: "Chant block", title: "Live chant block", note: "Follow the call-and-response shown on this screen.", duration: 15 },
  { kind: "speaker", label: "Speaker", title: "Speaker address", note: "Please give the speaker your attention.", duration: 10 },
  { kind: "movement", label: "Movement", title: "Move to the next location", note: "Follow marshals and the latest organiser safety instructions.", duration: 15 },
  { kind: "break", label: "Break", title: "Water and access break", note: "Take a short break and ask an organiser if you need support.", duration: 10 },
  { kind: "closing", label: "Closing", title: "Closing and next steps", note: "Stay for final information and a safe departure.", duration: 10 },
  { kind: "custom", label: "Custom", title: "", note: "", duration: 10 },
];

function statusTone(status: string) {
  if (status === "live") return "Live event: prioritize recovery, current chant, and participant link visibility.";
  if (status === "ended") return "Ended event: prioritize report, export, and reuse decisions.";
  return "Draft event: prioritize readiness, sharing, volunteer briefing, and handouts.";
}

const multilingualInviteTemplates = [
  {
    label: "English",
    getText: (url: string) => `Join the live ChantLive page here: ${url}\nNo account is needed. Use the Language selector at the bottom of the participant page if you need translated controls.`,
  },
  {
    label: "Español",
    getText: (url: string) => `Únete a la página en vivo de ChantLive aquí: ${url}\nNo necesitas cuenta. Usa el selector de idioma al final de la página si necesitas controles traducidos.`,
  },
  {
    label: "Français",
    getText: (url: string) => `Rejoignez la page ChantLive en direct ici : ${url}\nAucun compte n'est nécessaire. Utilisez le sélecteur de langue en bas de la page si vous avez besoin des commandes traduites.`,
  },
  {
    label: "العربية",
    getText: (url: string) => `انضم إلى صفحة ChantLive المباشرة هنا: ${url}\nلا تحتاج إلى حساب. استخدم اختيار اللغة في أسفل صفحة المشاركين إذا احتجت إلى أزرار مترجمة.`,
  },
  {
    label: "فارسی",
    getText: (url: string) => `از این لینک وارد صفحه زنده ChantLive شوید: ${url}\nنیازی به حساب کاربری نیست. اگر کنترل‌های ترجمه‌شده لازم دارید، از انتخاب زبان پایین صفحه استفاده کنید.`,
  },
];

const announcementLanguageOptions: Array<{ code: AnnouncementLanguage; label: string }> = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "ar", label: "العربية" },
  { code: "fa", label: "فارسی" },
];

const announcementAudienceLabels: Record<AnnouncementTargetRole, string> = {
  all: "Everyone",
  participant: "Participants",
  marshal: "Marshals",
  speaker: "Speakers",
  accessibility: "Accessibility helpers",
};

const announcementPlaceholders: Record<AnnouncementLanguage, string> = {
  en: "Example: Move closer to the speaker, then keep this page open.",
  es: "Ejemplo: Acércate al altavoz y mantén esta página abierta.",
  fr: "Exemple : rapprochez-vous du haut-parleur et gardez cette page ouverte.",
  ar: "مثال: اقترب من مكبر الصوت وأبقِ هذه الصفحة مفتوحة.",
  fa: "نمونه: به بلندگو نزدیک‌تر شوید و این صفحه را باز نگه دارید.",
};

const announcementStarters: Array<{
  id: string;
  labels: Record<AnnouncementLanguage, string>;
  messages: Record<AnnouncementLanguage, string>;
  targetRole: AnnouncementTargetRole;
}> = [
  {
    id: "route-change",
    labels: { en: "Route change", es: "Cambio de ruta", fr: "Changement d’itinéraire", ar: "تغيير المسار", fa: "تغییر مسیر" },
    messages: {
      en: "The meeting point or route has changed. Follow organiser and marshal directions.",
      es: "El punto de encuentro o la ruta ha cambiado. Sigue las indicaciones de la organización y del equipo de apoyo.",
      fr: "Le point de rendez-vous ou l’itinéraire a changé. Suivez les consignes de l’organisation et des responsables.",
      ar: "تغيّرت نقطة التجمع أو المسار. اتبع تعليمات المنظمين والمشرفين.",
      fa: "محل تجمع یا مسیر تغییر کرده است. دستورهای برگزارکنندگان و مسئولان را دنبال کنید.",
    },
    targetRole: "all",
  },
  {
    id: "pause",
    labels: { en: "Pause and wait", es: "Pausa y espera", fr: "Pause et attente", ar: "توقف وانتظار", fa: "توقف و انتظار" },
    messages: {
      en: "Pause where you are if it is safe and wait for the next organiser update.",
      es: "Detente donde estás si es seguro y espera la próxima actualización de la organización.",
      fr: "Arrêtez-vous là où vous êtes si cela ne présente aucun danger et attendez la prochaine consigne de l’organisation.",
      ar: "توقف في مكانك إذا كان ذلك آمناً وانتظر التحديث التالي من المنظمين.",
      fa: "اگر امن است در جای خود توقف کنید و منتظر پیام بعدی برگزارکنندگان بمانید.",
    },
    targetRole: "all",
  },
  {
    id: "accessibility",
    labels: { en: "Accessibility check", es: "Revisión de accesibilidad", fr: "Vérification d’accessibilité", ar: "فحص إمكانية الوصول", fa: "بررسی دسترس‌پذیری" },
    messages: {
      en: "Accessibility helpers, please check the participant help requests now.",
      es: "Equipo de accesibilidad: revisen ahora las solicitudes de ayuda de participantes.",
      fr: "Équipe d’accessibilité, veuillez vérifier maintenant les demandes d’aide des participants.",
      ar: "فريق دعم إمكانية الوصول، يرجى مراجعة طلبات مساعدة المشاركين الآن.",
      fa: "همیاران دسترس‌پذیری، لطفاً اکنون درخواست‌های کمک شرکت‌کنندگان را بررسی کنید.",
    },
    targetRole: "accessibility",
  },
];

const incidentPresets: Array<{
  kind: SafetyCheckKind;
  label: string;
  message: string;
  instruction: string;
  allClear: string;
}> = [
  {
    kind: "route_change",
    label: "Route changed",
    message: "The planned route has changed.",
    instruction: "Pause where you are and wait for a marshal or organiser to confirm the next movement.",
    allClear: "The updated route is confirmed. Follow the latest organiser and marshal directions.",
  },
  {
    kind: "separation",
    label: "Group separated",
    message: "Parts of the group have become separated.",
    instruction: "Stay with the people around you and move only to the agreed meeting point when it is safe to do so.",
    allClear: "The group check is complete. Continue from the confirmed meeting point or current organiser instruction.",
  },
  {
    kind: "weather",
    label: "Weather or site",
    message: "Conditions at the event site have changed.",
    instruction: "Pause activity, move away from immediate hazards, and wait for the next organiser instruction.",
    allClear: "Conditions have been reassessed. Follow the current organiser instruction before resuming activity.",
  },
  {
    kind: "accessibility",
    label: "Access disruption",
    message: "The planned accessible route or support point is unavailable.",
    instruction: "Stay where you are if safe and ask an accessibility helper or organiser for the confirmed alternative.",
    allClear: "An accessible alternative is confirmed. Follow the latest accessibility helper or organiser direction.",
  },
  {
    kind: "general",
    label: "General disruption",
    message: "The event is temporarily paused for a safety check.",
    instruction: "Pause where you are, look for an organiser, and respond below so the team can account for the group.",
    allClear: "The safety check is complete. Continue following current organiser instructions.",
  },
];

export default function CommandCenter() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [announcementTarget, setAnnouncementTarget] = useState<AnnouncementTargetRole>("all");
  const [announcementLanguage, setAnnouncementLanguage] = useState<AnnouncementLanguage>("en");
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["Yes", "No", "Need more info"]);
  const [safetyCheckKind, setSafetyCheckKind] = useState<SafetyCheckKind>("general");
  const [safetyCheckMessage, setSafetyCheckMessage] = useState(incidentPresets[4].message);
  const [safetyCheckInstruction, setSafetyCheckInstruction] = useState(incidentPresets[4].instruction);
  const [incidentAllClear, setIncidentAllClear] = useState(incidentPresets[4].allClear);
  const [incidentError, setIncidentError] = useState<string | null>(null);
  const [offlineLinkStatus, setOfflineLinkStatus] = useState<string | null>(null);
  const [handoffTargetUserId, setHandoffTargetUserId] = useState("");
  const [conductFilter, setConductFilter] = useState<"active" | "urgent" | "all">("active");
  const [conductResponses, setConductResponses] = useState<Record<string, string>>({});
  const [runSheetKind, setRunSheetKind] = useState<RunSheetItemKind>("welcome");
  const [runSheetTitle, setRunSheetTitle] = useState(runSheetPresets[1].title);
  const [runSheetNote, setRunSheetNote] = useState(runSheetPresets[1].note);
  const [runSheetDuration, setRunSheetDuration] = useState(runSheetPresets[1].duration);
  const [selectedRunSheetTemplateId, setSelectedRunSheetTemplateId] = useState("builtin:community");
  const [runSheetTemplateMode, setRunSheetTemplateMode] = useState<"replace" | "append">("replace");
  const [runSheetTemplateName, setRunSheetTemplateName] = useState("");
  const [runSheetTemplateDescription, setRunSheetTemplateDescription] = useState("");
  const [templateDeleteConfirmationId, setTemplateDeleteConfirmationId] = useState<string | null>(null);
  const applyIncidentPreset = (preset: (typeof incidentPresets)[number]) => {
    setSafetyCheckKind(preset.kind);
    setSafetyCheckMessage(preset.message);
    setSafetyCheckInstruction(preset.instruction);
    setIncidentAllClear(preset.allClear);
    setIncidentError(null);
  };
  const announcementDirection = announcementLanguage === "ar" || announcementLanguage === "fa" ? "rtl" : "ltr";
  const changeAnnouncementLanguage = (language: AnnouncementLanguage) => {
    const selectedStarter = announcementStarters.find((starter) =>
      starter.targetRole === announcementTarget && Object.values(starter.messages).includes(announcementMessage)
    );

    setAnnouncementLanguage(language);
    if (selectedStarter) {
      setAnnouncementMessage(selectedStarter.messages[language]);
    }
  };

  const { data, isLoading } = useQuery<DemoDetail>({
    queryKey: ["/api/demos", id],
    refetchInterval: 5000,
  });
  const updateLiveControl = useMutation({
    mutationFn: async ({ action, targetUserId }: { action: "claim" | "release" | "transfer"; targetUserId?: string }) => {
      await apiRequest("POST", `/api/demos/${id}/live-control`, { action, targetUserId });
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/demos", id] });
      setHandoffTargetUserId("");
      toast({
        title: variables.action === "transfer"
          ? "Live control handed over"
          : variables.action === "release"
            ? "Live control released"
            : "You now have live control",
      });
    },
    onError: (err: Error) => {
      queryClient.invalidateQueries({ queryKey: ["/api/demos", id] });
      toast({ title: "Live control did not change", description: err.message, variant: "destructive" });
    },
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
  const { data: feedback } = useQuery<FeedbackSummary>({
    queryKey: ["/api/demos", id, "feedback"],
    refetchInterval: 5000,
    enabled: Boolean(id),
  });
  const { data: engagement } = useQuery<EngagementSummary>({
    queryKey: ["/api/demos", id, "engagement"],
    refetchInterval: 3000,
    enabled: Boolean(id),
  });
  const { data: livePolls = [] } = useQuery<LivePoll[]>({
    queryKey: ["/api/demos", id, "polls"],
    refetchInterval: 3000,
    enabled: Boolean(id),
  });
  const { data: safetyChecks = [] } = useQuery<SafetyCheck[]>({
    queryKey: ["/api/demos", id, "safety-checks"],
    refetchInterval: 3000,
    enabled: Boolean(id),
  });
  const { data: conductQueue } = useQuery<ConductReportQueue>({
    queryKey: ["/api/demos", id, "conduct-reports"],
    refetchInterval: 3000,
    enabled: Boolean(id),
  });
  const { data: runSheet } = useQuery<RunSheetPayload>({
    queryKey: ["/api/demos", id, "run-sheet"],
    refetchInterval: 3000,
    enabled: Boolean(id),
  });
  const { data: runSheetTemplates, isLoading: runSheetTemplatesLoading, error: runSheetTemplatesError } = useQuery<RunSheetTemplatePayload>({
    queryKey: ["/api/run-sheet-templates"],
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
  const updateConductReport = useMutation({
    mutationFn: async ({ reportId, status }: { reportId: string; status: ConductReport["status"] }) => {
      const organizerResponse = (conductResponses[reportId] ?? "").trim();
      await apiRequest("PATCH", `/api/demos/${id}/conduct-reports/${reportId}`, { status, organizerResponse });
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/demos", id, "conduct-reports"] });
      toast({ title: variables.status === "resolved" ? "Concern resolved" : "Concern acknowledged", description: "The participant can privately recover this status and response." });
    },
    onError: (err: Error) => {
      toast({ title: "Could not update concern", description: err.message, variant: "destructive" });
    },
  });
  const createRunSheetItem = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/demos/${id}/run-sheet`, {
        kind: runSheetKind,
        title: runSheetTitle,
        participantNote: runSheetNote,
        plannedDurationMinutes: runSheetDuration,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/demos", id, "run-sheet"] });
      const preset = runSheetPresets.find((item) => item.kind === runSheetKind) ?? runSheetPresets[7];
      setRunSheetTitle(preset.title);
      setRunSheetNote(preset.note);
      setRunSheetDuration(preset.duration);
      toast({ title: "Stage added to the run sheet", description: "Its participant guidance is ready for the live Now / Next view." });
    },
    onError: (err: Error) => toast({ title: "Could not add stage", description: err.message, variant: "destructive" }),
  });
  const applyRunSheetTemplate = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/demos/${id}/run-sheet/apply-template`, {
        templateId: selectedRunSheetTemplateId,
        mode: runSheetTemplateMode,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/demos", id, "run-sheet"] });
      const template = runSheetTemplates?.templates.find((item) => item.id === selectedRunSheetTemplateId);
      toast({
        title: `${template?.name ?? "Programme"} applied`,
        description: runSheetTemplateMode === "replace" ? "The draft now uses this complete programme." : "The programme was added after the existing stages.",
      });
    },
    onError: (err: Error) => toast({ title: "Could not apply template", description: err.message, variant: "destructive" }),
  });
  const saveRunSheetTemplate = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/run-sheet-templates", {
        demonstrationId: id,
        name: runSheetTemplateName,
        description: runSheetTemplateDescription,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/run-sheet-templates"] });
      setRunSheetTemplateName("");
      setRunSheetTemplateDescription("");
      toast({ title: "Programme saved to your library", description: "It is available on your other events and remains private to your account." });
    },
    onError: (err: Error) => toast({ title: "Could not save template", description: err.message, variant: "destructive" }),
  });
  const deleteRunSheetTemplate = useMutation({
    mutationFn: async (templateId: string) => apiRequest("DELETE", `/api/run-sheet-templates/${templateId}`),
    onSuccess: (_result, templateId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/run-sheet-templates"] });
      if (selectedRunSheetTemplateId === templateId) setSelectedRunSheetTemplateId("builtin:community");
      setTemplateDeleteConfirmationId(null);
      toast({ title: "Personal template deleted" });
    },
    onError: (err: Error) => toast({ title: "Could not delete template", description: err.message, variant: "destructive" }),
  });
  const moveRunSheetItem = useMutation({
    mutationFn: async ({ itemId, direction }: { itemId: string; direction: "up" | "down" }) => {
      await apiRequest("POST", `/api/demos/${id}/run-sheet/${itemId}/move`, { direction });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/demos", id, "run-sheet"] }),
    onError: (err: Error) => toast({ title: "Could not reorder run sheet", description: err.message, variant: "destructive" }),
  });
  const removeRunSheetItem = useMutation({
    mutationFn: async (itemId: string) => apiRequest("DELETE", `/api/demos/${id}/run-sheet/${itemId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/demos", id, "run-sheet"] });
      toast({ title: "Pending stage removed" });
    },
    onError: (err: Error) => toast({ title: "Could not remove stage", description: err.message, variant: "destructive" }),
  });
  const transitionRunSheetItem = useMutation({
    mutationFn: async ({ itemId, transition }: { itemId: string; transition: "start" | "advance" | "skip" | "reopen" }) => {
      await apiRequest("POST", `/api/demos/${id}/run-sheet/${itemId}/transition`, { transition });
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/demos", id, "run-sheet"] });
      toast({
        title: variables.transition === "advance" ? "Stage completed; next stage is live" : variables.transition === "start" ? "Run sheet stage is live" : variables.transition === "skip" ? "Stage skipped" : "Stage reopened",
        description: "Connected participant screens update automatically.",
      });
    },
    onError: (err: Error) => {
      queryClient.invalidateQueries({ queryKey: ["/api/demos", id, "run-sheet"] });
      toast({ title: "Run sheet did not change", description: err.message, variant: "destructive" });
    },
  });
  const sendAnnouncement = useMutation({
    mutationFn: async ({ message, targetRole }: { message: string; targetRole: AnnouncementTargetRole }) => {
      await apiRequest("POST", `/api/demos/${id}/announcement`, { message, targetRole });
    },
    onSuccess: () => {
      setAnnouncementMessage("");
      toast({ title: "Announcement sent", description: "Only the selected audience will see this update." });
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
  const createPoll = useMutation({
    mutationFn: async ({ question, options }: { question: string; options: string[] }) => {
      await apiRequest("POST", `/api/demos/${id}/polls`, { question, options });
    },
    onSuccess: () => {
      setPollQuestion("");
      queryClient.invalidateQueries({ queryKey: ["/api/demos", id, "polls"] });
      toast({ title: "Live poll opened", description: "Participants can vote from the Help panel." });
    },
    onError: (err: Error) => {
      toast({ title: "Could not open poll", description: err.message, variant: "destructive" });
    },
  });
  const closePoll = useMutation({
    mutationFn: async (pollId: string) => {
      await apiRequest("PATCH", `/api/demos/${id}/polls/${pollId}`, { status: "closed" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/demos", id, "polls"] });
      toast({ title: "Live poll closed" });
    },
    onError: (err: Error) => {
      toast({ title: "Could not close poll", description: err.message, variant: "destructive" });
    },
  });
  const startSafetyCheck = useMutation({
    mutationFn: async ({ kind, message, instruction }: { kind: SafetyCheckKind; message: string; instruction: string }) => {
      await apiRequest("POST", `/api/demos/${id}/safety-checks`, { kind, message, instruction });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/demos", id, "safety-checks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/demos", id, "assistance"] });
      setIncidentError(null);
      toast({ title: "Incident notice activated", description: "It is now prominent on every connected participant screen." });
    },
    onError: (err: Error) => {
      setIncidentError("The incident notice was not activated. Check the connection and try again; participants have not received this draft.");
      toast({ title: "Could not activate incident notice", description: err.message, variant: "destructive" });
    },
  });
  const closeSafetyCheck = useMutation({
    mutationFn: async ({ checkId, resolutionMessage }: { checkId: string; resolutionMessage: string }) => {
      await apiRequest("PATCH", `/api/demos/${id}/safety-checks/${checkId}`, { status: "closed", resolutionMessage });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/demos", id, "safety-checks"] });
      setIncidentError(null);
      toast({ title: "All-clear sent", description: "Participants can see the resolution message now." });
    },
    onError: (err: Error) => {
      setIncidentError("The all-clear was not sent. Keep the incident open, check the connection, and try again.");
      toast({ title: "Could not send all-clear", description: err.message, variant: "destructive" });
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

  const liveController = data.liveControl.controller;
  const isLiveController = Boolean(currentUser?.id && liveController?.id === currentUser.id);
  const isEventOwner = Boolean(currentUser?.id && (data.demo.createdBy === currentUser.id || currentUser.role === "super_admin"));
  const liveOperationLocked = data.demo.status === "live" && !isLiveController;
  const handoffCandidates = data.admins.filter((admin) => admin.id !== currentUser?.id);

  const publicUrl = `${window.location.origin}/d/${data.demo.publicId}`;
  const offlinePreparationUrl = `${publicUrl}?offline=1`;
  const calendarDetails: CalendarEventDetails | null = data.demo.scheduledAt ? {
    title: data.demo.title,
    scheduledAt: data.demo.scheduledAt,
    durationMinutes: data.state?.eventDurationMinutes,
    location: data.demo.locationName,
    description: `ChantLive participant link: ${publicUrl}\nEvent code: ${data.demo.publicId}`,
    uid: `chantlive-${data.demo.publicId}@chantlive.online`,
  } : null;
  const googleCalendarUrl = calendarDetails ? buildGoogleCalendarUrl(calendarDetails) : null;
  const outlookCalendarUrl = calendarDetails ? buildOutlookCalendarUrl(calendarDetails) : null;
  const downloadCommandCalendar = () => {
    if (!calendarDetails) return;
    const downloaded = downloadCalendarFile(calendarDetails);
    toast({
      title: downloaded ? "Calendar invite downloaded" : "Could not create calendar invite",
      description: downloaded ? "Ready to send as a calendar attachment or offline fallback." : "Check the event date and try again.",
      variant: downloaded ? "default" : "destructive",
    });
  };
  const copyInvite = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: `${label} invite copied` });
    } catch {
      toast({ title: "Could not copy invite", description: "Copy the text manually from this card.", variant: "destructive" });
    }
  };
  const copyParticipantAccess = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: `${label} copied`, description: "Ready to share with participants." });
    } catch {
      toast({ title: `Could not copy ${label.toLowerCase()}`, description: "Select the value from the participant access card instead.", variant: "destructive" });
    }
  };
  const copyOfflinePreparationLink = async () => {
    try {
      await navigator.clipboard.writeText(offlinePreparationUrl);
      setOfflineLinkStatus("Preparation link copied. Send it before participants enter the low-signal area.");
      toast({ title: "Preparation link copied", description: "Ready to share before the event." });
    } catch {
      setOfflineLinkStatus("Copy is unavailable here. Select the preparation URL shown in this card and use your device's copy action.");
      toast({ title: "Could not copy preparation link", description: "Select the URL shown in this card instead.", variant: "destructive" });
    }
  };
  const openAssistance = assistance.filter((request) => request.status === "open");
  const conductReports = conductQueue?.reports ?? [];
  const visibleConductReports = conductReports.filter((report) => (
    conductFilter === "all" ||
    (conductFilter === "urgent" ? report.urgency === "urgent" && report.status !== "resolved" : report.status !== "resolved")
  ));
  const runSheetItems = runSheet?.items ?? [];
  const runSheetAllPending = runSheetItems.every((item) => item.status === "pending");
  const runSheetActive = runSheet?.summary.active ?? null;
  const programmeTemplates = runSheetTemplates?.templates ?? [];
  const personalProgrammeTemplates = programmeTemplates.filter((template) => template.source === "personal");
  const selectedProgrammeTemplate = programmeTemplates.find((template) => template.id === selectedRunSheetTemplateId) ?? programmeTemplates[0] ?? null;
  const templateResultCount = (runSheetTemplateMode === "append" ? runSheetItems.length : 0) + (selectedProgrammeTemplate?.stageCount ?? 0);
  const canApplyProgrammeTemplate = data.demo.status === "draft" && runSheetAllPending && Boolean(selectedProgrammeTemplate) && templateResultCount <= 40;
  const getRunSheetEstimate = (item: RunSheetItem) => {
    if (!data.demo.scheduledAt) return `${item.plannedDurationMinutes} min planned`;
    const precedingMinutes = runSheetItems
      .filter((candidate) => candidate.orderIndex < item.orderIndex)
      .reduce((total, candidate) => total + candidate.plannedDurationMinutes, 0);
    const estimate = new Date(new Date(data.demo.scheduledAt).getTime() + precedingMinutes * 60_000);
    return `${estimate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} estimate · ${item.plannedDurationMinutes} min`;
  };
  const openQuestions = audienceQuestions
    .filter((question) => question.status === "open")
    .sort((a, b) => b.votes - a.votes || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const activePoll = livePolls.find((poll) => poll.status === "open") ?? null;
  const activeSafetyCheck = safetyChecks.find((check) => check.status === "open") ?? null;
  const activeIncidentLabel = activeSafetyCheck
    ? incidentPresets.find((preset) => preset.kind === activeSafetyCheck.kind)?.label ?? "General disruption"
    : null;
  const awaitingIncidentResponse = activeSafetyCheck ? Math.max((checkIns?.total ?? 0) - activeSafetyCheck.totalResponses, 0) : 0;
  const readiness = [
    { label: "Chants", ready: data.chants.length > 0, detail: `${data.chants.length} prepared` },
    { label: "Backup admin", ready: data.admins.length > 1, detail: `${data.admins.length} admin${data.admins.length === 1 ? "" : "s"}` },
    { label: "Participant link", ready: Boolean(publicUrl), detail: "Available" },
    { label: "Logistics", ready: Boolean(data.demo.scheduledAt || data.demo.locationName || data.demo.meetingPoint), detail: data.demo.locationName || "Optional" },
    { label: "Support action", ready: Boolean(data.demo.supportUrl), detail: data.demo.supportUrl ? "Configured" : "Optional" },
    { label: "Live state", ready: data.demo.status === "live", detail: data.demo.status },
    { label: "Live operator", ready: data.demo.status !== "live" || Boolean(liveController), detail: liveController?.name ?? "Unclaimed" },
    { label: "Run sheet", ready: runSheetItems.length > 0, detail: runSheetItems.length > 0 ? `${runSheetItems.length} stages` : "Not planned" },
    { label: "Checked in", ready: (checkIns?.total ?? 0) > 0, detail: `${checkIns?.total ?? 0} people` },
    { label: "Feedback", ready: (feedback?.total ?? 0) > 0, detail: `${feedback?.total ?? 0} responses` },
    { label: "Engagement", ready: (engagement?.totalParticipants ?? 0) > 0, detail: `${engagement?.totalPoints ?? 0} points` },
    { label: "Live poll", ready: Boolean(activePoll), detail: activePoll ? `${activePoll.totalVotes} votes` : "None open" },
    { label: "Incident response", ready: !activeSafetyCheck || activeSafetyCheck.counts.need_help === 0, detail: activeSafetyCheck ? `${activeSafetyCheck.totalResponses} responses` : "None active" },
    { label: "Private concerns", ready: (conductQueue?.summary.open ?? 0) === 0, detail: `${(conductQueue?.summary.open ?? 0) + (conductQueue?.summary.acknowledged ?? 0)} active` },
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

          <Card className="mt-6 border-violet-500/30 bg-violet-500/5" data-testid="card-live-control-desk">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                {isLiveController ? <UserRoundCheck className="h-5 w-5 text-violet-700" aria-hidden="true" /> : <LockKeyhole className="h-5 w-5 text-violet-700" aria-hidden="true" />}
                Live control desk
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div role="status" aria-live="polite" data-testid="text-live-control-status">
                {data.demo.status !== "live" ? (
                  <p className="text-sm text-muted-foreground">Going live will automatically assign the launching organiser as the first operator.</p>
                ) : liveController ? (
                  <>
                    <p className="text-sm font-semibold">{isLiveController ? "You have live control" : `${liveController.name} has live control`}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {isLiveController
                        ? "Participant-facing chant, announcement, poll, help, and incident controls are enabled on this device."
                        : "This device is in read-only collaborator mode so the crowd receives one consistent sequence of updates."}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold">Live control is unclaimed</p>
                    <p className="mt-1 text-xs text-muted-foreground">Choose one operator before changing participant-facing state.</p>
                  </>
                )}
              </div>

              {data.demo.status === "live" && (
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div className="grid flex-1 gap-2 sm:grid-cols-2 lg:max-w-2xl">
                    {data.admins.map((admin) => {
                      const isOperator = liveController?.id === admin.id;
                      return (
                        <div key={admin.id} className="rounded-lg border bg-background p-3" data-testid={`live-control-admin-${admin.id}`}>
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{admin.name}</p>
                              <p className="truncate text-xs text-muted-foreground">{admin.eventRole === "owner" ? "Event owner" : "Event admin"}</p>
                            </div>
                            <Badge variant={isOperator ? "default" : "outline"}>{isOperator ? "Operator" : "Monitor"}</Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap lg:max-w-md lg:justify-end">
                    {isLiveController && handoffCandidates.length > 0 && (
                      <>
                        <label className="sr-only" htmlFor="live-control-handoff-target">Hand live control to</label>
                        <select
                          id="live-control-handoff-target"
                          value={handoffTargetUserId}
                          onChange={(event) => setHandoffTargetUserId(event.target.value)}
                          className="min-h-11 min-w-0 rounded-md border bg-background px-3 text-sm"
                          data-testid="select-live-control-handoff-target"
                        >
                          <option value="">Choose next operator</option>
                          {handoffCandidates.map((admin) => <option key={admin.id} value={admin.id}>{admin.name}</option>)}
                        </select>
                        <Button
                          className="min-h-11"
                          onClick={() => updateLiveControl.mutate({ action: "transfer", targetUserId: handoffTargetUserId })}
                          disabled={!handoffTargetUserId || updateLiveControl.isPending}
                          data-testid="button-transfer-live-control"
                        >
                          Hand over control
                        </Button>
                      </>
                    )}
                    {!isLiveController && (!liveController || isEventOwner) && (
                      <Button
                        className="min-h-11"
                        onClick={() => updateLiveControl.mutate({ action: "claim" })}
                        disabled={updateLiveControl.isPending}
                        data-testid="button-claim-live-control"
                      >
                        {liveController ? "Owner takeover" : "Claim live control"}
                      </Button>
                    )}
                    {isLiveController && (
                      <Button
                        className="min-h-11"
                        variant="outline"
                        onClick={() => updateLiveControl.mutate({ action: "release" })}
                        disabled={updateLiveControl.isPending}
                        data-testid="button-release-live-control"
                      >
                        Release control
                      </Button>
                    )}
                  </div>
                </div>
              )}
              {liveOperationLocked && (
                <p className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-950" data-testid="text-live-controls-locked">
                  Live actions below are locked on this device. You can still monitor participant status, questions, responses, and event readiness.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="mt-6 border-primary/30 bg-primary/5" data-testid="card-command-participant-access">
            <CardContent className="p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <QrCode className="h-4 w-4 text-primary" />
                    Participant access
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Read the code aloud when QR scanning or message links are unreliable.</p>
                  <p className="mt-3 font-mono text-2xl font-bold tracking-[0.2em]" data-testid="text-command-participant-code">{data.demo.publicId}</p>
                  <p className="mt-1 break-all text-xs text-muted-foreground">{publicUrl}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => copyParticipantAccess(data.demo.publicId, "Participant code")} data-testid="button-command-copy-code">
                    <Copy className="mr-1 h-4 w-4" />
                    Copy code
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => copyParticipantAccess(publicUrl, "Participant link")} data-testid="button-command-copy-link">
                    <Copy className="mr-1 h-4 w-4" />
                    Copy link
                  </Button>
                  <Button size="sm" asChild>
                    <a href={publicUrl} target="_blank" rel="noopener noreferrer" data-testid="link-command-open-participant">
                      Open participant page
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6 border-sky-500/30 bg-sky-500/5" data-testid="card-command-low-signal-readiness">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <WifiOff className="h-5 w-5 text-sky-600" aria-hidden="true" />
                Low-signal participant readiness
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Give participants this preparation link while they are online. It opens the event with a “Save for weak signal” action, keeps the latest verified chant on that device, and clearly marks offline information as potentially stale.
                  </p>
                  <ol className="mt-3 grid gap-2 text-sm sm:grid-cols-3" aria-label="Low-signal rehearsal steps">
                    <li className="rounded-lg border bg-background p-3"><span className="font-semibold">1. Open online</span><span className="mt-1 block text-xs text-muted-foreground">Open the preparation link on each participant device.</span></li>
                    <li className="rounded-lg border bg-background p-3"><span className="font-semibold">2. Save locally</span><span className="mt-1 block text-xs text-muted-foreground">Tap Save for weak signal after the event details appear.</span></li>
                    <li className="rounded-lg border bg-background p-3"><span className="font-semibold">3. Rehearse</span><span className="mt-1 block text-xs text-muted-foreground">Briefly disable signal, reload, and confirm the stale-copy warning appears.</span></li>
                  </ol>
                  <p className="mt-3 break-all rounded-md border bg-background p-3 font-mono text-xs" data-testid="text-command-offline-preparation-url">{offlinePreparationUrl}</p>
                </div>
                <div className="flex flex-wrap gap-2 lg:flex-col">
                  <Button className="min-h-11" variant="outline" onClick={copyOfflinePreparationLink} data-testid="button-command-copy-offline-link">
                    <Copy className="mr-1 h-4 w-4" />
                    Copy preparation link
                  </Button>
                  <Button className="min-h-11" asChild>
                    <a href={offlinePreparationUrl} target="_blank" rel="noopener noreferrer" data-testid="link-command-rehearse-offline">
                      Open rehearsal page
                    </a>
                  </Button>
                </div>
              </div>
              {offlineLinkStatus && (
                <p className="mt-3 text-sm text-muted-foreground" role="status" aria-live="polite" data-testid="text-command-offline-copy-status">
                  {offlineLinkStatus}
                </p>
              )}
              <p className="mt-4 text-xs text-muted-foreground">
                Privacy: the offline copy stays on that participant’s device and excludes messages, check-ins, questions, votes, safety responses, and feedback. Live instructions always replace it after reconnection.
              </p>
            </CardContent>
          </Card>

          <Card className="mt-6 border-sky-500/20 bg-sky-500/5" data-testid="card-command-calendar">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarPlus className="h-5 w-5 text-primary" />
                Event schedule and calendar
              </CardTitle>
            </CardHeader>
            <CardContent>
              {calendarDetails ? (
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="text-sm">
                    <p className="font-medium" data-testid="text-command-calendar-schedule">{formatCommandSchedule(data.demo.scheduledAt)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {data.state?.eventDurationMinutes ?? 300} minutes
                      {data.demo.locationName ? ` - ${data.demo.locationName}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {googleCalendarUrl && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={googleCalendarUrl} target="_blank" rel="noopener noreferrer" data-testid="link-command-google-calendar">Google</a>
                      </Button>
                    )}
                    {outlookCalendarUrl && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={outlookCalendarUrl} target="_blank" rel="noopener noreferrer" data-testid="link-command-outlook-calendar">Outlook</a>
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={downloadCommandCalendar} data-testid="button-command-download-calendar">
                      <Download className="mr-1 h-4 w-4" />
                      Download .ics
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <p className="text-sm text-muted-foreground">No event date is set, so calendar invitations are not ready yet.</p>
                  <Button variant="outline" size="sm" onClick={() => navigate(`/admin/demos/${id}`)} data-testid="button-command-set-schedule">
                    Set event schedule
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mt-6 border-indigo-500/30 bg-indigo-500/5" data-testid="card-command-run-sheet">
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center justify-between gap-3 text-base">
                <span className="flex items-center gap-2">
                  <ListOrdered className="h-5 w-5 text-indigo-700" aria-hidden="true" />
                  Live event run sheet
                </span>
                <span className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{runSheet?.summary.total ?? 0} stages</Badge>
                  <Badge variant="secondary">{runSheet?.summary.plannedDurationMinutes ?? 0} min planned</Badge>
                  <Badge variant={runSheetActive ? "default" : "outline"}>{runSheetActive ? "Stage live" : "No active stage"}</Badge>
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-indigo-500/20 bg-background p-3 text-sm" role="note">
                <p className="flex items-center gap-2 font-medium"><Database className="h-4 w-4" aria-hidden="true" /> Restart-safe event sequence</p>
                <p className="mt-1 text-xs text-muted-foreground">Plan the whole gathering, then progress one stage at a time. Participants can preview the public programme and receive live Now / Next guidance; the sequence survives deployments and reconnects.</p>
              </div>

              <section className="mt-4 rounded-xl border border-violet-500/30 bg-violet-500/5 p-4" aria-labelledby="programme-template-title" data-testid="panel-run-sheet-template-library">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 id="programme-template-title" className="flex items-center gap-2 font-semibold"><BookOpen className="h-4 w-4 text-violet-700" aria-hidden="true" /> Programme template library</h3>
                    <p className="mt-1 text-xs text-muted-foreground">Start from a field-ready plan or reuse a programme saved privately to your account.</p>
                  </div>
                  <Badge variant="outline">{personalProgrammeTemplates.length}/{runSheetTemplates?.limits.personal ?? 20} personal</Badge>
                </div>

                {runSheetTemplatesLoading && <p className="mt-4 rounded-lg border bg-background p-3 text-sm text-muted-foreground" role="status">Loading programme templates...</p>}
                {runSheetTemplatesError && (
                  <div className="mt-4 flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 sm:flex-row sm:items-center sm:justify-between" role="alert" data-testid="alert-run-sheet-template-error">
                    <p className="text-sm">Programme templates could not be loaded. Your current run sheet has not changed.</p>
                    <Button className="min-h-11" size="sm" variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/run-sheet-templates"] })}>Try again</Button>
                  </div>
                )}

                <div className="mt-4 grid gap-3 md:grid-cols-[minmax(220px,1fr)_180px_auto] md:items-end">
                  <label className="text-xs font-medium text-muted-foreground">
                    Programme template
                    <select
                      value={selectedRunSheetTemplateId}
                      onChange={(event) => setSelectedRunSheetTemplateId(event.target.value)}
                      className="mt-1 min-h-11 w-full rounded-md border bg-background px-3 text-sm text-foreground"
                      data-testid="select-run-sheet-template"
                    >
                      <optgroup label="Built-in programmes">
                        {programmeTemplates.filter((template) => template.source === "built-in").map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
                      </optgroup>
                      {personalProgrammeTemplates.length > 0 && (
                        <optgroup label="My programmes">
                          {personalProgrammeTemplates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
                        </optgroup>
                      )}
                    </select>
                  </label>
                  <label className="text-xs font-medium text-muted-foreground">
                    Apply behavior
                    <select
                      value={runSheetTemplateMode}
                      onChange={(event) => setRunSheetTemplateMode(event.target.value as "replace" | "append")}
                      className="mt-1 min-h-11 w-full rounded-md border bg-background px-3 text-sm text-foreground"
                      data-testid="select-run-sheet-template-mode"
                    >
                      <option value="replace">Replace current stages</option>
                      <option value="append">Append after current stages</option>
                    </select>
                  </label>
                  <Button
                    className="min-h-11"
                    disabled={!canApplyProgrammeTemplate || applyRunSheetTemplate.isPending}
                    onClick={() => applyRunSheetTemplate.mutate()}
                    data-testid="button-apply-run-sheet-template"
                  >
                    <BookOpen className="mr-2 h-4 w-4" aria-hidden="true" /> {applyRunSheetTemplate.isPending ? "Applying..." : "Apply template"}
                  </Button>
                </div>

                {selectedProgrammeTemplate && (
                  <div className="mt-4 rounded-lg border bg-background p-3" data-testid="preview-run-sheet-template">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{selectedProgrammeTemplate.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{selectedProgrammeTemplate.description || "A programme saved from one of your events."}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{selectedProgrammeTemplate.stageCount} stages · {selectedProgrammeTemplate.plannedDurationMinutes} min</span>
                    </div>
                    <ol className="mt-3 grid gap-2 sm:grid-cols-2" aria-label={`${selectedProgrammeTemplate.name} preview`}>
                      {selectedProgrammeTemplate.stages.map((stage, index) => (
                        <li key={`${stage.title}-${index}`} className="rounded-md border px-3 py-2 text-xs">
                          <span className="font-semibold">{index + 1}. {stage.title}</span>
                          <span className="mt-1 block text-muted-foreground">{stage.plannedDurationMinutes} min · {stage.kind}</span>
                        </li>
                      ))}
                    </ol>
                    <p className={`mt-3 text-xs ${templateResultCount > 40 || !runSheetAllPending || data.demo.status !== "draft" ? "text-amber-800" : "text-muted-foreground"}`} role="status" aria-live="polite" data-testid="text-run-sheet-template-impact">
                      {data.demo.status !== "draft"
                        ? "Templates can be applied only while the event is a draft. You can still save this delivered programme for reuse."
                        : !runSheetAllPending
                          ? "This programme has already started. Apply templates to a new draft or before starting stage one."
                          : templateResultCount > 40
                            ? `This would create ${templateResultCount} stages, above the 40-stage safety limit.`
                            : runSheetTemplateMode === "replace"
                              ? `Applying will replace ${runSheetItems.length} current stage${runSheetItems.length === 1 ? "" : "s"} with ${selectedProgrammeTemplate.stageCount} previewed stages.`
                              : `Applying will retain ${runSheetItems.length} current stage${runSheetItems.length === 1 ? "" : "s"} and create ${templateResultCount} stages in total.`}
                    </p>
                  </div>
                )}

                {runSheetItems.length > 0 && (
                  <div className="mt-4 border-t pt-4">
                    <h4 className="flex items-center gap-2 text-sm font-semibold"><Save className="h-4 w-4" aria-hidden="true" /> Save this programme for another event</h4>
                    <div className="mt-3 grid gap-3 md:grid-cols-[minmax(180px,0.8fr)_minmax(240px,1.2fr)_auto] md:items-end">
                      <label className="text-xs font-medium text-muted-foreground">
                        Template name
                        <input value={runSheetTemplateName} onChange={(event) => setRunSheetTemplateName(event.target.value)} maxLength={80} placeholder="Example: Annual community march" className="mt-1 min-h-11 w-full rounded-md border bg-background px-3 text-sm text-foreground" data-testid="input-run-sheet-template-name" />
                      </label>
                      <label className="text-xs font-medium text-muted-foreground">
                        Reuse note (optional)
                        <input value={runSheetTemplateDescription} onChange={(event) => setRunSheetTemplateDescription(event.target.value)} maxLength={240} placeholder="When this programme works best" className="mt-1 min-h-11 w-full rounded-md border bg-background px-3 text-sm text-foreground" data-testid="input-run-sheet-template-description" />
                      </label>
                      <Button className="min-h-11" variant="outline" disabled={runSheetTemplateName.trim().length < 3 || saveRunSheetTemplate.isPending || personalProgrammeTemplates.length >= (runSheetTemplates?.limits.personal ?? 20)} onClick={() => saveRunSheetTemplate.mutate()} data-testid="button-save-run-sheet-template">
                        <Save className="mr-2 h-4 w-4" aria-hidden="true" /> {saveRunSheetTemplate.isPending ? "Saving..." : "Save to library"}
                      </Button>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">Only stage titles, public participant guidance, types, and planned durations are saved. Live status and actual timings are never copied.</p>
                  </div>
                )}

                {personalProgrammeTemplates.length > 0 && (
                  <div className="mt-4 border-t pt-4" data-testid="list-personal-run-sheet-templates">
                    <h4 className="text-sm font-semibold">My saved programmes</h4>
                    <ul className="mt-2 grid gap-2">
                      {personalProgrammeTemplates.map((template) => (
                        <li key={template.id} className="flex flex-col gap-2 rounded-lg border bg-background p-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-medium">{template.name}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{template.stageCount} stages · {template.plannedDurationMinutes} min{template.description ? ` · ${template.description}` : ""}</p>
                          </div>
                          {templateDeleteConfirmationId === template.id ? (
                            <div className="flex flex-wrap gap-2" role="group" aria-label={`Confirm deletion of ${template.name}`}>
                              <Button className="min-h-11" size="sm" variant="destructive" disabled={deleteRunSheetTemplate.isPending} onClick={() => deleteRunSheetTemplate.mutate(template.id)} data-testid={`button-confirm-delete-template-${template.id}`}>Confirm delete</Button>
                              <Button className="min-h-11" size="sm" variant="outline" onClick={() => setTemplateDeleteConfirmationId(null)}>Cancel</Button>
                            </div>
                          ) : (
                            <Button className="min-h-11" size="sm" variant="outline" onClick={() => setTemplateDeleteConfirmationId(template.id)} data-testid={`button-delete-template-${template.id}`}><Trash2 className="mr-2 h-4 w-4" aria-hidden="true" /> Delete</Button>
                          )}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 text-xs text-muted-foreground">Deleting a template never changes events that already used it.</p>
                  </div>
                )}
              </section>

              {data.demo.status !== "ended" && (
                <fieldset className="mt-4 rounded-xl border bg-background p-4" disabled={liveOperationLocked || createRunSheetItem.isPending}>
                  <legend className="px-1 text-sm font-semibold">Add a stage</legend>
                  <div className="grid gap-3 md:grid-cols-[minmax(140px,0.8fr)_minmax(220px,1.4fr)_120px]">
                    <label className="text-xs font-medium text-muted-foreground">
                      Stage type
                      <select
                        value={runSheetKind}
                        onChange={(event) => {
                          const kind = event.target.value as RunSheetItemKind;
                          const preset = runSheetPresets.find((item) => item.kind === kind) ?? runSheetPresets[7];
                          setRunSheetKind(kind);
                          setRunSheetTitle(preset.title);
                          setRunSheetNote(preset.note);
                          setRunSheetDuration(preset.duration);
                        }}
                        className="mt-1 min-h-11 w-full rounded-md border bg-background px-3 text-sm text-foreground"
                        data-testid="select-run-sheet-kind"
                      >
                        {runSheetPresets.map((preset) => <option key={preset.kind} value={preset.kind}>{preset.label}</option>)}
                      </select>
                    </label>
                    <label className="text-xs font-medium text-muted-foreground">
                      Stage title
                      <input
                        value={runSheetTitle}
                        onChange={(event) => setRunSheetTitle(event.target.value)}
                        maxLength={100}
                        className="mt-1 min-h-11 w-full rounded-md border bg-background px-3 text-sm text-foreground"
                        placeholder="Example: Main speaker and crowd response"
                        data-testid="input-run-sheet-title"
                      />
                    </label>
                    <label className="text-xs font-medium text-muted-foreground">
                      Planned minutes
                      <input
                        type="number"
                        min={1}
                        max={180}
                        value={runSheetDuration}
                        onChange={(event) => setRunSheetDuration(Number.parseInt(event.target.value, 10) || 0)}
                        className="mt-1 min-h-11 w-full rounded-md border bg-background px-3 text-sm text-foreground"
                        data-testid="input-run-sheet-duration"
                      />
                    </label>
                  </div>
                  <label className="mt-3 block text-xs font-medium text-muted-foreground">
                    Participant guidance
                    <Textarea
                      value={runSheetNote}
                      onChange={(event) => setRunSheetNote(event.target.value)}
                      rows={2}
                      maxLength={240}
                      placeholder="What should participants know or do during this stage?"
                      className="mt-1"
                      data-testid="input-run-sheet-note"
                    />
                  </label>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">{runSheetNote.length}/240 · participant-facing</p>
                    <Button
                      className="min-h-11"
                      onClick={() => createRunSheetItem.mutate()}
                      disabled={runSheetTitle.trim().length < 3 || runSheetDuration < 1 || runSheetDuration > 180}
                      data-testid="button-add-run-sheet-item"
                    >
                      <Plus className="mr-2 h-4 w-4" aria-hidden="true" /> Add stage
                    </Button>
                  </div>
                </fieldset>
              )}

              {runSheetItems.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed bg-background p-6 text-center" data-testid="text-run-sheet-empty">
                  <p className="font-medium">No event sequence yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">Add arrival, welcome, chant, speaker, movement, break, and closing stages so the whole team shares one operational plan.</p>
                </div>
              ) : (
                <div className="mt-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground" role="status" aria-live="polite">
                    <span>{runSheet?.summary.completed ?? 0} completed · {runSheet?.summary.skipped ?? 0} skipped · {runSheet?.summary.pending ?? 0} pending</span>
                    <span>{runSheetAllPending ? "Reordering is available before the first stage starts." : "Live progress is protected from accidental reordering."}</span>
                  </div>
                  <ol className="grid gap-3" aria-label="Event run sheet stages">
                    {runSheetItems.map((item, index) => {
                      const isCurrent = item.status === "active";
                      const isNext = item.id === runSheet?.summary.next?.id;
                      const transitionPending = transitionRunSheetItem.isPending;
                      return (
                        <li key={item.id} className={`rounded-xl border bg-background p-4 ${isCurrent ? "border-indigo-500 ring-2 ring-indigo-500/20" : ""}`} data-testid={`card-run-sheet-item-${item.id}`}>
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-indigo-500/10 px-2 text-xs font-bold text-indigo-800">{index + 1}</span>
                                <p className="font-semibold">{item.title}</p>
                                <Badge variant={isCurrent ? "default" : item.status === "completed" ? "secondary" : item.status === "skipped" ? "outline" : "secondary"}>{isCurrent ? "Now" : isNext ? "Next" : item.status}</Badge>
                                <Badge variant="outline" className="capitalize">{item.kind}</Badge>
                              </div>
                              <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="h-3.5 w-3.5" aria-hidden="true" /> {getRunSheetEstimate(item)}{item.actualDurationMinutes !== null ? ` · ${item.actualDurationMinutes} min actual` : ""}</p>
                              <p className="mt-2 text-sm text-muted-foreground">{item.participantNote || "No participant guidance for this stage."}</p>
                            </div>
                            <div className="flex flex-wrap gap-2 lg:max-w-md lg:justify-end">
                              {runSheetAllPending && item.status === "pending" && (
                                <>
                                  <Button className="min-h-11 min-w-11" size="sm" variant="outline" aria-label={`Move ${item.title} earlier`} disabled={index === 0 || moveRunSheetItem.isPending} onClick={() => moveRunSheetItem.mutate({ itemId: item.id, direction: "up" })} data-testid={`button-run-sheet-up-${item.id}`}><ArrowUp className="h-4 w-4" /></Button>
                                  <Button className="min-h-11 min-w-11" size="sm" variant="outline" aria-label={`Move ${item.title} later`} disabled={index === runSheetItems.length - 1 || moveRunSheetItem.isPending} onClick={() => moveRunSheetItem.mutate({ itemId: item.id, direction: "down" })} data-testid={`button-run-sheet-down-${item.id}`}><ArrowDown className="h-4 w-4" /></Button>
                                  <Button className="min-h-11 min-w-11" size="sm" variant="outline" aria-label={`Remove ${item.title}`} disabled={removeRunSheetItem.isPending} onClick={() => removeRunSheetItem.mutate(item.id)} data-testid={`button-run-sheet-delete-${item.id}`}><Trash2 className="h-4 w-4" /></Button>
                                </>
                              )}
                              {data.demo.status === "live" && isNext && !runSheetActive && (
                                <Button className="min-h-11" size="sm" disabled={liveOperationLocked || transitionPending} onClick={() => transitionRunSheetItem.mutate({ itemId: item.id, transition: "start" })} data-testid={`button-run-sheet-start-${item.id}`}><Play className="mr-2 h-4 w-4" /> Start stage</Button>
                              )}
                              {data.demo.status === "live" && isCurrent && (
                                <>
                                  <Button className="min-h-11" size="sm" disabled={liveOperationLocked || transitionPending} onClick={() => transitionRunSheetItem.mutate({ itemId: item.id, transition: "advance" })} data-testid={`button-run-sheet-advance-${item.id}`}><CheckCircle2 className="mr-2 h-4 w-4" /> Complete &amp; next</Button>
                                  <Button className="min-h-11" size="sm" variant="outline" disabled={liveOperationLocked || transitionPending} onClick={() => transitionRunSheetItem.mutate({ itemId: item.id, transition: "skip" })} data-testid={`button-run-sheet-skip-${item.id}`}><SkipForward className="mr-2 h-4 w-4" /> Skip</Button>
                                </>
                              )}
                              {data.demo.status === "live" && (item.status === "completed" || item.status === "skipped") && (
                                <Button className="min-h-11" size="sm" variant="outline" disabled={liveOperationLocked || transitionPending} onClick={() => transitionRunSheetItem.mutate({ itemId: item.id, transition: "reopen" })} data-testid={`button-run-sheet-reopen-${item.id}`}><RotateCcw className="mr-2 h-4 w-4" /> Reopen</Button>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                  {data.demo.status !== "live" && data.demo.status !== "ended" && (
                    <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-950">The sequence is ready to edit. Go live when the operator is ready to start the first stage.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="mt-6 grid gap-4 md:grid-cols-10">
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
              <p><span className="font-medium text-foreground">When:</span> {formatCommandSchedule(data.demo.scheduledAt)}</p>
              <p><span className="font-medium text-foreground">Where:</span> {data.demo.locationName || "Not set"}</p>
              <p><span className="font-medium text-foreground">Current chant:</span> {currentChant ? currentChant.callText || "Chant selected" : "None"}</p>
              <p className="break-all"><span className="font-medium text-foreground">Participant link:</span> {publicUrl}</p>
              <p><span className="font-medium text-foreground">Meeting point:</span> {data.demo.meetingPoint || "Not set"}</p>
            </CardContent>
          </Card>

          <Card className="mt-6 border-emerald-500/20 bg-emerald-500/5" data-testid="card-command-support-action">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ExternalLink className="h-5 w-5 text-primary" />
                Participant support action
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.demo.supportUrl ? (
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-medium">{data.demo.supportLabel || "Support this event"}</p>
                    <p className="mt-1 break-all text-xs text-muted-foreground">{data.demo.supportUrl}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Participants see this action on the live page, waiting page, ended page, and printable handout.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyInvite([
                        `Support ${data.demo.title}:`,
                        `${data.demo.supportLabel || "Support this event"}: ${data.demo.supportUrl}`,
                        "",
                        `Participant page: ${publicUrl}`,
                      ].join("\n"), "Support action")}
                      data-testid="button-copy-command-support-action"
                    >
                      Copy message
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <a href={data.demo.supportUrl} target="_blank" rel="noopener noreferrer" data-testid="link-command-support-action">
                        Open link
                      </a>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <p className="text-sm text-muted-foreground">
                    No support action is configured. Add one from Control event if this gathering needs a donation, volunteer, petition, or campaign follow-up link.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => navigate(`/admin/demos/${id}`)} data-testid="button-command-add-support-action">
                    Add action
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mt-6 border-sky-500/20 bg-sky-500/5" data-testid="card-multilingual-access">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Share2 className="h-5 w-5 text-primary" />
                Multilingual participant access
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Participants can choose English, Spanish, French, Arabic, or Persian from the participant page. Copy a ready-to-send invite in the language a group needs.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {multilingualInviteTemplates.map((template) => {
                  const text = template.getText(publicUrl);
                  return (
                    <div key={template.label} className="rounded-lg border bg-background p-3" data-testid={`card-multilingual-invite-${template.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold">{template.label}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyInvite(text, template.label)}
                          data-testid={`button-copy-multilingual-invite-${template.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                        >
                          Copy
                        </Button>
                      </div>
                      <p className="mt-2 line-clamp-3 whitespace-pre-line text-xs text-muted-foreground">{text}</p>
                    </div>
                  );
                })}
              </div>
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

          <Card className="mt-6" data-testid="card-participant-feedback-summary">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-3 text-base">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  Participant feedback
                </span>
                <Badge variant={(feedback?.total ?? 0) > 0 ? "default" : "secondary"}>
                  {feedback?.total ?? 0} responses
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 text-sm sm:grid-cols-3">
                {[
                  ["Clarity", feedback?.averages.clarity ?? 0],
                  ["Safety", feedback?.averages.safety ?? 0],
                  ["Accessibility", feedback?.averages.accessibility ?? 0],
                ].map(([label, score]) => (
                  <div key={label} className="rounded-lg border bg-background p-3">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="mt-1 text-2xl font-bold">{score}/5</p>
                  </div>
                ))}
              </div>
              {(feedback?.comments.length ?? 0) > 0 ? (
                <div className="mt-4 grid gap-2 md:grid-cols-2">
                  {feedback?.comments.slice(0, 4).map((item) => (
                    <div key={`${item.participantLabel}-${item.updatedAt}`} className="rounded-lg border bg-background p-3">
                      <p className="text-sm text-muted-foreground">{item.comment}</p>
                      <p className="mt-2 text-xs text-muted-foreground">{item.participantLabel}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground" data-testid="text-no-participant-feedback">
                  No participant feedback yet. Participants can rate the event from Help or after the event ends.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="mt-6" data-testid="card-engagement-leaderboard">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-3 text-base">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  Participation leaderboard
                </span>
                <Badge variant={(engagement?.totalParticipants ?? 0) > 0 ? "default" : "secondary"}>
                  {engagement?.totalPoints ?? 0} points
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(engagement?.topParticipants.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground" data-testid="text-no-engagement">
                  No participation points yet. Participants earn points for checking in, pulse signals, questions, upvotes, help requests, and feedback.
                </p>
              ) : (
                <div className="grid gap-2 md:grid-cols-2">
                  {engagement?.topParticipants.slice(0, 6).map((participant, index) => (
                    <div key={`${participant.participantLabel}-${participant.updatedAt}`} className="rounded-lg border bg-background p-3" data-testid={`card-engagement-participant-${index + 1}`}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium">#{index + 1} {participant.participantLabel}</p>
                        <Badge variant="outline">{participant.points} pts</Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {participant.badges.length > 0 ? participant.badges.map((badge) => (
                          <span key={badge} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                            {badge}
                          </span>
                        )) : (
                          <span className="text-xs text-muted-foreground">No badges yet</span>
                        )}
                      </div>
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
                <div className="space-y-1">
                  <label htmlFor="announcement-target" className="text-xs font-medium text-muted-foreground">
                    Audience
                  </label>
                  <select
                    id="announcement-target"
                    value={announcementTarget}
                    onChange={(event) => setAnnouncementTarget(event.target.value as AnnouncementTargetRole)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    data-testid="select-announcement-target"
                  >
                    {Object.entries(announcementAudienceLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Role-targeted messages are shown to participants who checked in with that role.
                  </p>
                  <p
                    className="rounded-md border border-sky-500/20 bg-sky-500/5 px-3 py-2 text-xs text-foreground"
                    role="status"
                    aria-live="polite"
                    data-testid="text-announcement-audience-preview"
                  >
                    Delivery preview: <strong>{announcementAudienceLabels[announcementTarget]}</strong> will see this update.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-end justify-between gap-2">
                    <p className="text-xs font-medium text-muted-foreground">Quick announcement starters</p>
                    <label htmlFor="announcement-language" className="text-xs font-medium text-muted-foreground">
                      Message language
                      <select
                        id="announcement-language"
                        value={announcementLanguage}
                        onChange={(event) => changeAnnouncementLanguage(event.target.value as AnnouncementLanguage)}
                        className="ml-2 rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground"
                        data-testid="select-announcement-language"
                      >
                        {announcementLanguageOptions.map((option) => (
                          <option key={option.code} value={option.code}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-2" dir={announcementDirection} aria-label="Quick announcement starters">
                    {announcementStarters.map((starter) => {
                      const message = starter.messages[announcementLanguage];
                      const selected = announcementMessage === message && announcementTarget === starter.targetRole;
                      return (
                        <Button
                          key={starter.id}
                          type="button"
                          size="sm"
                          variant={selected ? "secondary" : "outline"}
                          className="h-8 text-xs"
                          onClick={() => {
                            setAnnouncementMessage(message);
                            setAnnouncementTarget(starter.targetRole);
                          }}
                          aria-pressed={selected}
                          data-testid={`button-announcement-starter-${starter.id}`}
                        >
                          {starter.labels[announcementLanguage]}
                        </Button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">Starters fill the draft and audience only. Review the message before sending.</p>
                </div>
                <Textarea
                  value={announcementMessage}
                  onChange={(event) => setAnnouncementMessage(event.target.value)}
                  placeholder={announcementPlaceholders[announcementLanguage]}
                  dir={announcementDirection}
                  rows={3}
                  maxLength={180}
                  data-testid="input-announcement-message"
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">{announcementMessage.length}/180 characters</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setAnnouncementMessage("")}
                      disabled={!announcementMessage || sendAnnouncement.isPending}
                      data-testid="button-clear-announcement"
                    >
                      Clear draft
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => sendAnnouncement.mutate({ message: announcementMessage.trim(), targetRole: announcementTarget })}
                      disabled={liveOperationLocked || !announcementMessage.trim() || sendAnnouncement.isPending}
                      data-testid="button-send-announcement"
                    >
                      Send update
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6 border-emerald-500/20 bg-emerald-500/5" data-testid="card-live-poll">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-3 text-base">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  Live crowd poll
                </span>
                <Badge variant={activePoll ? "default" : "secondary"}>
                  {activePoll ? `${activePoll.totalVotes} votes` : "No active poll"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
              <div className="space-y-3">
                <div>
                  <label htmlFor="poll-question" className="text-xs font-medium text-muted-foreground">
                    Decision question
                  </label>
                  <Textarea
                    id="poll-question"
                    value={pollQuestion}
                    onChange={(event) => setPollQuestion(event.target.value)}
                    placeholder="Example: Should we repeat the current chant one more time?"
                    rows={2}
                    maxLength={160}
                    data-testid="input-live-poll-question"
                  />
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {pollOptions.map((option, index) => (
                    <label key={index} className="text-xs font-medium text-muted-foreground">
                      Option {index + 1}
                      <input
                        value={option}
                        onChange={(event) => setPollOptions((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))}
                        maxLength={48}
                        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                        data-testid={`input-live-poll-option-${index + 1}`}
                      />
                    </label>
                  ))}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    Opening a new poll automatically closes the previous open poll.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => createPoll.mutate({ question: pollQuestion.trim(), options: pollOptions.map((option) => option.trim()).filter(Boolean) })}
                    disabled={liveOperationLocked || !pollQuestion.trim() || pollOptions.map((option) => option.trim()).filter(Boolean).length < 2 || createPoll.isPending}
                    data-testid="button-open-live-poll"
                  >
                    Open live poll
                  </Button>
                </div>
              </div>
              <div className="rounded-xl border bg-background p-4">
                {activePoll ? (
                  <div data-testid="panel-active-live-poll">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold">{activePoll.question}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Opened {new Date(activePoll.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => closePoll.mutate(activePoll.id)}
                        disabled={liveOperationLocked || closePoll.isPending}
                        data-testid="button-close-live-poll"
                      >
                        Close poll
                      </Button>
                    </div>
                    <div className="mt-4 space-y-3">
                      {activePoll.options.map((option) => {
                        const percent = activePoll.totalVotes > 0 ? Math.round((option.votes / activePoll.totalVotes) * 100) : 0;
                        return (
                          <div key={option.id}>
                            <div className="flex items-center justify-between gap-3 text-sm">
                              <span className="font-medium">{option.label}</span>
                              <span className="text-muted-foreground">{option.votes} votes - {percent}%</span>
                            </div>
                            <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                              <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div data-testid="text-no-live-poll">
                    <p className="text-sm font-medium">No live poll is open.</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Use polls for quick event-day decisions like repeating a chant, slowing down, changing location, or checking readiness.
                    </p>
                    {livePolls[0] && (
                      <p className="mt-3 text-xs text-muted-foreground">
                        Last poll: {livePolls[0].question} ({livePolls[0].totalVotes} votes)
                      </p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6 border-red-500/30 bg-red-500/5" data-testid="card-incident-response">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-3 text-base">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-red-600" />
                  Live incident response
                </span>
                <Badge variant={activeSafetyCheck ? "default" : "secondary"}>
                  {activeSafetyCheck ? `${activeSafetyCheck.totalResponses} responses` : "No active incident"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5 lg:grid-cols-[1.05fr_1.2fr]">
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Incident starter</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-label="Incident starters">
                    {incidentPresets.map((preset) => (
                      <Button
                        key={preset.kind}
                        type="button"
                        variant={safetyCheckKind === preset.kind ? "default" : "outline"}
                        size="sm"
                        className="min-h-11 whitespace-normal text-start"
                        onClick={() => applyIncidentPreset(preset)}
                        disabled={Boolean(activeSafetyCheck)}
                        aria-pressed={safetyCheckKind === preset.kind}
                        data-testid={`button-incident-preset-${preset.kind}`}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <label htmlFor="safety-check-message" className="text-xs font-medium text-muted-foreground">
                    Participant headline
                  </label>
                  <Textarea
                    id="safety-check-message"
                    value={safetyCheckMessage}
                    onChange={(event) => setSafetyCheckMessage(event.target.value)}
                    rows={2}
                    maxLength={120}
                    disabled={Boolean(activeSafetyCheck)}
                    data-testid="input-safety-check-message"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">{safetyCheckMessage.length}/120</p>
                </div>
                <div>
                  <label htmlFor="safety-check-instruction" className="text-xs font-medium text-muted-foreground">
                    What participants should do now
                  </label>
                  <Textarea
                    id="safety-check-instruction"
                    value={safetyCheckInstruction}
                    onChange={(event) => setSafetyCheckInstruction(event.target.value)}
                    rows={3}
                    maxLength={240}
                    disabled={Boolean(activeSafetyCheck)}
                    data-testid="input-incident-instruction"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">{safetyCheckInstruction.length}/240</p>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">Activating this places an assertive notice directly on participant screens. It does not contact emergency services.</p>
                  <Button
                    onClick={() => startSafetyCheck.mutate({ kind: safetyCheckKind, message: safetyCheckMessage.trim(), instruction: safetyCheckInstruction.trim() })}
                    disabled={liveOperationLocked || !safetyCheckMessage.trim() || !safetyCheckInstruction.trim() || startSafetyCheck.isPending || Boolean(activeSafetyCheck)}
                    data-testid="button-activate-incident"
                  >
                    Activate incident notice
                  </Button>
                </div>
                {incidentError && <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive" role="alert" data-testid="text-incident-error">{incidentError}</p>}
              </div>
              <div className="rounded-xl border bg-background p-4">
                {activeSafetyCheck ? (
                  <div data-testid="panel-active-incident">
                    <div className="mb-4 flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm" role="status" data-testid="status-incident-continuity">
                      <Database className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
                      <div>
                        <p className="font-medium text-emerald-900 dark:text-emerald-100">Continuity protected</p>
                        <p className="mt-1 text-xs text-muted-foreground">This notice, participant responses, and help requests are saved on the server and recover after a restart.</p>
                      </div>
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="destructive">{activeIncidentLabel}</Badge>
                        <span className="text-xs text-muted-foreground">Started {new Date(activeSafetyCheck.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      <p className="mt-3 text-base font-semibold">{activeSafetyCheck.message}</p>
                      <p className="mt-2 rounded-lg border bg-card p-3 text-sm" data-testid="text-command-incident-instruction">{activeSafetyCheck.instruction}</p>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
                      {[
                        ["OK", activeSafetyCheck.counts.ok],
                        ["Need help", activeSafetyCheck.counts.need_help],
                        ["Leaving", activeSafetyCheck.counts.leaving],
                        ["Not sure", activeSafetyCheck.counts.not_sure],
                        ["No response", awaitingIncidentResponse],
                      ].map(([label, count]) => (
                        <div key={label} className="rounded-lg border bg-card p-3" data-testid={`metric-incident-${String(label).toLowerCase().replace(" ", "-")}`}>
                          <p className="text-xs text-muted-foreground">{label}</p>
                          <p className="mt-1 text-2xl font-bold">{count}</p>
                        </div>
                      ))}
                    </div>
                    {activeSafetyCheck.needsAttention.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-red-600">Needs organiser attention</p>
                        {activeSafetyCheck.needsAttention.map((item) => (
                          <div key={`${item.participantLabel}-${item.updatedAt}`} className="rounded-lg border bg-card p-3 text-sm">
                            <p className="font-medium">{item.participantLabel}: {item.response === "need_help" ? "Needs help" : "Not sure"}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{item.note || "No note provided."}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="mt-5 border-t pt-4">
                      <label htmlFor="incident-all-clear" className="text-xs font-medium text-muted-foreground">All-clear message</label>
                      <Textarea
                        id="incident-all-clear"
                        value={incidentAllClear}
                        onChange={(event) => setIncidentAllClear(event.target.value)}
                        rows={3}
                        maxLength={180}
                        data-testid="input-incident-all-clear"
                      />
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs text-muted-foreground">{incidentAllClear.length}/180 · Participants see this immediately and after reconnecting.</p>
                        <Button
                          variant="outline"
                          onClick={() => closeSafetyCheck.mutate({ checkId: activeSafetyCheck.id, resolutionMessage: incidentAllClear.trim() })}
                          disabled={liveOperationLocked || !incidentAllClear.trim() || closeSafetyCheck.isPending}
                          data-testid="button-send-incident-all-clear"
                        >
                          Send all-clear
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div data-testid="text-no-active-incident">
                    <p className="text-sm font-medium">No incident notice is active.</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Choose a starter, review both fields, and activate only when participants need an immediate interruption and roll call.
                    </p>
                    {safetyChecks[0] && (
                      <div className="mt-3 rounded-lg border bg-card p-3 text-sm" data-testid="text-last-incident-result">
                        <p className="font-medium">Last incident: {safetyChecks[0].totalResponses} responses, {safetyChecks[0].counts.need_help} needed help.</p>
                        {safetyChecks[0].resolutionMessage && <p className="mt-1 text-xs text-muted-foreground">All-clear: {safetyChecks[0].resolutionMessage}</p>}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <section className="border-t pt-4 lg:col-span-2" aria-labelledby="incident-history-title" data-testid="panel-incident-history">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 id="incident-history-title" className="flex items-center gap-2 text-sm font-semibold">
                    <History className="h-4 w-4 text-red-600" aria-hidden="true" />
                    Server-saved incident history
                  </h3>
                  <span className="text-xs text-muted-foreground">Latest {Math.min(safetyChecks.length, 5)} of {safetyChecks.length}</span>
                </div>
                {safetyChecks.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">No incident history yet. Activated notices and all-clears will be retained here through deployments and restarts.</p>
                ) : (
                  <ol className="mt-3 grid gap-3 md:grid-cols-2">
                    {safetyChecks.slice(0, 5).map((check) => (
                      <li key={check.id} className="rounded-lg border bg-background p-3" data-testid={`history-incident-${check.id}`}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm font-medium">{incidentPresets.find((preset) => preset.kind === check.kind)?.label ?? "General disruption"}</span>
                          <Badge variant={check.status === "open" ? "destructive" : "secondary"}>{check.status === "open" ? "Active" : "All-clear sent"}</Badge>
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{check.message}</p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {check.totalResponses} responses · {check.counts.need_help} needed help · Started {new Date(check.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                        </p>
                        {check.closedAt && <p className="mt-1 text-xs text-muted-foreground">Resolved {new Date(check.closedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</p>}
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </CardContent>
          </Card>

          <Card className="mt-6 border-violet-500/30 bg-violet-500/5" data-testid="card-conduct-moderation-desk">
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center justify-between gap-3 text-base">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-violet-700" aria-hidden="true" />
                  Private conduct concern desk
                </span>
                <span className="flex flex-wrap gap-2">
                  <Badge variant={(conductQueue?.summary.activeUrgent ?? 0) > 0 ? "destructive" : "secondary"}>{conductQueue?.summary.activeUrgent ?? 0} urgent</Badge>
                  <Badge variant={(conductQueue?.summary.open ?? 0) > 0 ? "default" : "secondary"}>{conductQueue?.summary.open ?? 0} unseen</Badge>
                  <Badge variant="secondary">{conductQueue?.summary.acknowledged ?? 0} acknowledged</Badge>
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-violet-500/20 bg-background p-3 text-sm" role="note">
                <p className="font-medium">Sensitive and private</p>
                <p className="mt-1 text-xs text-muted-foreground">Only verified event organisers can read these reports. Do not copy identifying details into public announcements or the post-event summary.</p>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2" aria-label="Filter private conduct concerns">
                  {(["active", "urgent", "all"] as const).map((filter) => (
                    <Button key={filter} type="button" size="sm" variant={conductFilter === filter ? "default" : "outline"} aria-pressed={conductFilter === filter} onClick={() => setConductFilter(filter)} data-testid={`button-conduct-filter-${filter}`}>
                      {filter === "active" ? "Active" : filter === "urgent" ? "Urgent" : "All reports"}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">{visibleConductReports.length} shown · {conductQueue?.summary.total ?? 0} total</p>
              </div>
              {visibleConductReports.length === 0 ? (
                <div className="mt-4" data-testid="text-no-conduct-reports">
                  <p className="text-sm text-muted-foreground">No private concerns match this view.</p>
                  <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><Database className="h-3.5 w-3.5" aria-hidden="true" /> Reports and organiser responses are server-saved through restarts.</p>
                </div>
              ) : (
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  {visibleConductReports.map((report) => {
                    const responseText = conductResponses[report.id] ?? report.organizerResponse ?? "";
                    return (
                      <article key={report.id} className={`rounded-xl border bg-background p-4 ${report.urgency === "urgent" && report.status !== "resolved" ? "border-red-500/50" : ""}`} data-testid={`card-admin-conduct-report-${report.id}`}>
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold capitalize">{report.category.replaceAll("_", " ")}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{report.participantLabel} · Ref {report.reference} · {new Date(report.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</p>
                          </div>
                          <span className="flex gap-2">
                            {report.urgency === "urgent" && <Badge variant="destructive">Urgent</Badge>}
                            <Badge variant={report.status === "resolved" ? "secondary" : "default"}>{report.status}</Badge>
                          </span>
                        </div>
                        <p className="mt-3 whitespace-pre-wrap break-words rounded-lg border bg-muted/30 p-3 text-sm" data-testid={`text-admin-conduct-details-${report.id}`}>{report.details}</p>
                        <label htmlFor={`conduct-response-${report.id}`} className="mt-3 block text-xs font-medium text-muted-foreground">Private response to this participant</label>
                        <Textarea
                          id={`conduct-response-${report.id}`}
                          value={responseText}
                          onChange={(event) => setConductResponses((current) => ({ ...current, [report.id]: event.target.value }))}
                          rows={3}
                          maxLength={300}
                          placeholder="Example: We have alerted the lead marshal and will follow up at the information point."
                          className="mt-1"
                          data-testid={`input-conduct-response-${report.id}`}
                        />
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs text-muted-foreground">{responseText.length}/300 · visible only on this participant's device receipt</span>
                          <div className="flex flex-wrap gap-2">
                            {report.status === "resolved" ? (
                              <Button size="sm" variant="outline" disabled={liveOperationLocked || updateConductReport.isPending} onClick={() => updateConductReport.mutate({ reportId: report.id, status: "acknowledged" })} data-testid={`button-reopen-conduct-${report.id}`}>Reopen</Button>
                            ) : (
                              <>
                                <Button size="sm" variant="outline" disabled={liveOperationLocked || updateConductReport.isPending} onClick={() => updateConductReport.mutate({ reportId: report.id, status: "acknowledged" })} data-testid={`button-acknowledge-conduct-${report.id}`}>Acknowledge</Button>
                                <Button size="sm" disabled={liveOperationLocked || updateConductReport.isPending || !responseText.trim()} onClick={() => updateConductReport.mutate({ reportId: report.id, status: "resolved" })} data-testid={`button-resolve-conduct-${report.id}`}>Resolve with response</Button>
                              </>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

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
                <div data-testid="text-no-assistance-requests">
                  <p className="text-sm text-muted-foreground">No active participant help requests. When someone asks for accessibility, connection, or safety help, it appears here.</p>
                  <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><Database className="h-3.5 w-3.5" aria-hidden="true" /> Help requests are server-saved until an organiser resolves them.</p>
                </div>
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
                          disabled={liveOperationLocked || resolveAssistance.isPending}
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
                            disabled={liveOperationLocked || moderateQuestion.isPending}
                            data-testid={`button-answer-question-${question.id}`}
                          >
                            Answered
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => moderateQuestion.mutate({ questionId: question.id, status: "dismissed" })}
                            disabled={liveOperationLocked || moderateQuestion.isPending}
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
