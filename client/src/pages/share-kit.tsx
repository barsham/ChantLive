import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, CalendarPlus, Check, Copy, ExternalLink, Hash, Link2, MessageSquare, Printer, Search, Share2 } from "lucide-react";
import { downloadCalendarFile } from "@/lib/calendar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  buildParticipantInvitation,
  formatInvitationSchedule,
  getStoredInvitationLanguage,
  invitationDirections,
  invitationLanguageOptions,
  storeInvitationLanguage,
  type InvitationLanguage,
} from "@/lib/invitations";
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
  participantFacing?: boolean;
};

const participantTemplateCopy: Record<InvitationLanguage, {
  participantInvite: string;
  participantAudience: string;
  arrivalDetails: string;
  arrivalAudience: string;
  saveDate: string;
  calendarAudience: string;
  accessibleFallback: string;
  accessibleAudience: string;
  when: string;
  where: string;
  meetingPoint: string;
  arrivalNote: string;
  participantLink: string;
  eventCode: string;
  keepOpen: string;
  keepHandy: string;
  addCalendar: (url: string) => string;
  noQr: (title: string) => string;
  openLink: string;
  orVisit: (host: string) => string;
  askForHelp: string;
}> = {
  en: {
    participantInvite: "Participant invite", participantAudience: "Send before the event",
    arrivalDetails: "Arrival details", arrivalAudience: "Send before people travel",
    saveDate: "Save the date", calendarAudience: "Send to participants before the event",
    accessibleFallback: "Accessible joining fallback", accessibleAudience: "Read aloud or print",
    when: "When", where: "Where", meetingPoint: "Meeting point", arrivalNote: "Arrival note",
    participantLink: "Participant link", eventCode: "Event code",
    keepOpen: "Open this link before the event starts and keep the page open. The current chant will update automatically.",
    keepHandy: "Keep this message handy and ask a volunteer if the meeting point changes.",
    addCalendar: (url) => `Open the participant page and choose Add to calendar: ${url}`,
    noQr: (title) => `For ${title}, you can join without scanning a QR code.`,
    openLink: "Open this link", orVisit: (host) => `Or go to ${host} and enter the code`,
    askForHelp: "Ask an organiser if you need large text, high contrast, a quieter place, or help reconnecting.",
  },
  es: {
    participantInvite: "Invitación para participantes", participantAudience: "Enviar antes del evento",
    arrivalDetails: "Detalles de llegada", arrivalAudience: "Enviar antes del viaje",
    saveDate: "Guardar la fecha", calendarAudience: "Enviar a participantes antes del evento",
    accessibleFallback: "Alternativa accesible para unirse", accessibleAudience: "Leer en voz alta o imprimir",
    when: "Cuándo", where: "Dónde", meetingPoint: "Punto de encuentro", arrivalNote: "Indicaciones de llegada",
    participantLink: "Enlace para participantes", eventCode: "Código del evento",
    keepOpen: "Abre este enlace antes de que empiece el evento y mantén la página abierta. El canto actual se actualizará automáticamente.",
    keepHandy: "Guarda este mensaje y pregunta a una persona voluntaria si cambia el punto de encuentro.",
    addCalendar: (url) => `Abre la página del participante y elige Añadir al calendario: ${url}`,
    noQr: (title) => `Para ${title}, puedes unirte sin escanear un código QR.`,
    openLink: "Abre este enlace", orVisit: (host) => `O visita ${host} e introduce el código`,
    askForHelp: "Pide ayuda a la organización si necesitas texto grande, alto contraste, un lugar más tranquilo o ayuda para reconectar.",
  },
  fr: {
    participantInvite: "Invitation des participants", participantAudience: "À envoyer avant l’événement",
    arrivalDetails: "Informations d’arrivée", arrivalAudience: "À envoyer avant le déplacement",
    saveDate: "Réserver la date", calendarAudience: "À envoyer aux participants avant l’événement",
    accessibleFallback: "Solution d’accès sans QR", accessibleAudience: "À lire à voix haute ou à imprimer",
    when: "Quand", where: "Où", meetingPoint: "Point de rendez-vous", arrivalNote: "Consignes d’arrivée",
    participantLink: "Lien participant", eventCode: "Code de l’événement",
    keepOpen: "Ouvrez ce lien avant le début de l’événement et gardez la page ouverte. Le chant affiché se mettra à jour automatiquement.",
    keepHandy: "Gardez ce message et demandez à un bénévole si le point de rendez-vous change.",
    addCalendar: (url) => `Ouvrez la page participant et choisissez Ajouter au calendrier : ${url}`,
    noQr: (title) => `Pour ${title}, vous pouvez participer sans scanner de code QR.`,
    openLink: "Ouvrez ce lien", orVisit: (host) => `Ou rendez-vous sur ${host} et saisissez le code`,
    askForHelp: "Demandez à l’organisation si vous avez besoin de grands caractères, d’un contraste élevé, d’un endroit plus calme ou d’aide pour vous reconnecter.",
  },
  ar: {
    participantInvite: "دعوة المشاركين", participantAudience: "أرسلها قبل الفعالية",
    arrivalDetails: "تفاصيل الوصول", arrivalAudience: "أرسلها قبل توجه المشاركين",
    saveDate: "احفظ الموعد", calendarAudience: "أرسلها للمشاركين قبل الفعالية",
    accessibleFallback: "طريقة انضمام ميسّرة", accessibleAudience: "اقرأها بصوت عالٍ أو اطبعها",
    when: "الوقت", where: "المكان", meetingPoint: "نقطة التجمع", arrivalNote: "إرشادات الوصول",
    participantLink: "رابط المشاركين", eventCode: "رمز الفعالية",
    keepOpen: "افتح هذا الرابط قبل بدء الفعالية واترك الصفحة مفتوحة. سيُحدَّث الهتاف الحالي تلقائياً.",
    keepHandy: "احتفظ بهذه الرسالة واسأل أحد المتطوعين إذا تغيرت نقطة التجمع.",
    addCalendar: (url) => `افتح صفحة المشاركين واختر الإضافة إلى التقويم: ${url}`,
    noQr: (title) => `يمكنك الانضمام إلى ${title} من دون مسح رمز QR.`,
    openLink: "افتح هذا الرابط", orVisit: (host) => `أو انتقل إلى ${host} وأدخل الرمز`,
    askForHelp: "اطلب من المنظم المساعدة إذا احتجت إلى نص كبير أو تباين عالٍ أو مكان أكثر هدوءاً أو مساعدة في إعادة الاتصال.",
  },
  fa: {
    participantInvite: "دعوت‌نامه شرکت‌کنندگان", participantAudience: "پیش از رویداد ارسال کنید",
    arrivalDetails: "جزئیات ورود", arrivalAudience: "پیش از حرکت افراد ارسال کنید",
    saveDate: "ذخیره زمان", calendarAudience: "پیش از رویداد برای شرکت‌کنندگان بفرستید",
    accessibleFallback: "روش دسترس‌پذیر پیوستن", accessibleAudience: "بلند بخوانید یا چاپ کنید",
    when: "زمان", where: "مکان", meetingPoint: "محل دیدار", arrivalNote: "راهنمای ورود",
    participantLink: "پیوند شرکت‌کنندگان", eventCode: "کد رویداد",
    keepOpen: "این پیوند را پیش از شروع رویداد باز کنید و صفحه را باز نگه دارید. شعار جاری به‌طور خودکار به‌روزرسانی می‌شود.",
    keepHandy: "این پیام را نگه دارید و اگر محل دیدار تغییر کرد از یک داوطلب بپرسید.",
    addCalendar: (url) => `صفحه شرکت‌کنندگان را باز کنید و افزودن به تقویم را انتخاب کنید: ${url}`,
    noQr: (title) => `برای پیوستن به ${title} نیازی به اسکن کد QR نیست.`,
    openLink: "این پیوند را باز کنید", orVisit: (host) => `یا به ${host} بروید و کد را وارد کنید`,
    askForHelp: "اگر به نوشته بزرگ، کنتراست بالا، جای آرام‌تر یا کمک برای اتصال دوباره نیاز دارید از برگزارکننده کمک بخواهید.",
  },
};

function buildTemplates(
  data: DemoDetail,
  language: InvitationLanguage,
  publicUrl: string,
  handoutUrl: string,
  planUrl: string,
  recoveryUrl: string,
  reportUrl: string,
  commandUrl: string,
  briefingUrl: string,
  runOfShowUrl: string,
  safetyUrl: string,
): MessageTemplate[] {
  const title = data.demo.title;
  const copy = participantTemplateCopy[language];
  const participantCode = data.demo.publicId;
  const chantCount = data.chants.length;
  const duration = data.state?.eventDurationMinutes ?? 300;
  const schedule = formatInvitationSchedule(data.demo.scheduledAt, language);
  const logisticsLines = [
    schedule ? `${copy.when}: ${schedule}` : null,
    data.demo.locationName ? `${copy.where}: ${data.demo.locationName}` : null,
    data.demo.meetingPoint ? `${copy.meetingPoint}: ${data.demo.meetingPoint}` : null,
    data.demo.arrivalNote ? `${copy.arrivalNote}: ${data.demo.arrivalNote}` : null,
  ].filter(Boolean) as string[];
  const backupAdminLine = data.admins.length > 1
    ? `Backup admins are set: ${data.admins.map((admin) => admin.name).join(", ")}.`
    : "Please add one backup admin before going live.";

  return [
    {
      id: "participant-invite",
      title: copy.participantInvite,
      audience: copy.participantAudience,
      participantFacing: true,
      body: [
        buildParticipantInvitation(data.demo, new URL(publicUrl).origin, language),
        "",
        copy.keepOpen,
      ].join("\n"),
    },
    ...(logisticsLines.length ? [{
      id: "arrival-details",
      title: copy.arrivalDetails,
      audience: copy.arrivalAudience,
      participantFacing: true,
      body: [
        `${copy.arrivalDetails}: ${title}`,
        ...logisticsLines,
        "",
        `${copy.participantLink}: ${publicUrl}`,
        copy.keepHandy,
      ].join("\n"),
    }] : []),
    ...(schedule ? [{
      id: "calendar-reminder",
      title: copy.saveDate,
      audience: copy.calendarAudience,
      participantFacing: true,
      body: [
        `${copy.saveDate}: ${title}`,
        `${copy.when}: ${schedule}`,
        ...(data.demo.locationName ? [`${copy.where}: ${data.demo.locationName}`] : []),
        "",
        copy.addCalendar(publicUrl),
        `${copy.eventCode}: ${participantCode}`,
      ].join("\n"),
    }] : []),
    ...(data.demo.supportUrl ? [{
      id: "support-action",
      title: "Support action",
      audience: "Send during or after the event",
      body: [
        `${title} has an organizer-approved action page:`,
        `${data.demo.supportLabel || "Support this event"}: ${data.demo.supportUrl}`,
        "",
        "Use this for donations, volunteer signup, petitions, campaign updates, or other event follow-up.",
      ].join("\n"),
    }] : []),
    {
      id: "accessibility-fallback",
      title: copy.accessibleFallback,
      audience: copy.accessibleAudience,
      participantFacing: true,
      body: [
        copy.noQr(title),
        `${copy.openLink}: ${publicUrl}`,
        `${copy.orVisit(new URL(publicUrl).host)}: ${participantCode}`,
        "",
        copy.askForHelp,
      ].join("\n"),
    },
    {
      id: "backup-admin",
      title: "Backup admin handoff",
      audience: "Send to co-organisers",
      body: [
        `You are a backup admin for ${title}.`,
        `Command center: ${commandUrl}`,
        `Event plan: ${planUrl}`,
        `Participant handout: ${handoutUrl}`,
        "",
        backupAdminLine,
        "Please open the event before we go live and be ready to take over if the primary device drops.",
      ].join("\n"),
    },
    {
      id: "organizer-command-handoff",
      title: "Organizer command handoff",
      audience: "Send to organisers before the event",
      body: [
        `Use this command center while running ${title}:`,
        commandUrl,
        "",
        "It keeps the participant link, readiness checks, recovery console, volunteer briefing, share kit, and post-event report in one place.",
      ].join("\n"),
    },
    {
      id: "volunteer-briefing",
      title: "Volunteer briefing",
      audience: "Send to volunteers",
      body: [
        `Please review your ChantLive role card before ${title}:`,
        briefingUrl,
        "",
        "The briefing covers speaker, marshal, accessibility helper, and backup-admin responsibilities.",
      ].join("\n"),
    },
    {
      id: "run-of-show-handoff",
      title: "Run-of-show handoff",
      audience: "Send to speakers and co-organisers",
      body: [
        `Use this run of show for ${title}:`,
        runOfShowUrl,
        "",
        "It gives the team a timed sequence for arrival, safety, chant coordination, recovery, and debrief.",
      ].join("\n"),
    },
    {
      id: "safety-board-handoff",
      title: "Safety board handoff",
      audience: "Send to marshals and accessibility helpers",
      body: [
        `Please review the safety board for ${title}:`,
        safetyUrl,
        "",
        "Chant timing is guidance only. Local safety, accessibility, marshal, venue, and emergency instructions always come first.",
      ].join("\n"),
    },
    {
      id: "day-of-announcement",
      title: "Day-of announcement",
      audience: "Speaker or marshal script",
      body: [
        `We are using ChantLive for ${title}.`,
        "Please scan the QR code or open the participant link, then keep the page open.",
        `If scanning fails, go to ${new URL(publicUrl).host} and enter code ${participantCode}.`,
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
    {
      id: "recovery-script",
      title: "Recovery script",
      audience: "Use if the crowd has connection trouble",
      body: [
        `If ChantLive stops updating for ${title}, keep the page open and press Help, then Refresh connection.`,
        `If that does not work, reopen the participant link: ${publicUrl}`,
        `Organisers can use the recovery console here: ${recoveryUrl}`,
      ].join("\n"),
    },
    {
      id: "post-event-follow-up",
      title: "Post-event follow-up",
      audience: "Send to organisers after the event",
      body: [
        `Thanks for helping run ${title}.`,
        `Please review the post-event report here: ${reportUrl}`,
        "Capture what worked, what confused participants, and which chants should be reused next time.",
      ].join("\n"),
    },
  ];
}

export default function ShareKit() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [templateSearch, setTemplateSearch] = useState("");
  const [invitationLanguage, setInvitationLanguage] = useState<InvitationLanguage>(getStoredInvitationLanguage);
  const [actionStatus, setActionStatus] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const { data, isLoading } = useQuery<DemoDetail>({
    queryKey: ["/api/demos", id],
  });

  const origin = window.location.origin;
  const publicUrl = data?.demo ? `${origin}/d/${data.demo.publicId}` : "";
  const handoutUrl = id ? `${origin}/admin/demos/${id}/handout` : "";
  const planUrl = id ? `${origin}/admin/demos/${id}/plan` : "";
  const recoveryUrl = id ? `${origin}/admin/demos/${id}/recovery` : "";
  const reportUrl = id ? `${origin}/admin/demos/${id}/report` : "";
  const commandUrl = id ? `${origin}/admin/demos/${id}/command` : "";
  const briefingUrl = id ? `${origin}/admin/demos/${id}/briefing` : "";
  const runOfShowUrl = id ? `${origin}/admin/demos/${id}/run-of-show` : "";
  const safetyUrl = id ? `${origin}/admin/demos/${id}/safety` : "";
  const templates = data ? buildTemplates(data, invitationLanguage, publicUrl, handoutUrl, planUrl, recoveryUrl, reportUrl, commandUrl, briefingUrl, runOfShowUrl, safetyUrl) : [];
  const normalizedSearch = templateSearch.trim().toLowerCase();
  const filteredTemplates = normalizedSearch
    ? templates.filter((template) =>
        `${template.title} ${template.audience} ${template.body}`.toLowerCase().includes(normalizedSearch),
      )
    : templates;

  const showActionStatus = (tone: "success" | "error", text: string) => {
    setActionStatus({ tone, text });
    window.setTimeout(() => setActionStatus(null), 4000);
  };

  const copyMessage = async (template: MessageTemplate) => {
    try {
      await navigator.clipboard.writeText(template.body);
      setCopiedId(template.id);
      showActionStatus("success", `${template.title} copied and ready to send.`);
      window.setTimeout(() => setCopiedId(null), 1800);
    } catch {
      showActionStatus("error", `Could not copy ${template.title}. Select the visible message text and copy it manually.`);
    }
  };

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(templates.map((template) => `${template.title}\n${template.body}`).join("\n\n---\n\n"));
      setCopiedId("all");
      showActionStatus("success", `Copied all ${templates.length} share-kit messages.`);
      window.setTimeout(() => setCopiedId(null), 1800);
    } catch {
      showActionStatus("error", "Could not copy the share kit. Copy individual messages from their visible text instead.");
    }
  };

  const copyParticipantAccess = async (kind: "link" | "code") => {
    const value = kind === "link" ? publicUrl : data?.demo.publicId;
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(`participant-${kind}`);
      showActionStatus("success", `Participant ${kind} copied.`);
      window.setTimeout(() => setCopiedId(null), 1800);
    } catch {
      showActionStatus("error", `Could not copy the participant ${kind}. Select it from the quick access card instead.`);
    }
  };

  const shareMessage = async (template: MessageTemplate) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${data?.demo.title}: ${template.title}`,
          text: template.body,
        });
        setCopiedId(`shared-${template.id}`);
        showActionStatus("success", `${template.title} shared.`);
      } else {
        await navigator.clipboard.writeText(template.body);
        setCopiedId(`shared-${template.id}`);
        showActionStatus("success", "This browser does not offer a share sheet, so the message was copied instead.");
      }
      window.setTimeout(() => setCopiedId(null), 1800);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(template.body);
        setCopiedId(`shared-${template.id}`);
        showActionStatus("success", "The share sheet was unavailable, so the message was copied instead.");
        window.setTimeout(() => setCopiedId(null), 1800);
      } catch {
        showActionStatus("error", `Could not share ${template.title}. Use Copy message or select the visible text manually.`);
      }
    }
  };

  const downloadCalendarInvite = () => {
    if (!data?.demo.scheduledAt) return;
    downloadCalendarFile({
      title: data.demo.title,
      scheduledAt: data.demo.scheduledAt,
      durationMinutes: data.state?.eventDurationMinutes,
      location: data.demo.locationName,
      description: `Join on ChantLive: ${publicUrl}\nEvent code: ${data.demo.publicId}`,
      uid: `chantlive-${data.demo.publicId}@chantlive.online`,
    });
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
            {data?.demo.scheduledAt && (
              <Button variant="outline" size="sm" onClick={downloadCalendarInvite} data-testid="button-download-share-calendar">
                <CalendarPlus className="mr-1 h-4 w-4" />
                Calendar invite
              </Button>
            )}
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
              <p className="mt-1 break-all">Command: {commandUrl}</p>
              <p className="mt-1 break-all">Briefing: {briefingUrl}</p>
              <p className="mt-1 break-all">Run of show: {runOfShowUrl}</p>
              <p className="mt-1 break-all">Safety: {safetyUrl}</p>
              <p className="mt-1 break-all">Recovery: {recoveryUrl}</p>
              <p className="mt-1 break-all">Report: {reportUrl}</p>
            </div>
          </div>

          <div className="mt-6 rounded-xl border bg-muted/20 p-4" data-testid="card-share-kit-language">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold">Participant message language</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Updates the participant invitation, arrival details, calendar reminder, and accessible joining fallback.
                </p>
              </div>
              <label className="flex min-h-11 items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm font-medium">
                Language
                <select
                  value={invitationLanguage}
                  onChange={(event) => {
                    const language = event.target.value as InvitationLanguage;
                    setInvitationLanguage(language);
                    storeInvitationLanguage(language);
                  }}
                  className="min-h-11 rounded-md border bg-background px-3 text-foreground"
                  aria-label="Share Kit participant message language"
                  data-testid="select-share-kit-language"
                >
                  {invitationLanguageOptions.map((option) => (
                    <option key={option.code} value={option.code}>{option.label}</option>
                  ))}
                </select>
              </label>
            </div>
            <p className="mt-2 text-xs text-muted-foreground" role="status" aria-live="polite" data-testid="text-share-kit-language-status">
              Participant-facing messages are ready in {invitationLanguageOptions.find((option) => option.code === invitationLanguage)?.label}.
              This choice is remembered in the dashboard and event editor on this device.
            </p>
          </div>

          <div className="mt-6 rounded-xl border border-primary/30 bg-primary/5 p-4" data-testid="card-share-participant-access">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold">Quick participant access</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Share the short code when a QR code is hard to scan or a long link is difficult to read aloud.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-lg border bg-background px-3 py-2 font-mono text-lg font-bold tracking-widest" data-testid="text-share-participant-code">
                    {data.demo.publicId}
                  </span>
                  <span className="text-xs text-muted-foreground">Enter at {window.location.host}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <Button variant="outline" size="sm" onClick={() => copyParticipantAccess("code")} data-testid="button-copy-share-code">
                  {copiedId === "participant-code" ? <Check className="mr-1 h-4 w-4" /> : <Hash className="mr-1 h-4 w-4" />}
                  {copiedId === "participant-code" ? "Code copied" : "Copy code"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => copyParticipantAccess("link")} data-testid="button-copy-share-link">
                  {copiedId === "participant-link" ? <Check className="mr-1 h-4 w-4" /> : <Link2 className="mr-1 h-4 w-4" />}
                  {copiedId === "participant-link" ? "Link copied" : "Copy link"}
                </Button>
              </div>
            </div>
          </div>

          {actionStatus && (
            <p
              className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
                actionStatus.tone === "error"
                  ? "border-destructive/40 bg-destructive/10 text-destructive"
                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              }`}
              role={actionStatus.tone === "error" ? "alert" : "status"}
              aria-live="polite"
              data-testid="text-share-kit-action-status"
            >
              {actionStatus.text}
            </p>
          )}

          <div className="mt-6 rounded-xl border bg-muted/20 p-4" data-testid="card-share-template-search">
            <label htmlFor="share-template-search" className="text-sm font-semibold">Find a message</label>
            <p className="mt-1 text-xs text-muted-foreground">
              Search by purpose or audience, such as participant, volunteer, safety, recovery, or social.
            </p>
            <div className="relative mt-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                id="share-template-search"
                value={templateSearch}
                onChange={(event) => setTemplateSearch(event.target.value)}
                className="pl-9"
                placeholder="Search share-kit messages"
                type="search"
                data-testid="input-share-template-search"
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground" role="status" data-testid="text-share-template-count">
              Showing {filteredTemplates.length} of {templates.length} messages
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {filteredTemplates.map((template) => (
              <Card
                key={template.id}
                className="min-w-0"
                dir={template.participantFacing ? invitationDirections[invitationLanguage] : "ltr"}
                lang={template.participantFacing ? invitationLanguage : "en"}
                data-testid={`card-share-template-${template.id}`}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    {template.title}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">{template.audience}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <pre
                    className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] rounded-lg border bg-muted/40 p-3 text-sm leading-relaxed text-foreground"
                    dir={template.participantFacing ? invitationDirections[invitationLanguage] : "ltr"}
                    lang={template.participantFacing ? invitationLanguage : "en"}
                  >
                    {template.body}
                  </pre>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => copyMessage(template)} data-testid={`button-copy-share-template-${template.id}`}>
                      {copiedId === template.id ? <Check className="mr-1 h-4 w-4" /> : <Copy className="mr-1 h-4 w-4" />}
                      {copiedId === template.id ? "Copied" : "Copy message"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => shareMessage(template)} data-testid={`button-share-template-${template.id}`}>
                      {copiedId === `shared-${template.id}` ? <Check className="mr-1 h-4 w-4" /> : <Share2 className="mr-1 h-4 w-4" />}
                      {copiedId === `shared-${template.id}` ? "Shared" : "Share"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredTemplates.length === 0 && (
              <Card className="md:col-span-2" data-testid="card-share-template-empty">
                <CardContent className="p-6 text-center">
                  <p className="font-semibold">No matching messages</p>
                  <p className="mt-1 text-sm text-muted-foreground">Try a broader term or clear the search to see every template.</p>
                  <Button className="mt-4" variant="outline" size="sm" onClick={() => setTemplateSearch("")}>
                    Clear search
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
