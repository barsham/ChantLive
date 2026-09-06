import { useState, useEffect, useRef } from "react";
import { Link, useParams } from "wouter";
import { getSocket } from "@/lib/socket";
import { CalendarPlus, Clock3, Copy, Download, ExternalLink, Eye, HelpCircle, Link2, ListOrdered, MapPin, Share2, ShieldCheck, Sun, Trash2, Type, Users, Megaphone, RefreshCw, WifiOff } from "lucide-react";
import { buildGoogleCalendarUrl, buildOutlookCalendarUrl, downloadCalendarFile, type CalendarEventDetails } from "@/lib/calendar";
import { forgetRecentParticipantEvent, rememberParticipantEvent } from "@/lib/participant-history";
import { ParticipantRegistration } from "@/components/participant-registration";
import { forgetOfflineEvent, loadOfflineEvent, saveOfflineEvent, updateOfflineEventIfPrepared, type OfflineChantData, type OfflineEventSnapshot } from "@/lib/offline-event";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ChantData = OfflineChantData;
type OrganizerAnnouncement = {
  id: string;
  message: string;
  targetRole: "all" | CheckInRole;
  createdAt: string;
};
type AudienceQuestion = {
  id: string;
  text: string;
  status: "open" | "answering" | "answered" | "dismissed";
  votes: number;
  organizerResponse: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  participantLabel: string;
};
type ParticipantQuestionReceipts = {
  questions: AudienceQuestion[];
  privacy: string;
  storage: "shared";
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
  decisionOptionId: string | null;
  decisionNote: string | null;
  createdAt: string;
  closedAt: string | null;
  storage: "shared";
};
type ParticipantPollReceipt = {
  poll: LivePoll;
  selectedOptionId: string | null;
  privacy: string;
};
type CrowdPulseType = "too_fast" | "too_slow" | "cant_hear" | "all_good";
type CrowdPulseReceipt = {
  type: CrowdPulseType;
  createdAt: string;
  privacy?: string;
};
type SafetyCheck = {
  id: string;
  kind: "route_change" | "separation" | "weather" | "accessibility" | "general";
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
  resolutionMessage: string | null;
  createdAt: string;
  closedAt: string | null;
  participantResponse: "ok" | "need_help" | "leaving" | "not_sure" | null;
  storage: "shared";
};
type CheckInRole = "participant" | "marshal" | "speaker" | "accessibility";
type ParticipantLanguage = "en" | "es" | "fr" | "ar" | "fa";
type ParticipantEngagement = {
  points: number;
  badges: string[];
  participantLabel: string;
  updatedAt: string;
};
type AttendanceReceipt = {
  firstJoinAt: string;
  lastSeenAt: string;
  visitCount: number;
  observedSeconds: number;
};
type ConductReportCategory = "harassment" | "unsafe_behavior" | "privacy" | "misinformation" | "other";
type ConductReport = {
  id: string;
  reference: string;
  category: ConductReportCategory;
  urgency: "urgent" | "follow_up";
  details: string;
  status: "open" | "acknowledged" | "resolved";
  organizerResponse: string | null;
  createdAt: string;
  updatedAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  duplicate?: boolean;
};
type ParticipantRunSheetItem = {
  id: string;
  orderIndex: number;
  kind: "arrival" | "welcome" | "chant" | "speaker" | "movement" | "break" | "closing" | "custom";
  title: string;
  participantNote: string | null;
  plannedDurationMinutes: number;
  status: "pending" | "active" | "completed" | "skipped";
};
type ParticipantRunSheet = {
  total: number;
  plannedDurationMinutes: number;
  completed: number;
  skipped: number;
  pending: number;
  active: ParticipantRunSheetItem | null;
  next: ParticipantRunSheetItem | null;
  items: ParticipantRunSheetItem[];
  storage: "shared";
  updatedAt: string | null;
};

const clampProgress = (value: number) => Math.min(100, Math.max(0, value));
const getFallbackPhaseDuration = (phase: "leader" | "people") => phase === "leader" ? 4000 : 3000;
const participantLocales: Record<ParticipantLanguage, string> = {
  en: "en",
  es: "es",
  fr: "fr",
  ar: "ar-u-nu-arab",
  fa: "fa-u-nu-arabext",
};
const formatParticipantSchedule = (value: string | null | undefined, language: ParticipantLanguage) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(participantLocales[language], {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};
const formatParticipantNumber = (value: number, language: ParticipantLanguage) =>
  new Intl.NumberFormat(participantLocales[language]).format(value);
const getStoredPollVotes = (): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem("chant_poll_votes") ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
};
const getStoredSafetyResponses = (): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem("chant_safety_responses") ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
};
const participantLanguageOptions: Array<{ code: ParticipantLanguage; label: string }> = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "ar", label: "العربية" },
  { code: "fa", label: "فارسی" },
];
const getDefaultParticipantLanguage = (): ParticipantLanguage => {
  const stored = localStorage.getItem("chant_participant_language") as ParticipantLanguage | null;
  if (stored && participantLanguageOptions.some((option) => option.code === stored)) return stored;
  const browserLanguage = navigator.language.toLowerCase();
  if (browserLanguage.startsWith("es")) return "es";
  if (browserLanguage.startsWith("fr")) return "fr";
  if (browserLanguage.startsWith("ar")) return "ar";
  if (browserLanguage.startsWith("fa") || browserLanguage.startsWith("prs")) return "fa";
  return "en";
};
const participantCopy: Record<ParticipantLanguage, Record<string, string>> = {
  en: {
    announcementEveryone: "Organizer update for everyone",
    announcementParticipants: "Organizer update for participants",
    announcementMarshals: "Organizer update for marshals",
    announcementSpeakers: "Organizer update for speakers",
    announcementAccessibility: "Organizer update for accessibility helpers",
    dismiss: "Dismiss",
    organizerAction: "Organizer action",
    opensOrganizerPage: "Opens an organizer-provided page in a new tab.",
    votes: "votes",
    voteSent: "Vote sent.",
    voteFailed: "Could not send vote. Try again or tell an organizer.",
    assistanceFailed: "Could not notify the organizer. Please ask someone nearby for help.",
    questionSent: "Question sent to the organizer.",
    questionFailed: "Could not send question. Please ask an organizer directly.",
    questionReceipts: "Your private question receipts",
    noQuestionReceipts: "Questions sent from this device will appear here.",
    questionOpen: "Waiting for the organiser",
    questionAnswering: "Being answered now",
    questionAnswered: "Answered",
    questionDismissed: "Closed without a public answer",
    withdrawQuestion: "Withdraw question",
    confirmWithdrawQuestion: "Confirm withdrawal",
    keepQuestion: "Keep question",
    questionWithdrawn: "Question withdrawn.",
    questionWithdrawFailed: "The question could not be withdrawn. It may already be in progress.",
    nowAnswering: "The organiser is answering",
    publishedAnswer: "Organiser answer",
    waitingAnswer: "Keep this page open. The shared answer will appear here.",
    questionReceiptPrivacy: "Only this device can recover your receipts. Organisers see an anonymous event-only identifier.",
    safetyResponseSent: "Safety response sent.",
    safetyResponseFailed: "Could not send safety response. Tell a marshal or organizer directly.",
    checkedIn: "Checked in",
    checkedInAs: "Checked in as",
    checkInFailed: "Could not check in. Please tell an organizer you are here.",
    everyoneRespondNow: "Everyone, respond now",
    leaderSpeakingNow: "Leader is speaking now",
    readBlueResponse: "Read the blue response together.",
    listenOrangeCall: "Listen for the orange call.",
    keepScreenOn: "Keep screen on",
    screenStaysOn: "Screen stays on",
    wakeLockActive: "Screen wake lock is active",
    wakeLockDescription: "Prevent the screen from sleeping during this live chant",
    wakeLockError: "This device could not keep the screen on. Check battery or browser settings.",
    lowBandwidthDescription: "Low-bandwidth mode reduces animation and hides next-up previews.",
    fullDisplayDescription: "Full display mode shows motion, timing, and next-up previews.",
    chant: "Chant",
    cycle: "cycle",
    of: "of",
    leaderChantProgress: "Leader chant progress",
    everyoneChantProgress: "Everyone chant progress",
    waitingForChantText: "Waiting for chant text.",
    help: "Help",
    helpOpen: "Help open",
    lowBandwidth: "Low bandwidth",
    lowBandwidthOn: "Low bandwidth on",
    largeText: "Large text",
    largeTextOn: "Large text on",
    highContrast: "High contrast",
    highContrastOn: "High contrast on",
    helpPanelLabel: "Participant help and safety panel",
    viewingNow: "Viewing now",
    connected: "Connected to live updates",
    reconnecting: "Reconnecting - updates resume automatically",
    offline: "Offline - reconnect to receive updates",
    connectionLostTitle: "Live updates paused",
    connectionLostBody: "The chant on screen is the last update received. Reconnect before following new instructions.",
    reconnectNow: "Reconnect now",
    offlinePrepTitle: "Prepare this event for weak signal",
    offlinePrepBody: "Save this event while online. This device will keep the latest verified chant available if the page must reopen without a connection.",
    offlineSave: "Save for weak signal",
    offlineSaved: "Offline copy ready on this device.",
    offlineSaveFailed: "This browser could not save the offline copy. Check private-browsing or storage settings.",
    offlineCopyTitle: "Showing a saved offline copy",
    offlineCopyBody: "This information may be out of date. Do not follow new movement or safety instructions until live updates reconnect.",
    offlineStoredAt: "Last verified",
    offlineForget: "Forget saved event",
    offlineForgotten: "Saved offline event removed from this device.",
    offlinePrivacy: "Stored only on this device. ChantLive does not save participant messages, check-ins, votes, or feedback in this offline copy.",
    leader: "Leader",
    everyone: "Everyone",
    next: "Coming Up Next",
    waitNext: "Waiting for next chant...",
    pageStops: "If the page stops updating",
    pageStopsBody: "Stay on this page. If the status says reconnecting for more than a few seconds, use refresh connection.",
    refresh: "Refresh connection",
    visibility: "If visibility is difficult",
    visibilityBody: "Turn on large text or high contrast below. Move closer to the organiser if you need audio cues.",
    plansChange: "If plans change",
    plansChangeBody: "Follow organiser instructions first. ChantLive shows chant timing, but local safety directions take priority.",
    signalTitle: "Send the organizer a signal",
    signalBody: "Tell the organizer if the pace, sound, or access needs attention. Your phone does not show your name.",
    tooFast: "Too fast",
    tooSlow: "Too slow",
    cantHear: "Can't hear",
    allGood: "All good",
    signalSent: "Signal sent to the organizer.",
    signalRecovered: "Your previous signal was recovered after reconnecting.",
    signalReceiptFailed: "Your saved signal could not be recovered. Other live controls still work.",
    retrySignal: "Retry signal receipt",
    signalRecordedAt: "Recorded",
    signalPrivate: "Only this device can recover this event-scoped receipt. Your name and raw device key are not stored.",
    supportTitle: "If you need support",
    supportBody: "Ask a marshal or accessibility helper for the plain link, a quieter place, repeated instructions, or help reading the chant.",
    needAccessibility: "Need accessibility help",
    needConnection: "Need connection help",
    needSafety: "Need safety help",
    organizerNotified: "Organizer notified. Stay where you are if it is safe.",
    participation: "Participation progress",
    participationBody: "Earn points for useful event actions like checking in, voting in polls, sending pulse signals, asking questions, and giving feedback.",
    points: "points",
    firstBadge: "Check in or send a signal to earn your first badge.",
    livePoll: "Live poll",
    noPoll: "No live poll is open right now. If the organizer asks a crowd question, it will appear here.",
    voteGuidance: "Choose one option. You can change your vote while the poll is open.",
    voteCounted: "Your latest vote is counted. You can change it while the poll is open.",
    pollOpen: "Open",
    pollClosed: "Closed",
    decisionRecorded: "Decision recorded",
    decisionOutcome: "Outcome",
    decisionReason: "Organizer rationale",
    outcomeUnavailable: "Outcome unavailable",
    pollDecisionRetained: "This decision and your private vote receipt are retained after reconnecting.",
    voteRecovered: "Your previous vote was recovered from shared storage.",
    pollReceiptFailed: "The latest poll or your private vote receipt could not be recovered. Other live controls still work.",
    retryPollReceipt: "Retry poll receipt",
    safetyCheck: "Safety check",
    noSafetyCheck: "No safety check is active. If organisers need a quick roll call, it will appear here.",
    incidentActive: "Live organiser incident notice",
    incidentRoute: "Route change",
    incidentSeparation: "Group separation",
    incidentWeather: "Weather or site conditions",
    incidentAccessibility: "Accessibility disruption",
    incidentGeneral: "General disruption",
    incidentInstruction: "What to do now",
    incidentRespond: "Send one response so organisers can account for the group.",
    incidentAllClear: "Organiser all-clear",
    incidentResolvedAt: "Resolved",
    incidentDismiss: "Dismiss all-clear",
    incidentResponseRecorded: "Your latest response is recorded.",
    incidentResponseRecovered: "Your earlier response was restored from the server after reconnecting.",
    optionalSafetyNote: "Optional note, meeting point, or support needed...",
    imOk: "I'm OK",
    needHelp: "Need help",
    leaving: "Leaving now",
    notSure: "Not sure",
    safetyGuidance: "Respond once so organisers know whether anyone needs attention.",
    safetyCounted: "Your latest safety response is counted. You can update it while the check is open.",
    checkInTitle: "Check in with the organizer",
    checkInBody: "Let the organizer know you are here and what role you can help with. Name is optional.",
    optionalName: "Optional name or team label",
    participant: "Participant",
    marshal: "Marshal",
    speaker: "Speaker",
    accessibilityHelper: "Accessibility helper",
    askOrganizer: "Ask the organizer",
    askBody: "Send an anonymous question without interrupting the chant.",
    askPlaceholder: "Type a short question for the organizer...",
    sendQuestion: "Send question",
    raisedQuestions: "Questions people have raised",
    noQuestions: "No open questions yet.",
    voteUp: "Vote up",
    rateExperience: "Rate the experience",
    rateBody: "Send quick feedback the organiser can review after the event.",
    clearFollow: "Clear to follow",
    feltSafe: "Felt safe",
    accessible: "Accessible",
    feedbackNote: "Optional feedback note...",
    sendFeedback: "Send feedback",
    language: "Language",
    eventCode: "Event code",
    calendar: "Calendar",
    addToCalendar: "Add to calendar",
    googleCalendar: "Google Calendar",
    outlookCalendar: "Outlook Calendar",
    downloadCalendarFile: "Download calendar file (.ics)",
    calendarDownloaded: "Calendar invite downloaded.",
    calendarFailed: "The event date could not be added to your calendar.",
    copy: "Copy",
    copyCode: "Copy code",
    copyEventCode: "Copy event code",
    eventCodeCopied: "Event code copied.",
    copyLink: "Copy link",
    participantLinkCopied: "Participant link copied.",
    noAccountOrScanner: "No account or QR scanner needed.",
    shareEvent: "Share event",
    eventShared: "Event shared.",
    eventInvitationCopied: "Event invitation copied.",
    manualShareCopy: "Sharing and copying are unavailable. Select and copy the complete invitation below.",
    shareEventCode: "Share event code",
    join: "Join",
    joinThisEvent: "Join this ChantLive event",
    connecting: "Connecting...",
    waitingNetwork: "Waiting for network...",
    offlineLoadingBody: "You appear to be offline. Reconnect to receive live chants.",
    connectingBody: "If this takes too long, retry the connection or ask an organiser to confirm the QR/link.",
    retryConnection: "Retry connection",
    notFound: "Demonstration not found",
    couldNotConnect: "We could not connect to this event",
    recoveryBody: "Check the participant link or try reconnecting.",
    recoveryStepsTitle: "What to check",
    recoveryCheckCode: "Compare this code with the organiser's message.",
    recoveryOpenLink: "If you received a full link, open it again from the original message.",
    recoveryAskOrganizer: "Ask the organiser whether the event is still available.",
    copyRecoveryDetails: "Copy details for organiser",
    recoveryDetailsCopied: "Details copied. Send them to the organiser.",
    recoveryDetailsManual: "Copy failed. Select and copy the details below.",
    checkedEventCode: "Event code checked",
    tryAgain: "Try again",
    differentEventCode: "Enter a different event code",
    savedShortcutRemoved: "The unavailable event was removed from your recent shortcut on this device.",
    waitingToBegin: "Waiting to begin...",
    eventDetails: "Event details",
    when: "When",
    where: "Where",
    meet: "Meet",
    arrival: "Arrival",
    openDirections: "Open directions",
    waitingBody: "Keep this page open. Chants will appear automatically when an organiser starts the demonstration.",
    waitingOfflineStatus: "Offline - reconnect to receive chants",
    waitingConnectedStatus: "Connected and waiting for the organizer",
    supportEvent: "Support this event",
    whileWaiting: "While you wait",
    waitTipOpen: "Keep this page open.",
    waitTipAudio: "Stay near the organizer or speaker if you need audio cues.",
    waitTipRefresh: "If the page stops updating, use refresh connection.",
    waitingOfflineBody: "You are offline. Reconnect before the demonstration starts so live chants can appear.",
    eventEnded: "This demonstration has ended",
    endedNextStep: "Thanks for joining. You can close this page or ask an organizer for the next participant link.",
    joinAnotherEvent: "Join another event",
    feedbackSent: "Feedback sent. Thank you.",
    feedbackFailed: "Could not send feedback. Please tell an organizer directly.",
  },
  es: {
    announcementEveryone: "Actualización del organizador para todos",
    announcementParticipants: "Actualización del organizador para participantes",
    announcementMarshals: "Actualización del organizador para responsables de seguridad",
    announcementSpeakers: "Actualización del organizador para oradores",
    announcementAccessibility: "Actualización para ayudantes de accesibilidad",
    dismiss: "Descartar",
    organizerAction: "Acción del organizador",
    opensOrganizerPage: "Abre una página proporcionada por el organizador en una pestaña nueva.",
    votes: "votos",
    voteSent: "Voto enviado.",
    voteFailed: "No se pudo enviar el voto. Inténtalo de nuevo o avisa al organizador.",
    assistanceFailed: "No se pudo avisar al organizador. Pide ayuda a alguien cercano.",
    questionSent: "Pregunta enviada al organizador.",
    questionFailed: "No se pudo enviar la pregunta. Pregunta directamente al organizador.",
    questionReceipts: "Tus recibos privados de preguntas",
    noQuestionReceipts: "Las preguntas enviadas desde este dispositivo aparecerán aquí.",
    questionOpen: "Esperando al organizador",
    questionAnswering: "Se está respondiendo ahora",
    questionAnswered: "Respondida",
    questionDismissed: "Cerrada sin respuesta pública",
    withdrawQuestion: "Retirar pregunta",
    confirmWithdrawQuestion: "Confirmar retirada",
    keepQuestion: "Conservar pregunta",
    questionWithdrawn: "Pregunta retirada.",
    questionWithdrawFailed: "No se pudo retirar. Puede que ya esté en curso.",
    nowAnswering: "El organizador está respondiendo",
    publishedAnswer: "Respuesta del organizador",
    waitingAnswer: "Mantén esta página abierta. La respuesta aparecerá aquí.",
    questionReceiptPrivacy: "Solo este dispositivo recupera tus recibos. Los organizadores ven un identificador anónimo del evento.",
    safetyResponseSent: "Respuesta de seguridad enviada.",
    safetyResponseFailed: "No se pudo enviar la respuesta de seguridad. Avisa directamente a un responsable o al organizador.",
    checkedIn: "Registrado",
    checkedInAs: "Registrado como",
    checkInFailed: "No se pudo registrar tu llegada. Dile al organizador que estás aquí.",
    everyoneRespondNow: "Todos responden ahora",
    leaderSpeakingNow: "La persona guía habla ahora",
    readBlueResponse: "Lean juntos la respuesta azul.",
    listenOrangeCall: "Escucha la llamada naranja.",
    keepScreenOn: "Mantener pantalla encendida",
    screenStaysOn: "La pantalla permanece encendida",
    wakeLockActive: "El bloqueo de pantalla está activo",
    wakeLockDescription: "Evita que la pantalla se apague durante este canto en vivo",
    wakeLockError: "Este dispositivo no pudo mantener la pantalla encendida. Revisa la batería o la configuración del navegador.",
    lowBandwidthDescription: "El modo de bajo consumo reduce las animaciones y oculta las vistas previas.",
    fullDisplayDescription: "El modo completo muestra movimiento, tiempos y vistas previas.",
    chant: "Canto",
    cycle: "ronda",
    of: "de",
    leaderChantProgress: "Progreso del canto de quien guía",
    everyoneChantProgress: "Progreso del canto de todas las personas",
    waitingForChantText: "Esperando el texto del canto.",
    help: "Ayuda",
    helpOpen: "Ayuda abierta",
    lowBandwidth: "Bajo consumo",
    lowBandwidthOn: "Bajo consumo activo",
    largeText: "Texto grande",
    largeTextOn: "Texto grande activo",
    highContrast: "Alto contraste",
    highContrastOn: "Alto contraste activo",
    helpPanelLabel: "Panel de ayuda y seguridad para participantes",
    viewingNow: "Viendo ahora",
    connected: "Conectado a actualizaciones en vivo",
    reconnecting: "Reconectando - las actualizaciones volverán automáticamente",
    offline: "Sin conexión - reconecta para recibir actualizaciones",
    connectionLostTitle: "Actualizaciones en vivo pausadas",
    connectionLostBody: "El cántico en pantalla es la última actualización recibida. Reconéctate antes de seguir nuevas instrucciones.",
    reconnectNow: "Reconectar ahora",
    offlinePrepTitle: "Prepara este evento para una señal débil",
    offlinePrepBody: "Guarda este evento mientras tengas conexión. Este dispositivo conservará el último cántico verificado si debes reabrir la página sin conexión.",
    offlineSave: "Guardar para señal débil",
    offlineSaved: "La copia sin conexión está lista en este dispositivo.",
    offlineSaveFailed: "Este navegador no pudo guardar la copia. Revisa la navegación privada o la configuración de almacenamiento.",
    offlineCopyTitle: "Mostrando una copia guardada sin conexión",
    offlineCopyBody: "Esta información puede estar desactualizada. No sigas nuevas instrucciones de movimiento o seguridad hasta recuperar las actualizaciones en vivo.",
    offlineStoredAt: "Última verificación",
    offlineForget: "Olvidar evento guardado",
    offlineForgotten: "El evento guardado se eliminó de este dispositivo.",
    offlinePrivacy: "Se guarda solo en este dispositivo. La copia no incluye mensajes, registros, votos ni comentarios del participante.",
    leader: "Guía",
    everyone: "Todos",
    next: "A continuación",
    waitNext: "Esperando el siguiente canto...",
    pageStops: "Si la página deja de actualizarse",
    pageStopsBody: "Quédate en esta página. Si dice reconectando por más de unos segundos, usa refrescar conexión.",
    refresh: "Refrescar conexión",
    visibility: "Si es difícil ver",
    visibilityBody: "Activa texto grande o alto contraste. Acércate al organizador si necesitas señales de audio.",
    plansChange: "Si los planes cambian",
    plansChangeBody: "Sigue primero las instrucciones del organizador. ChantLive muestra el ritmo, pero la seguridad local tiene prioridad.",
    signalTitle: "Enviar una señal al organizador",
    signalBody: "Avisa si el ritmo, sonido o acceso necesita atención. Tu teléfono no muestra tu nombre.",
    tooFast: "Muy rápido",
    tooSlow: "Muy lento",
    cantHear: "No escucho",
    allGood: "Todo bien",
    signalSent: "Señal enviada al organizador.",
    signalRecovered: "Tu señal anterior se recuperó después de reconectar.",
    signalReceiptFailed: "No se pudo recuperar tu señal guardada. Los demás controles en vivo siguen funcionando.",
    retrySignal: "Reintentar recibo de señal",
    signalRecordedAt: "Registrada",
    signalPrivate: "Solo este dispositivo puede recuperar este recibo de la actividad. No se guardan tu nombre ni la clave original del dispositivo.",
    supportTitle: "Si necesitas apoyo",
    supportBody: "Pide a un marshal o ayudante de accesibilidad el enlace simple, un lugar más tranquilo, instrucciones repetidas o ayuda para leer.",
    needAccessibility: "Necesito accesibilidad",
    needConnection: "Necesito conexión",
    needSafety: "Necesito seguridad",
    organizerNotified: "Organizador avisado. Quédate donde estás si es seguro.",
    participation: "Progreso de participación",
    participationBody: "Gana puntos por acciones útiles como registrarte, votar, enviar señales, hacer preguntas y dar comentarios.",
    points: "puntos",
    firstBadge: "Regístrate o envía una señal para ganar tu primera insignia.",
    livePoll: "Encuesta en vivo",
    noPoll: "No hay encuesta abierta. Si el organizador pregunta algo al grupo, aparecerá aquí.",
    voteGuidance: "Elige una opción. Puedes cambiar tu voto mientras la encuesta esté abierta.",
    voteCounted: "Tu último voto fue contado. Puedes cambiarlo mientras la encuesta esté abierta.",
    pollOpen: "Abierta",
    pollClosed: "Cerrada",
    decisionRecorded: "Decisión registrada",
    decisionOutcome: "Resultado",
    decisionReason: "Motivo del organizador",
    outcomeUnavailable: "Resultado no disponible",
    pollDecisionRetained: "Esta decisión y tu recibo privado de voto se conservan después de reconectar.",
    voteRecovered: "Tu voto anterior se recuperó del almacenamiento compartido.",
    pollReceiptFailed: "No se pudo recuperar la última encuesta o tu recibo privado. Los demás controles en vivo siguen funcionando.",
    retryPollReceipt: "Reintentar recibo de voto",
    safetyCheck: "Chequeo de seguridad",
    noSafetyCheck: "No hay chequeo de seguridad activo. Si hace falta pasar lista, aparecerá aquí.",
    incidentActive: "Aviso de incidente del organizador",
    incidentRoute: "Cambio de ruta",
    incidentSeparation: "Separación del grupo",
    incidentWeather: "Clima o condiciones del lugar",
    incidentAccessibility: "Interrupción de accesibilidad",
    incidentGeneral: "Interrupción general",
    incidentInstruction: "Qué hacer ahora",
    incidentRespond: "Envía una respuesta para que los organizadores puedan contar al grupo.",
    incidentAllClear: "Aviso de normalidad del organizador",
    incidentResolvedAt: "Resuelto",
    incidentDismiss: "Cerrar aviso",
    incidentResponseRecorded: "Tu última respuesta quedó registrada.",
    incidentResponseRecovered: "Tu respuesta anterior se recuperó del servidor después de volver a conectar.",
    optionalSafetyNote: "Nota opcional, punto de encuentro o apoyo necesario...",
    imOk: "Estoy bien",
    needHelp: "Necesito ayuda",
    leaving: "Me voy ahora",
    notSure: "No estoy seguro",
    safetyGuidance: "Responde una vez para que los organizadores sepan si alguien necesita atención.",
    safetyCounted: "Tu respuesta de seguridad fue contada. Puedes actualizarla mientras esté abierta.",
    checkInTitle: "Registrarte con el organizador",
    checkInBody: "Avisa que estás aquí y qué rol puedes apoyar. El nombre es opcional.",
    optionalName: "Nombre o equipo opcional",
    participant: "Participante",
    marshal: "Marshal",
    speaker: "Orador",
    accessibilityHelper: "Ayuda de accesibilidad",
    askOrganizer: "Preguntar al organizador",
    askBody: "Envía una pregunta anónima sin interrumpir el canto.",
    askPlaceholder: "Escribe una pregunta corta...",
    sendQuestion: "Enviar pregunta",
    raisedQuestions: "Preguntas del grupo",
    noQuestions: "No hay preguntas abiertas.",
    voteUp: "Votar",
    rateExperience: "Calificar experiencia",
    rateBody: "Envía comentarios rápidos para que el organizador revise después.",
    clearFollow: "Fácil de seguir",
    feltSafe: "Me sentí seguro",
    accessible: "Accesible",
    feedbackNote: "Nota opcional...",
    sendFeedback: "Enviar comentarios",
    language: "Idioma",
    eventCode: "Código del evento",
    calendar: "Calendario",
    addToCalendar: "Añadir al calendario",
    googleCalendar: "Google Calendar",
    outlookCalendar: "Outlook Calendar",
    downloadCalendarFile: "Descargar archivo de calendario (.ics)",
    calendarDownloaded: "Invitación de calendario descargada.",
    calendarFailed: "No se pudo añadir la fecha al calendario.",
    copy: "Copiar",
    copyCode: "Copiar código",
    copyEventCode: "Copiar código del evento",
    eventCodeCopied: "Código del evento copiado.",
    copyLink: "Copiar enlace",
    participantLinkCopied: "Enlace del evento copiado.",
    noAccountOrScanner: "No necesitas una cuenta ni escanear un código QR.",
    shareEvent: "Compartir evento",
    eventShared: "Evento compartido.",
    eventInvitationCopied: "Invitación al evento copiada.",
    manualShareCopy: "No se puede compartir ni copiar. Selecciona y copia la invitación completa a continuación.",
    shareEventCode: "Comparte el código del evento",
    join: "Únete a",
    joinThisEvent: "Únete a este evento de ChantLive",
    connecting: "Conectando...",
    waitingNetwork: "Esperando conexión...",
    offlineLoadingBody: "Parece que no tienes conexión. Reconéctate para recibir los cánticos en vivo.",
    connectingBody: "Si tarda demasiado, actualiza la conexión o pide al organizador que confirme el QR o enlace.",
    retryConnection: "Actualizar conexión",
    notFound: "No se encontró la demostración",
    couldNotConnect: "No pudimos conectar con este evento",
    recoveryBody: "Comprueba el enlace de participante o intenta conectarte de nuevo.",
    recoveryStepsTitle: "Qué comprobar",
    recoveryCheckCode: "Compara este código con el mensaje del organizador.",
    recoveryOpenLink: "Si recibiste un enlace completo, ábrelo de nuevo desde el mensaje original.",
    recoveryAskOrganizer: "Pregunta al organizador si el evento sigue disponible.",
    copyRecoveryDetails: "Copiar detalles para el organizador",
    recoveryDetailsCopied: "Detalles copiados. Envíalos al organizador.",
    recoveryDetailsManual: "No se pudo copiar. Selecciona y copia los detalles a continuación.",
    checkedEventCode: "Código comprobado",
    tryAgain: "Intentar de nuevo",
    differentEventCode: "Introducir otro código de evento",
    savedShortcutRemoved: "El evento no disponible se eliminó del acceso reciente de este dispositivo.",
    waitingToBegin: "Esperando a que comience...",
    eventDetails: "Detalles del evento",
    when: "Cuándo",
    where: "Dónde",
    meet: "Punto de encuentro",
    arrival: "Llegada",
    openDirections: "Abrir indicaciones",
    waitingBody: "Mantén esta página abierta. Los cánticos aparecerán automáticamente cuando el organizador inicie la demostración.",
    waitingOfflineStatus: "Sin conexión - reconéctate para recibir los cánticos",
    waitingConnectedStatus: "Conectado y esperando al organizador",
    supportEvent: "Apoyar este evento",
    whileWaiting: "Mientras esperas",
    waitTipOpen: "Mantén esta página abierta.",
    waitTipAudio: "Quédate cerca del organizador o del orador si necesitas señales de audio.",
    waitTipRefresh: "Si la página deja de actualizarse, actualiza la conexión.",
    waitingOfflineBody: "Estás sin conexión. Reconéctate antes de que comience la demostración para recibir los cánticos en vivo.",
    eventEnded: "La demostración ha terminado",
    endedNextStep: "Gracias por participar. Puedes cerrar esta página o pedir al organizador el siguiente enlace de participante.",
    joinAnotherEvent: "Unirse a otro evento",
    feedbackSent: "Comentarios enviados. Gracias.",
    feedbackFailed: "No se pudieron enviar los comentarios. Avísale directamente al organizador.",
  },
  fr: {
    announcementEveryone: "Message de l'organisateur pour tout le monde",
    announcementParticipants: "Message de l'organisateur pour les participants",
    announcementMarshals: "Message de l'organisateur pour les responsables de sécurité",
    announcementSpeakers: "Message de l'organisateur pour les intervenants",
    announcementAccessibility: "Message pour les aides à l'accessibilité",
    dismiss: "Fermer",
    organizerAction: "Action de l'organisateur",
    opensOrganizerPage: "Ouvre une page fournie par l'organisateur dans un nouvel onglet.",
    votes: "votes",
    voteSent: "Vote envoyé.",
    voteFailed: "Impossible d'envoyer le vote. Réessayez ou prévenez un organisateur.",
    assistanceFailed: "Impossible de prévenir l'organisateur. Demandez de l'aide à une personne proche.",
    questionSent: "Question envoyée à l'organisateur.",
    questionFailed: "Impossible d'envoyer la question. Adressez-vous directement à un organisateur.",
    questionReceipts: "Vos reçus privés de questions",
    noQuestionReceipts: "Les questions envoyées depuis cet appareil apparaîtront ici.",
    questionOpen: "En attente de l’organisateur",
    questionAnswering: "Réponse en cours",
    questionAnswered: "Répondue",
    questionDismissed: "Fermée sans réponse publique",
    withdrawQuestion: "Retirer la question",
    confirmWithdrawQuestion: "Confirmer le retrait",
    keepQuestion: "Garder la question",
    questionWithdrawn: "Question retirée.",
    questionWithdrawFailed: "La question ne peut pas être retirée. Elle est peut-être déjà en cours.",
    nowAnswering: "L’organisateur répond",
    publishedAnswer: "Réponse de l’organisateur",
    waitingAnswer: "Gardez cette page ouverte. La réponse partagée apparaîtra ici.",
    questionReceiptPrivacy: "Seul cet appareil récupère vos reçus. Les organisateurs voient un identifiant anonyme propre à l’événement.",
    safetyResponseSent: "Réponse de sécurité envoyée.",
    safetyResponseFailed: "Impossible d'envoyer la réponse de sécurité. Prévenez directement un responsable ou un organisateur.",
    checkedIn: "Présence confirmée",
    checkedInAs: "Présence confirmée comme",
    checkInFailed: "Impossible de confirmer votre présence. Dites à un organisateur que vous êtes là.",
    everyoneRespondNow: "Tout le monde répond maintenant",
    leaderSpeakingNow: "Le meneur parle maintenant",
    readBlueResponse: "Lisez ensemble la réponse bleue.",
    listenOrangeCall: "Écoutez l'appel orange.",
    keepScreenOn: "Garder l'écran allumé",
    screenStaysOn: "L'écran reste allumé",
    wakeLockActive: "Le maintien de l'écran est actif",
    wakeLockDescription: "Empêche l'écran de s'éteindre pendant ce chant en direct",
    wakeLockError: "Cet appareil n'a pas pu garder l'écran allumé. Vérifiez la batterie ou les réglages du navigateur.",
    lowBandwidthDescription: "Le mode faible bande passante réduit les animations et masque les aperçus.",
    fullDisplayDescription: "Le mode complet affiche les animations, le rythme et les aperçus.",
    chant: "Chant",
    cycle: "cycle",
    of: "sur",
    leaderChantProgress: "Progression du chant du meneur",
    everyoneChantProgress: "Progression du chant de tout le monde",
    waitingForChantText: "En attente du texte du chant.",
    help: "Aide",
    helpOpen: "Aide ouverte",
    lowBandwidth: "Faible bande passante",
    lowBandwidthOn: "Faible bande passante activée",
    largeText: "Grand texte",
    largeTextOn: "Grand texte activé",
    highContrast: "Contraste élevé",
    highContrastOn: "Contraste élevé activé",
    helpPanelLabel: "Panneau d’aide et de sécurité des participants",
    viewingNow: "En ligne",
    connected: "Connecté aux mises à jour",
    reconnecting: "Reconnexion - les mises à jour reprendront",
    offline: "Hors ligne - reconnectez-vous",
    connectionLostTitle: "Mises à jour en direct interrompues",
    connectionLostBody: "Le chant affiché est la dernière mise à jour reçue. Reconnectez-vous avant de suivre de nouvelles consignes.",
    reconnectNow: "Se reconnecter",
    offlinePrepTitle: "Préparer cet événement pour un signal faible",
    offlinePrepBody: "Enregistrez cet événement pendant que vous êtes connecté. Cet appareil conservera le dernier chant vérifié si la page doit être rouverte hors ligne.",
    offlineSave: "Enregistrer pour signal faible",
    offlineSaved: "La copie hors ligne est prête sur cet appareil.",
    offlineSaveFailed: "Ce navigateur n’a pas pu enregistrer la copie. Vérifiez la navigation privée ou les réglages de stockage.",
    offlineCopyTitle: "Affichage d’une copie hors ligne enregistrée",
    offlineCopyBody: "Ces informations peuvent être anciennes. Ne suivez aucune nouvelle consigne de déplacement ou de sécurité avant le retour des mises à jour en direct.",
    offlineStoredAt: "Dernière vérification",
    offlineForget: "Oublier l’événement enregistré",
    offlineForgotten: "L’événement hors ligne a été supprimé de cet appareil.",
    offlinePrivacy: "Stocké uniquement sur cet appareil. La copie n’inclut pas les messages, présences, votes ou avis du participant.",
    leader: "Meneur",
    everyone: "Tout le monde",
    next: "À suivre",
    waitNext: "En attente du prochain chant...",
    pageStops: "Si la page ne se met plus à jour",
    pageStopsBody: "Restez sur cette page. Si la reconnexion dure plus de quelques secondes, actualisez la connexion.",
    refresh: "Actualiser la connexion",
    visibility: "Si la visibilité est difficile",
    visibilityBody: "Activez le grand texte ou le contraste élevé. Rapprochez-vous de l'organisateur si vous avez besoin de repères audio.",
    plansChange: "Si les plans changent",
    plansChangeBody: "Suivez d'abord les consignes de l'organisateur. La sécurité locale reste prioritaire.",
    signalTitle: "Envoyer un signal",
    signalBody: "Dites si le rythme, le son ou l'accès doit être amélioré. Votre téléphone n'affiche pas votre nom.",
    tooFast: "Trop vite",
    tooSlow: "Trop lent",
    cantHear: "Je n'entends pas",
    allGood: "Tout va bien",
    signalSent: "Signal envoyé.",
    signalRecovered: "Votre signal précédent a été récupéré après la reconnexion.",
    signalReceiptFailed: "Votre signal enregistré n’a pas pu être récupéré. Les autres commandes restent disponibles.",
    retrySignal: "Réessayer le reçu du signal",
    signalRecordedAt: "Enregistré",
    signalPrivate: "Seul cet appareil peut récupérer ce reçu lié à l’événement. Votre nom et la clé brute de l’appareil ne sont pas stockés.",
    supportTitle: "Si vous avez besoin d'aide",
    supportBody: "Demandez le lien simple, un lieu plus calme, des consignes répétées ou de l'aide pour lire.",
    needAccessibility: "Besoin d'accessibilité",
    needConnection: "Besoin de connexion",
    needSafety: "Besoin de sécurité",
    organizerNotified: "Organisateur prévenu. Restez où vous êtes si c'est sûr.",
    participation: "Participation",
    participationBody: "Gagnez des points en vous enregistrant, votant, envoyant des signaux, posant des questions et donnant un avis.",
    points: "points",
    firstBadge: "Enregistrez-vous ou envoyez un signal pour gagner votre premier badge.",
    livePoll: "Sondage en direct",
    noPoll: "Aucun sondage ouvert. Si l'organisateur pose une question, elle apparaîtra ici.",
    voteGuidance: "Choisissez une option. Vous pouvez changer votre vote tant que le sondage est ouvert.",
    voteCounted: "Votre vote est compté. Vous pouvez le changer tant que le sondage est ouvert.",
    pollOpen: "Ouvert",
    pollClosed: "Fermé",
    decisionRecorded: "Décision enregistrée",
    decisionOutcome: "Résultat",
    decisionReason: "Motif de l’organisateur",
    outcomeUnavailable: "Résultat indisponible",
    pollDecisionRetained: "Cette décision et votre reçu de vote privé sont conservés après la reconnexion.",
    voteRecovered: "Votre vote précédent a été récupéré depuis le stockage partagé.",
    pollReceiptFailed: "Le dernier sondage ou votre reçu privé n’a pas pu être récupéré. Les autres commandes restent disponibles.",
    retryPollReceipt: "Réessayer le reçu de vote",
    safetyCheck: "Contrôle de sécurité",
    noSafetyCheck: "Aucun contrôle de sécurité actif. Il apparaîtra ici si nécessaire.",
    incidentActive: "Alerte d’incident de l’organisateur",
    incidentRoute: "Changement d’itinéraire",
    incidentSeparation: "Séparation du groupe",
    incidentWeather: "Météo ou conditions du site",
    incidentAccessibility: "Perturbation d’accessibilité",
    incidentGeneral: "Perturbation générale",
    incidentInstruction: "À faire maintenant",
    incidentRespond: "Envoyez une réponse pour aider les organisateurs à comptabiliser le groupe.",
    incidentAllClear: "Fin d’alerte de l’organisateur",
    incidentResolvedAt: "Résolu",
    incidentDismiss: "Fermer la fin d’alerte",
    incidentResponseRecorded: "Votre dernière réponse est enregistrée.",
    incidentResponseRecovered: "Votre réponse précédente a été restaurée depuis le serveur après la reconnexion.",
    optionalSafetyNote: "Note facultative, lieu de rendez-vous ou aide nécessaire...",
    imOk: "Je vais bien",
    needHelp: "Besoin d'aide",
    leaving: "Je pars",
    notSure: "Pas sûr",
    safetyGuidance: "Répondez pour que les organisateurs sachent si quelqu'un a besoin d'aide.",
    safetyCounted: "Votre réponse est comptée. Vous pouvez la modifier tant que le contrôle est ouvert.",
    checkInTitle: "Signaler votre présence",
    checkInBody: "Indiquez que vous êtes là et le rôle que vous pouvez aider. Le nom est facultatif.",
    optionalName: "Nom ou équipe facultatif",
    participant: "Participant",
    marshal: "Marshal",
    speaker: "Intervenant",
    accessibilityHelper: "Aide accessibilité",
    askOrganizer: "Question à l'organisateur",
    askBody: "Envoyez une question anonyme sans interrompre le chant.",
    askPlaceholder: "Écrivez une courte question...",
    sendQuestion: "Envoyer",
    raisedQuestions: "Questions posées",
    noQuestions: "Aucune question ouverte.",
    voteUp: "Voter",
    rateExperience: "Évaluer l'expérience",
    rateBody: "Envoyez un avis rapide pour l'organisateur.",
    clearFollow: "Facile à suivre",
    feltSafe: "Je me suis senti en sécurité",
    accessible: "Accessible",
    feedbackNote: "Note facultative...",
    sendFeedback: "Envoyer l'avis",
    language: "Langue",
    eventCode: "Code de l'événement",
    calendar: "Calendrier",
    addToCalendar: "Ajouter au calendrier",
    googleCalendar: "Google Agenda",
    outlookCalendar: "Calendrier Outlook",
    downloadCalendarFile: "Télécharger le fichier calendrier (.ics)",
    calendarDownloaded: "Invitation calendrier téléchargée.",
    calendarFailed: "La date n'a pas pu être ajoutée au calendrier.",
    copy: "Copier",
    copyCode: "Copier le code",
    copyEventCode: "Copier le code de l'événement",
    eventCodeCopied: "Code de l'événement copié.",
    copyLink: "Copier le lien",
    participantLinkCopied: "Lien de l’événement copié.",
    noAccountOrScanner: "Aucun compte ni scanner de code QR n’est nécessaire.",
    shareEvent: "Partager l'événement",
    eventShared: "Événement partagé.",
    eventInvitationCopied: "Invitation à l'événement copiée.",
    manualShareCopy: "Le partage et la copie sont indisponibles. Sélectionnez et copiez l’invitation complète ci-dessous.",
    shareEventCode: "Partagez le code de l'événement",
    join: "Rejoindre",
    joinThisEvent: "Rejoindre cet événement ChantLive",
    connecting: "Connexion...",
    waitingNetwork: "En attente du réseau...",
    offlineLoadingBody: "Vous semblez hors ligne. Reconnectez-vous pour recevoir les chants en direct.",
    connectingBody: "Si cela prend trop de temps, actualisez la connexion ou demandez à l'organisateur de confirmer le QR ou le lien.",
    retryConnection: "Actualiser la connexion",
    notFound: "Manifestation introuvable",
    couldNotConnect: "Impossible de se connecter à cet événement",
    recoveryBody: "Vérifiez le lien participant ou essayez de vous reconnecter.",
    recoveryStepsTitle: "Points à vérifier",
    recoveryCheckCode: "Comparez ce code avec le message de l’organisateur.",
    recoveryOpenLink: "Si vous avez reçu un lien complet, ouvrez-le à nouveau depuis le message d’origine.",
    recoveryAskOrganizer: "Demandez à l’organisateur si l’événement est toujours disponible.",
    copyRecoveryDetails: "Copier les détails pour l’organisateur",
    recoveryDetailsCopied: "Détails copiés. Envoyez-les à l’organisateur.",
    recoveryDetailsManual: "La copie a échoué. Sélectionnez et copiez les détails ci-dessous.",
    checkedEventCode: "Code vérifié",
    tryAgain: "Réessayer",
    differentEventCode: "Saisir un autre code d'événement",
    savedShortcutRemoved: "L’événement indisponible a été retiré du raccourci récent sur cet appareil.",
    waitingToBegin: "En attente du début...",
    eventDetails: "Détails de l'événement",
    when: "Quand",
    where: "Où",
    meet: "Point de rendez-vous",
    arrival: "Arrivée",
    openDirections: "Ouvrir l’itinéraire",
    waitingBody: "Gardez cette page ouverte. Les chants apparaîtront automatiquement lorsque l'organisateur lancera la manifestation.",
    waitingOfflineStatus: "Hors ligne - reconnectez-vous pour recevoir les chants",
    waitingConnectedStatus: "Connecté et en attente de l'organisateur",
    supportEvent: "Soutenir cet événement",
    whileWaiting: "Pendant l'attente",
    waitTipOpen: "Gardez cette page ouverte.",
    waitTipAudio: "Restez près de l'organisateur ou de l'intervenant si vous avez besoin de repères audio.",
    waitTipRefresh: "Si la page ne se met plus à jour, actualisez la connexion.",
    waitingOfflineBody: "Vous êtes hors ligne. Reconnectez-vous avant le début pour recevoir les chants en direct.",
    eventEnded: "La manifestation est terminée",
    endedNextStep: "Merci d'avoir participé. Vous pouvez fermer cette page ou demander à l'organisateur le prochain lien participant.",
    joinAnotherEvent: "Rejoindre un autre événement",
    feedbackSent: "Avis envoyé. Merci.",
    feedbackFailed: "Impossible d'envoyer l'avis. Prévenez directement un organisateur.",
  },
  ar: {
    announcementEveryone: "تحديث من المنظم للجميع",
    announcementParticipants: "تحديث من المنظم للمشاركين",
    announcementMarshals: "تحديث من المنظم للمشرفين الميدانيين",
    announcementSpeakers: "تحديث من المنظم للمتحدثين",
    announcementAccessibility: "تحديث لمساعدي الوصول",
    dismiss: "إغلاق",
    organizerAction: "إجراء من المنظم",
    opensOrganizerPage: "يفتح صفحة يوفرها المنظم في علامة تبويب جديدة.",
    votes: "أصوات",
    voteSent: "تم إرسال التصويت.",
    voteFailed: "تعذر إرسال التصويت. حاول مرة أخرى أو أخبر المنظم.",
    assistanceFailed: "تعذر إبلاغ المنظم. اطلب المساعدة من شخص قريب.",
    questionSent: "تم إرسال السؤال إلى المنظم.",
    questionFailed: "تعذر إرسال السؤال. اسأل المنظم مباشرة.",
    questionReceipts: "إيصالات أسئلتك الخاصة",
    noQuestionReceipts: "ستظهر هنا الأسئلة المرسلة من هذا الجهاز.",
    questionOpen: "بانتظار المنظم",
    questionAnswering: "تتم الإجابة الآن",
    questionAnswered: "تمت الإجابة",
    questionDismissed: "أُغلق دون إجابة عامة",
    withdrawQuestion: "سحب السؤال",
    confirmWithdrawQuestion: "تأكيد السحب",
    keepQuestion: "الاحتفاظ بالسؤال",
    questionWithdrawn: "تم سحب السؤال.",
    questionWithdrawFailed: "تعذر سحب السؤال. ربما بدأت الإجابة عليه.",
    nowAnswering: "المنظم يجيب الآن",
    publishedAnswer: "إجابة المنظم",
    waitingAnswer: "أبقِ هذه الصفحة مفتوحة. ستظهر الإجابة المشتركة هنا.",
    questionReceiptPrivacy: "هذا الجهاز وحده يستعيد إيصالاتك. يرى المنظمون معرّفاً مجهولاً خاصاً بالفعالية.",
    safetyResponseSent: "تم إرسال رد السلامة.",
    safetyResponseFailed: "تعذر إرسال رد السلامة. أخبر مشرفاً ميدانياً أو المنظم مباشرة.",
    checkedIn: "تم تسجيل الحضور",
    checkedInAs: "تم تسجيل الحضور بصفة",
    checkInFailed: "تعذر تسجيل الحضور. أخبر المنظم أنك موجود.",
    everyoneRespondNow: "الجميع يرد الآن",
    leaderSpeakingNow: "القائد يتحدث الآن",
    readBlueResponse: "اقرؤوا الرد الأزرق معاً.",
    listenOrangeCall: "استمعوا إلى النداء البرتقالي.",
    keepScreenOn: "إبقاء الشاشة مضاءة",
    screenStaysOn: "ستبقى الشاشة مضاءة",
    wakeLockActive: "إبقاء الشاشة مفعّل",
    wakeLockDescription: "يمنع الشاشة من السكون أثناء الهتاف المباشر",
    wakeLockError: "تعذّر إبقاء الشاشة مضاءة على هذا الجهاز. تحقق من البطارية أو إعدادات المتصفح.",
    lowBandwidthDescription: "يقلل وضع الاتصال الضعيف الحركة ويخفي معاينات الهتاف التالي.",
    fullDisplayDescription: "يعرض الوضع الكامل الحركة والتوقيت ومعاينات الهتاف التالي.",
    chant: "الهتاف",
    cycle: "الدورة",
    of: "من",
    leaderChantProgress: "تقدم هتاف القائد",
    everyoneChantProgress: "تقدم هتاف الجميع",
    waitingForChantText: "بانتظار نص الهتاف.",
    help: "مساعدة",
    helpOpen: "المساعدة مفتوحة",
    lowBandwidth: "وضع الاتصال الضعيف",
    lowBandwidthOn: "وضع الاتصال الضعيف مفعل",
    largeText: "نص كبير",
    largeTextOn: "النص الكبير مفعل",
    highContrast: "تباين عال",
    highContrastOn: "التباين العالي مفعل",
    helpPanelLabel: "لوحة مساعدة وسلامة المشاركين",
    viewingNow: "يشاهد الآن",
    connected: "متصل بالتحديثات المباشرة",
    reconnecting: "إعادة الاتصال - ستعود التحديثات تلقائياً",
    offline: "غير متصل - أعد الاتصال للتحديثات",
    connectionLostTitle: "توقفت التحديثات المباشرة مؤقتًا",
    connectionLostBody: "الهتاف الظاهر هو آخر تحديث تم استلامه. أعد الاتصال قبل اتباع تعليمات جديدة.",
    reconnectNow: "إعادة الاتصال الآن",
    offlinePrepTitle: "جهّز هذه الفعالية لضعف الإشارة",
    offlinePrepBody: "احفظ الفعالية أثناء الاتصال. سيحتفظ هذا الجهاز بآخر هتاف تم التحقق منه إذا احتجت إلى إعادة فتح الصفحة دون اتصال.",
    offlineSave: "حفظ عند ضعف الإشارة",
    offlineSaved: "النسخة غير المتصلة جاهزة على هذا الجهاز.",
    offlineSaveFailed: "تعذر على هذا المتصفح حفظ النسخة. تحقق من التصفح الخاص أو إعدادات التخزين.",
    offlineCopyTitle: "يتم عرض نسخة محفوظة غير متصلة",
    offlineCopyBody: "قد تكون هذه المعلومات قديمة. لا تتبع تعليمات حركة أو سلامة جديدة حتى تعود التحديثات المباشرة.",
    offlineStoredAt: "آخر تحقق",
    offlineForget: "حذف الفعالية المحفوظة",
    offlineForgotten: "تم حذف الفعالية المحفوظة من هذا الجهاز.",
    offlinePrivacy: "محفوظة على هذا الجهاز فقط. لا تتضمن النسخة رسائل المشاركين أو تسجيل الحضور أو التصويت أو الملاحظات.",
    leader: "القائد",
    everyone: "الجميع",
    next: "التالي",
    waitNext: "بانتظار الهتاف التالي...",
    pageStops: "إذا توقفت الصفحة عن التحديث",
    pageStopsBody: "ابق على هذه الصفحة. إذا استمرت إعادة الاتصال، اضغط تحديث الاتصال.",
    refresh: "تحديث الاتصال",
    visibility: "إذا كانت الرؤية صعبة",
    visibilityBody: "فعّل النص الكبير أو التباين العالي. اقترب من المنظم إذا احتجت إلى إشارات صوتية.",
    plansChange: "إذا تغيرت الخطة",
    plansChangeBody: "اتبع تعليمات المنظم أولاً. تعليمات السلامة المحلية لها الأولوية.",
    signalTitle: "أرسل إشارة للمنظم",
    signalBody: "أخبر المنظم إذا كان الإيقاع أو الصوت أو الوصول يحتاج إلى انتباه. لا يظهر اسمك.",
    tooFast: "سريع جداً",
    tooSlow: "بطيء جداً",
    cantHear: "لا أسمع",
    allGood: "كل شيء جيد",
    signalSent: "تم إرسال الإشارة.",
    signalRecovered: "تمت استعادة إشارتك السابقة بعد إعادة الاتصال.",
    signalReceiptFailed: "تعذر استعادة إشارتك المحفوظة. تبقى أدوات البث الأخرى متاحة.",
    retrySignal: "إعادة محاولة استعادة إيصال الإشارة",
    signalRecordedAt: "سُجلت",
    signalPrivate: "هذا الجهاز فقط يمكنه استعادة هذا الإيصال الخاص بالفعالية. لا يُحفظ اسمك أو مفتاح الجهاز الأصلي.",
    supportTitle: "إذا احتجت دعماً",
    supportBody: "اطلب الرابط البسيط أو مكاناً أهدأ أو تكرار التعليمات أو مساعدة في القراءة.",
    needAccessibility: "أحتاج مساعدة وصول",
    needConnection: "أحتاج مساعدة اتصال",
    needSafety: "أحتاج مساعدة سلامة",
    organizerNotified: "تم تنبيه المنظم. ابق مكانك إذا كان آمناً.",
    participation: "تقدم المشاركة",
    participationBody: "اكسب نقاطاً عبر تسجيل الحضور والتصويت وإرسال الإشارات والأسئلة والتعليقات.",
    points: "نقاط",
    firstBadge: "سجل حضورك أو أرسل إشارة لتحصل على أول شارة.",
    livePoll: "تصويت مباشر",
    noPoll: "لا يوجد تصويت مفتوح الآن. إذا سأل المنظم سؤالاً سيظهر هنا.",
    voteGuidance: "اختر خياراً واحداً. يمكنك تغيير صوتك ما دام التصويت مفتوحاً.",
    voteCounted: "تم احتساب صوتك. يمكنك تغييره ما دام التصويت مفتوحاً.",
    pollOpen: "مفتوح",
    pollClosed: "مغلق",
    decisionRecorded: "تم تسجيل القرار",
    decisionOutcome: "النتيجة",
    decisionReason: "سبب قرار المنظم",
    outcomeUnavailable: "النتيجة غير متاحة",
    pollDecisionRetained: "يُحتفظ بهذا القرار وإيصال تصويتك الخاص بعد إعادة الاتصال.",
    voteRecovered: "تمت استعادة تصويتك السابق من التخزين المشترك.",
    pollReceiptFailed: "تعذر استعادة آخر تصويت أو إيصال تصويتك الخاص. تبقى أدوات البث الأخرى متاحة.",
    retryPollReceipt: "إعادة محاولة استعادة الإيصال",
    safetyCheck: "فحص السلامة",
    noSafetyCheck: "لا يوجد فحص سلامة نشط. سيظهر هنا عند الحاجة.",
    incidentActive: "تنبيه مباشر من المنظم",
    incidentRoute: "تغيير المسار",
    incidentSeparation: "انفصال المجموعة",
    incidentWeather: "الطقس أو ظروف الموقع",
    incidentAccessibility: "تعطّل إمكانية الوصول",
    incidentGeneral: "اضطراب عام",
    incidentInstruction: "ما يجب فعله الآن",
    incidentRespond: "أرسل ردًا واحدًا ليتمكن المنظمون من الاطمئنان على المجموعة.",
    incidentAllClear: "إعلان انتهاء التنبيه من المنظم",
    incidentResolvedAt: "تم الحل",
    incidentDismiss: "إغلاق إعلان انتهاء التنبيه",
    incidentResponseRecorded: "تم تسجيل أحدث رد لك.",
    incidentResponseRecovered: "تمت استعادة ردك السابق من الخادم بعد إعادة الاتصال.",
    optionalSafetyNote: "ملاحظة اختيارية أو نقطة لقاء أو دعم مطلوب...",
    imOk: "أنا بخير",
    needHelp: "أحتاج مساعدة",
    leaving: "أغادر الآن",
    notSure: "لست متأكداً",
    safetyGuidance: "أجب مرة واحدة ليعرف المنظمون إن كان أحد يحتاج انتباهاً.",
    safetyCounted: "تم احتساب رد السلامة. يمكنك تحديثه ما دام الفحص مفتوحاً.",
    checkInTitle: "سجل حضورك مع المنظم",
    checkInBody: "أخبر المنظم أنك هنا وما الدور الذي يمكنك المساعدة به. الاسم اختياري.",
    optionalName: "اسم أو فريق اختياري",
    participant: "مشارك",
    marshal: "منسق",
    speaker: "متحدث",
    accessibilityHelper: "مساعد وصول",
    askOrganizer: "اسأل المنظم",
    askBody: "أرسل سؤالاً مجهولاً دون مقاطعة الهتاف.",
    askPlaceholder: "اكتب سؤالاً قصيراً...",
    sendQuestion: "إرسال السؤال",
    raisedQuestions: "أسئلة المجموعة",
    noQuestions: "لا توجد أسئلة مفتوحة.",
    voteUp: "تصويت",
    rateExperience: "قيّم التجربة",
    rateBody: "أرسل ملاحظات سريعة للمنظم.",
    clearFollow: "سهل المتابعة",
    feltSafe: "شعرت بالأمان",
    accessible: "سهل الوصول",
    feedbackNote: "ملاحظة اختيارية...",
    sendFeedback: "إرسال الملاحظات",
    language: "اللغة",
    eventCode: "رمز الفعالية",
    calendar: "التقويم",
    addToCalendar: "إضافة إلى التقويم",
    googleCalendar: "تقويم Google",
    outlookCalendar: "تقويم Outlook",
    downloadCalendarFile: "تنزيل ملف التقويم (.ics)",
    calendarDownloaded: "تم تنزيل دعوة التقويم.",
    calendarFailed: "تعذرت إضافة موعد الفعالية إلى التقويم.",
    copy: "نسخ",
    copyCode: "نسخ الرمز",
    copyEventCode: "نسخ رمز الفعالية",
    eventCodeCopied: "تم نسخ رمز الفعالية.",
    copyLink: "نسخ الرابط",
    participantLinkCopied: "تم نسخ رابط الفعالية.",
    noAccountOrScanner: "لا تحتاج إلى حساب أو مسح رمز QR.",
    shareEvent: "مشاركة الفعالية",
    eventShared: "تمت مشاركة الفعالية.",
    eventInvitationCopied: "تم نسخ دعوة الفعالية.",
    manualShareCopy: "المشاركة والنسخ غير متاحين. حدّد دعوة الفعالية الكاملة أدناه وانسخها.",
    shareEventCode: "شارك رمز الفعالية",
    join: "انضم إلى",
    joinThisEvent: "انضم إلى فعالية ChantLive هذه",
    connecting: "جارٍ الاتصال...",
    waitingNetwork: "في انتظار الشبكة...",
    offlineLoadingBody: "يبدو أنك غير متصل. أعد الاتصال لتلقي الهتافات المباشرة.",
    connectingBody: "إذا استغرق ذلك وقتًا طويلًا، حدّث الاتصال أو اطلب من المنظم تأكيد رمز QR أو الرابط.",
    retryConnection: "تحديث الاتصال",
    notFound: "لم يتم العثور على الفعالية",
    couldNotConnect: "تعذر الاتصال بهذه الفعالية",
    recoveryBody: "تحقق من رابط المشارك أو حاول الاتصال مرة أخرى.",
    recoveryStepsTitle: "ما يجب التحقق منه",
    recoveryCheckCode: "قارن هذا الرمز برسالة المنظم.",
    recoveryOpenLink: "إذا تلقيت رابطًا كاملاً، فافتحه مرة أخرى من الرسالة الأصلية.",
    recoveryAskOrganizer: "اسأل المنظم عما إذا كانت الفعالية ما زالت متاحة.",
    copyRecoveryDetails: "نسخ التفاصيل للمنظم",
    recoveryDetailsCopied: "تم نسخ التفاصيل. أرسلها إلى المنظم.",
    recoveryDetailsManual: "تعذر النسخ. حدّد التفاصيل أدناه وانسخها.",
    checkedEventCode: "رمز الفعالية الذي تم التحقق منه",
    tryAgain: "حاول مرة أخرى",
    differentEventCode: "أدخل رمز فعالية آخر",
    savedShortcutRemoved: "تمت إزالة الفعالية غير المتاحة من الاختصار الأخير على هذا الجهاز.",
    waitingToBegin: "في انتظار البدء...",
    eventDetails: "تفاصيل الفعالية",
    when: "الوقت",
    where: "المكان",
    meet: "نقطة التجمع",
    arrival: "الوصول",
    openDirections: "فتح الاتجاهات",
    waitingBody: "أبقِ هذه الصفحة مفتوحة. ستظهر الهتافات تلقائيًا عندما يبدأ المنظم الفعالية.",
    waitingOfflineStatus: "غير متصل - أعد الاتصال لتلقي الهتافات",
    waitingConnectedStatus: "متصل وفي انتظار المنظم",
    supportEvent: "دعم هذه الفعالية",
    whileWaiting: "أثناء الانتظار",
    waitTipOpen: "أبقِ هذه الصفحة مفتوحة.",
    waitTipAudio: "ابق قريبًا من المنظم أو المتحدث إذا احتجت إلى إشارات صوتية.",
    waitTipRefresh: "إذا توقفت الصفحة عن التحديث، حدّث الاتصال.",
    waitingOfflineBody: "أنت غير متصل. أعد الاتصال قبل بدء الفعالية لتظهر الهتافات المباشرة.",
    eventEnded: "انتهت الفعالية",
    endedNextStep: "شكرًا لمشاركتك. يمكنك إغلاق الصفحة أو طلب رابط المشارك التالي من المنظم.",
    joinAnotherEvent: "الانضمام إلى فعالية أخرى",
    feedbackSent: "تم إرسال الملاحظات. شكرًا لك.",
    feedbackFailed: "تعذر إرسال الملاحظات. أخبر المنظم مباشرة.",
  },
  fa: {
    announcementEveryone: "به‌روزرسانی برگزارکننده برای همه",
    announcementParticipants: "به‌روزرسانی برگزارکننده برای شرکت‌کنندگان",
    announcementMarshals: "به‌روزرسانی برگزارکننده برای مسئولان میدانی",
    announcementSpeakers: "به‌روزرسانی برگزارکننده برای سخنرانان",
    announcementAccessibility: "به‌روزرسانی برای کمک‌یاران دسترسی",
    dismiss: "بستن",
    organizerAction: "اقدام برگزارکننده",
    opensOrganizerPage: "صفحه‌ای را که برگزارکننده ارائه کرده در برگه‌ای تازه باز می‌کند.",
    votes: "رأی",
    voteSent: "رأی ارسال شد.",
    voteFailed: "رأی ارسال نشد. دوباره تلاش کنید یا به برگزارکننده بگویید.",
    assistanceFailed: "برگزارکننده مطلع نشد. از فردی نزدیک کمک بخواهید.",
    questionSent: "پرسش برای برگزارکننده ارسال شد.",
    questionFailed: "پرسش ارسال نشد. مستقیماً از برگزارکننده بپرسید.",
    questionReceipts: "رسیدهای خصوصی پرسش‌های شما",
    noQuestionReceipts: "پرسش‌های ارسال‌شده از این دستگاه اینجا دیده می‌شوند.",
    questionOpen: "در انتظار برگزارکننده",
    questionAnswering: "در حال پاسخ‌گویی",
    questionAnswered: "پاسخ داده شد",
    questionDismissed: "بدون پاسخ عمومی بسته شد",
    withdrawQuestion: "پس گرفتن پرسش",
    confirmWithdrawQuestion: "تأیید پس گرفتن",
    keepQuestion: "نگه داشتن پرسش",
    questionWithdrawn: "پرسش پس گرفته شد.",
    questionWithdrawFailed: "پرسش پس گرفته نشد. شاید پاسخ‌گویی آغاز شده باشد.",
    nowAnswering: "برگزارکننده در حال پاسخ است",
    publishedAnswer: "پاسخ برگزارکننده",
    waitingAnswer: "این صفحه را باز نگه دارید. پاسخ مشترک اینجا ظاهر می‌شود.",
    questionReceiptPrivacy: "فقط این دستگاه رسیدهای شما را بازیابی می‌کند. برگزارکنندگان یک شناسه ناشناس ویژه رویداد می‌بینند.",
    safetyResponseSent: "پاسخ ایمنی ارسال شد.",
    safetyResponseFailed: "پاسخ ایمنی ارسال نشد. مستقیماً به مسئول میدانی یا برگزارکننده بگویید.",
    checkedIn: "حضور ثبت شد",
    checkedInAs: "حضور ثبت شد به‌عنوان",
    checkInFailed: "حضور ثبت نشد. به برگزارکننده بگویید که اینجا هستید.",
    everyoneRespondNow: "همه اکنون پاسخ دهند",
    leaderSpeakingNow: "رهبر اکنون صحبت می‌کند",
    readBlueResponse: "پاسخ آبی را با هم بخوانید.",
    listenOrangeCall: "به ندای نارنجی گوش دهید.",
    keepScreenOn: "روشن نگه داشتن صفحه",
    screenStaysOn: "صفحه روشن می‌ماند",
    wakeLockActive: "روشن ماندن صفحه فعال است",
    wakeLockDescription: "از خاموش شدن صفحه هنگام شعار زنده جلوگیری می‌کند",
    wakeLockError: "این دستگاه نتوانست صفحه را روشن نگه دارد. باتری یا تنظیمات مرورگر را بررسی کنید.",
    lowBandwidthDescription: "حالت اینترنت ضعیف حرکت را کاهش می‌دهد و پیش‌نمایش شعار بعدی را پنهان می‌کند.",
    fullDisplayDescription: "حالت کامل حرکت، زمان‌بندی و پیش‌نمایش شعار بعدی را نشان می‌دهد.",
    chant: "شعار",
    cycle: "دور",
    of: "از",
    leaderChantProgress: "پیشرفت شعار رهبر",
    everyoneChantProgress: "پیشرفت شعار همه",
    waitingForChantText: "در انتظار متن شعار.",
    help: "کمک",
    helpOpen: "کمک باز است",
    lowBandwidth: "مصرف کم اینترنت",
    lowBandwidthOn: "مصرف کم اینترنت روشن",
    largeText: "متن بزرگ",
    largeTextOn: "متن بزرگ روشن",
    highContrast: "کنتراست بالا",
    highContrastOn: "کنتراست بالا روشن",
    helpPanelLabel: "پنل کمک و ایمنی شرکت‌کنندگان",
    viewingNow: "در حال مشاهده",
    connected: "به به‌روزرسانی زنده وصل است",
    reconnecting: "در حال اتصال دوباره - به‌روزرسانی‌ها خودکار برمی‌گردند",
    offline: "آفلاین - برای دریافت به‌روزرسانی دوباره وصل شوید",
    connectionLostTitle: "به‌روزرسانی زنده متوقف شده است",
    connectionLostBody: "شعار روی صفحه آخرین به‌روزرسانی دریافت‌شده است. پیش از دنبال کردن دستورهای جدید دوباره وصل شوید.",
    reconnectNow: "اتصال دوباره",
    offlinePrepTitle: "این رویداد را برای آنتن ضعیف آماده کنید",
    offlinePrepBody: "رویداد را هنگام اتصال ذخیره کنید. اگر صفحه بدون اینترنت دوباره باز شود، این دستگاه آخرین شعار تأییدشده را نگه می‌دارد.",
    offlineSave: "ذخیره برای آنتن ضعیف",
    offlineSaved: "نسخه آفلاین روی این دستگاه آماده است.",
    offlineSaveFailed: "مرورگر نتوانست نسخه آفلاین را ذخیره کند. تنظیمات مرور خصوصی یا فضای ذخیره‌سازی را بررسی کنید.",
    offlineCopyTitle: "نمایش نسخه آفلاین ذخیره‌شده",
    offlineCopyBody: "ممکن است این اطلاعات قدیمی باشد. تا اتصال دوباره، دستور حرکت یا ایمنی جدیدی را دنبال نکنید.",
    offlineStoredAt: "آخرین تأیید",
    offlineForget: "حذف رویداد ذخیره‌شده",
    offlineForgotten: "رویداد آفلاین از این دستگاه حذف شد.",
    offlinePrivacy: "فقط روی این دستگاه ذخیره می‌شود. پیام‌ها، حضور، رأی‌ها یا بازخورد شرکت‌کننده در این نسخه ذخیره نمی‌شود.",
    leader: "رهبر",
    everyone: "همه",
    next: "بعدی",
    waitNext: "در انتظار شعار بعدی...",
    pageStops: "اگر صفحه به‌روز نشد",
    pageStopsBody: "در همین صفحه بمانید. اگر اتصال دوباره طول کشید، دکمه تازه‌سازی اتصال را بزنید.",
    refresh: "تازه‌سازی اتصال",
    visibility: "اگر دیدن سخت است",
    visibilityBody: "متن بزرگ یا کنتراست بالا را روشن کنید. اگر راهنمای صوتی لازم دارید به برگزارکننده نزدیک‌تر شوید.",
    plansChange: "اگر برنامه تغییر کرد",
    plansChangeBody: "اول دستور برگزارکننده را دنبال کنید. دستورهای ایمنی محلی اولویت دارند.",
    signalTitle: "ارسال علامت به برگزارکننده",
    signalBody: "اگر سرعت، صدا یا دسترسی نیاز به توجه دارد اطلاع دهید. نام شما نمایش داده نمی‌شود.",
    tooFast: "خیلی سریع",
    tooSlow: "خیلی کند",
    cantHear: "نمی‌شنوم",
    allGood: "همه چیز خوب است",
    signalSent: "علامت ارسال شد.",
    signalRecovered: "علامت قبلی شما پس از اتصال دوباره بازیابی شد.",
    signalReceiptFailed: "علامت ذخیره‌شده بازیابی نشد. سایر کنترل‌های زنده همچنان کار می‌کنند.",
    retrySignal: "تلاش دوباره برای رسید علامت",
    signalRecordedAt: "ثبت‌شده",
    signalPrivate: "فقط این دستگاه می‌تواند این رسید مخصوص رویداد را بازیابی کند. نام و کلید خام دستگاه ذخیره نمی‌شود.",
    supportTitle: "اگر کمک لازم دارید",
    supportBody: "از راهنما یا کمک‌یار دسترسی لینک ساده، جای آرام‌تر، تکرار دستورها یا کمک برای خواندن بخواهید.",
    needAccessibility: "کمک دسترسی لازم دارم",
    needConnection: "کمک اتصال لازم دارم",
    needSafety: "کمک ایمنی لازم دارم",
    organizerNotified: "برگزارکننده مطلع شد. اگر امن است همان‌جا بمانید.",
    participation: "پیشرفت مشارکت",
    participationBody: "با اعلام حضور، رأی دادن، ارسال علامت، سؤال و بازخورد امتیاز بگیرید.",
    points: "امتیاز",
    firstBadge: "اعلام حضور کنید یا علامت بفرستید تا اولین نشان را بگیرید.",
    livePoll: "نظرسنجی زنده",
    noPoll: "فعلاً نظرسنجی زنده‌ای نیست. اگر برگزارکننده سؤال گروهی بپرسد اینجا می‌آید.",
    voteGuidance: "یک گزینه انتخاب کنید. تا وقتی باز است می‌توانید رأی را تغییر دهید.",
    voteCounted: "آخرین رأی شما ثبت شد. تا وقتی باز است می‌توانید تغییر دهید.",
    pollOpen: "باز",
    pollClosed: "بسته",
    decisionRecorded: "تصمیم ثبت شد",
    decisionOutcome: "نتیجه",
    decisionReason: "دلیل برگزارکننده",
    outcomeUnavailable: "نتیجه در دسترس نیست",
    pollDecisionRetained: "این تصمیم و رسید خصوصی رأی شما پس از اتصال دوباره نگهداری می‌شود.",
    voteRecovered: "رأی قبلی شما از فضای ذخیره‌سازی مشترک بازیابی شد.",
    pollReceiptFailed: "آخرین نظرسنجی یا رسید خصوصی رأی شما بازیابی نشد. سایر کنترل‌های زنده همچنان کار می‌کنند.",
    retryPollReceipt: "تلاش دوباره برای رسید رأی",
    safetyCheck: "بررسی ایمنی",
    noSafetyCheck: "بررسی ایمنی فعال نیست. اگر لازم شود اینجا نمایش داده می‌شود.",
    incidentActive: "هشدار زنده برگزارکننده",
    incidentRoute: "تغییر مسیر",
    incidentSeparation: "جدا شدن گروه",
    incidentWeather: "آب‌وهوا یا شرایط محل",
    incidentAccessibility: "اختلال دسترس‌پذیری",
    incidentGeneral: "اختلال عمومی",
    incidentInstruction: "اکنون چه کاری انجام دهید",
    incidentRespond: "یک پاسخ بفرستید تا برگزارکنندگان بتوانند وضعیت گروه را بررسی کنند.",
    incidentAllClear: "پایان هشدار برگزارکننده",
    incidentResolvedAt: "برطرف شد",
    incidentDismiss: "بستن پیام پایان هشدار",
    incidentResponseRecorded: "آخرین پاسخ شما ثبت شد.",
    incidentResponseRecovered: "پاسخ قبلی شما پس از اتصال دوباره از سرور بازیابی شد.",
    optionalSafetyNote: "یادداشت اختیاری، محل دیدار یا کمک موردنیاز...",
    imOk: "من خوبم",
    needHelp: "کمک لازم دارم",
    leaving: "دارم می‌روم",
    notSure: "مطمئن نیستم",
    safetyGuidance: "یک پاسخ بدهید تا برگزارکنندگان بدانند کسی نیاز به توجه دارد یا نه.",
    safetyCounted: "پاسخ ایمنی شما ثبت شد. تا وقتی باز است می‌توانید به‌روزرسانی کنید.",
    checkInTitle: "اعلام حضور به برگزارکننده",
    checkInBody: "بگویید اینجا هستید و چه نقشی می‌توانید کمک کنید. نام اختیاری است.",
    optionalName: "نام یا تیم اختیاری",
    participant: "شرکت‌کننده",
    marshal: "راهنما",
    speaker: "سخنران",
    accessibilityHelper: "کمک‌یار دسترسی",
    askOrganizer: "از برگزارکننده بپرسید",
    askBody: "بدون قطع کردن شعار، سؤال ناشناس بفرستید.",
    askPlaceholder: "یک سؤال کوتاه بنویسید...",
    sendQuestion: "ارسال سؤال",
    raisedQuestions: "سؤال‌های مطرح‌شده",
    noQuestions: "سؤال بازی نیست.",
    voteUp: "رأی مثبت",
    rateExperience: "ارزیابی تجربه",
    rateBody: "بازخورد کوتاه برای بررسی برگزارکننده بفرستید.",
    clearFollow: "پیگیری آسان بود",
    feltSafe: "احساس امنیت داشتم",
    accessible: "دسترس‌پذیر بود",
    feedbackNote: "یادداشت اختیاری...",
    sendFeedback: "ارسال بازخورد",
    language: "زبان",
    eventCode: "کد رویداد",
    calendar: "تقویم",
    addToCalendar: "افزودن به تقویم",
    googleCalendar: "تقویم Google",
    outlookCalendar: "تقویم Outlook",
    downloadCalendarFile: "دانلود فایل تقویم (.ics)",
    calendarDownloaded: "دعوت‌نامه تقویم دانلود شد.",
    calendarFailed: "زمان رویداد به تقویم افزوده نشد.",
    copy: "کپی",
    copyCode: "کپی کد",
    copyEventCode: "کپی کد رویداد",
    eventCodeCopied: "کد رویداد کپی شد.",
    copyLink: "کپی لینک",
    participantLinkCopied: "لینک رویداد کپی شد.",
    noAccountOrScanner: "به حساب کاربری یا اسکن کد QR نیاز ندارید.",
    shareEvent: "اشتراک‌گذاری رویداد",
    eventShared: "رویداد به اشتراک گذاشته شد.",
    eventInvitationCopied: "دعوت‌نامه رویداد کپی شد.",
    manualShareCopy: "اشتراک‌گذاری و کپی در دسترس نیست. دعوت‌نامه کامل زیر را انتخاب و کپی کنید.",
    shareEventCode: "کد رویداد را به اشتراک بگذارید",
    join: "پیوستن به",
    joinThisEvent: "پیوستن به این رویداد ChantLive",
    connecting: "در حال اتصال...",
    waitingNetwork: "در انتظار شبکه...",
    offlineLoadingBody: "به نظر می‌رسد آفلاین هستید. برای دریافت شعارهای زنده دوباره وصل شوید.",
    connectingBody: "اگر اتصال طول کشید، اتصال را تازه کنید یا از برگزارکننده بخواهید کد QR یا لینک را تأیید کند.",
    retryConnection: "تازه‌سازی اتصال",
    notFound: "رویداد پیدا نشد",
    couldNotConnect: "اتصال به این رویداد ممکن نشد",
    recoveryBody: "لینک شرکت‌کننده را بررسی کنید یا دوباره متصل شوید.",
    recoveryStepsTitle: "مواردی که باید بررسی شوند",
    recoveryCheckCode: "این کد را با پیام برگزارکننده مقایسه کنید.",
    recoveryOpenLink: "اگر لینک کامل دریافت کرده‌اید، آن را دوباره از پیام اصلی باز کنید.",
    recoveryAskOrganizer: "از برگزارکننده بپرسید آیا رویداد هنوز در دسترس است.",
    copyRecoveryDetails: "کپی جزئیات برای برگزارکننده",
    recoveryDetailsCopied: "جزئیات کپی شد. آن را برای برگزارکننده بفرستید.",
    recoveryDetailsManual: "کپی انجام نشد. جزئیات زیر را انتخاب و کپی کنید.",
    checkedEventCode: "کد رویداد بررسی‌شده",
    tryAgain: "تلاش دوباره",
    differentEventCode: "وارد کردن کد رویداد دیگر",
    savedShortcutRemoved: "رویداد در دسترس نبود و از میان‌بر اخیر این دستگاه حذف شد.",
    waitingToBegin: "در انتظار شروع...",
    eventDetails: "جزئیات رویداد",
    when: "زمان",
    where: "مکان",
    meet: "محل دیدار",
    arrival: "راهنمای ورود",
    openDirections: "باز کردن مسیر",
    waitingBody: "این صفحه را باز نگه دارید. با شروع رویداد توسط برگزارکننده، شعارها خودکار ظاهر می‌شوند.",
    waitingOfflineStatus: "آفلاین - برای دریافت شعارها دوباره وصل شوید",
    waitingConnectedStatus: "متصل و در انتظار برگزارکننده",
    supportEvent: "حمایت از این رویداد",
    whileWaiting: "در زمان انتظار",
    waitTipOpen: "این صفحه را باز نگه دارید.",
    waitTipAudio: "اگر راهنمای صوتی لازم دارید نزدیک برگزارکننده یا سخنران بمانید.",
    waitTipRefresh: "اگر صفحه به‌روز نشد، اتصال را تازه کنید.",
    waitingOfflineBody: "آفلاین هستید. پیش از شروع رویداد دوباره وصل شوید تا شعارهای زنده نمایش داده شوند.",
    eventEnded: "رویداد پایان یافته است",
    endedNextStep: "از همراهی شما سپاسگزاریم. می‌توانید صفحه را ببندید یا لینک بعدی را از برگزارکننده بخواهید.",
    joinAnotherEvent: "پیوستن به رویداد دیگر",
    feedbackSent: "بازخورد ارسال شد. سپاسگزاریم.",
    feedbackFailed: "بازخورد ارسال نشد. مستقیماً به برگزارکننده اطلاع دهید.",
  },
};
const attendanceCopy: Record<ParticipantLanguage, {
  title: string; body: string; exactPrivacy: string; firstJoin: string; visits: string; observed: string; lastSeen: string;
  forget: string; forgotten: string; restore: string; noRecord: string; error: string; pending: string; on: string; off: string; minutes: string;
}> = {
  en: { title: "Your anonymous attendance receipt", body: "This helps organisers understand reach and reconnection without knowing who you are.", exactPrivacy: "Stored: an event-only random session hash and join, last-seen, disconnect times. Never stored: IP address, device, location, account, chant activity, messages, or report content.", firstJoin: "First joined", visits: "Visits", observed: "Observed time", lastSeen: "Last seen", forget: "Forget this event's attendance", forgotten: "Attendance forgotten. This device is opted out for this event.", restore: "Share anonymous attendance again", noRecord: "No attendance is stored for this device and event.", error: "Your receipt is temporarily unavailable. Live chants are not affected.", pending: "The saved record will be erased automatically when this device reconnects.", on: "Anonymous attendance on", off: "Attendance sharing off", minutes: "min" },
  es: { title: "Tu recibo de asistencia anónima", body: "Ayuda a los organizadores a entender el alcance y las reconexiones sin saber quién eres.", exactPrivacy: "Se guarda: un identificador aleatorio cifrado solo para este evento y las horas de entrada, última actividad y salida. Nunca: IP, dispositivo, ubicación, cuenta, actividad, mensajes ni informes.", firstJoin: "Primera entrada", visits: "Visitas", observed: "Tiempo observado", lastSeen: "Última actividad", forget: "Olvidar mi asistencia a este evento", forgotten: "Asistencia olvidada. Este dispositivo no compartirá asistencia en este evento.", restore: "Volver a compartir asistencia anónima", noRecord: "No hay asistencia guardada para este dispositivo y evento.", error: "Tu recibo no está disponible temporalmente. Los cánticos en directo no se ven afectados.", pending: "El registro guardado se borrará automáticamente cuando este dispositivo vuelva a conectarse.", on: "Asistencia anónima activa", off: "Asistencia desactivada", minutes: "min" },
  fr: { title: "Votre reçu de présence anonyme", body: "Il aide les organisateurs à comprendre la portée et les reconnexions sans connaître votre identité.", exactPrivacy: "Conservé : un identifiant aléatoire haché propre à l’événement et les heures d’arrivée, de dernière activité et de départ. Jamais : adresse IP, appareil, position, compte, activité, messages ou signalements.", firstJoin: "Première arrivée", visits: "Visites", observed: "Temps observé", lastSeen: "Dernière activité", forget: "Oublier ma présence à cet événement", forgotten: "Présence oubliée. Cet appareil ne la partagera plus pour cet événement.", restore: "Partager à nouveau la présence anonyme", noRecord: "Aucune présence n’est conservée pour cet appareil et cet événement.", error: "Votre reçu est temporairement indisponible. Les chants en direct ne sont pas affectés.", pending: "L’enregistrement sera effacé automatiquement lorsque cet appareil se reconnectera.", on: "Présence anonyme active", off: "Partage de présence désactivé", minutes: "min" },
  ar: { title: "إيصال حضورك المجهول", body: "يساعد المنظمين على فهم الوصول وإعادة الاتصال دون معرفة هويتك.", exactPrivacy: "يُحفظ: معرّف عشوائي مُجزأ خاص بالفعالية وأوقات الانضمام وآخر ظهور والمغادرة. لا يُحفظ أبداً: عنوان IP أو الجهاز أو الموقع أو الحساب أو النشاط أو الرسائل أو البلاغات.", firstJoin: "أول انضمام", visits: "الزيارات", observed: "الوقت المرصود", lastSeen: "آخر ظهور", forget: "نسيان حضوري لهذه الفعالية", forgotten: "تم نسيان الحضور. أُوقف الإرسال من هذا الجهاز لهذه الفعالية.", restore: "مشاركة الحضور المجهول مجدداً", noRecord: "لا يوجد حضور محفوظ لهذا الجهاز وهذه الفعالية.", error: "إيصالك غير متاح مؤقتاً. لا تتأثر الهتافات المباشرة.", pending: "سيُحذف السجل المحفوظ تلقائياً عند إعادة اتصال هذا الجهاز.", on: "الحضور المجهول مفعّل", off: "مشاركة الحضور متوقفة", minutes: "دقيقة" },
  fa: { title: "رسید حضور ناشناس شما", body: "به برگزارکنندگان کمک می‌کند میزان دسترسی و اتصال دوباره را بدون شناخت هویت شما بفهمند.", exactPrivacy: "ذخیره می‌شود: شناسه تصادفی هش‌شده مخصوص رویداد و زمان‌های ورود، آخرین مشاهده و خروج. هرگز ذخیره نمی‌شود: IP، دستگاه، مکان، حساب، فعالیت، پیام یا گزارش.", firstJoin: "اولین ورود", visits: "بازدیدها", observed: "زمان مشاهده‌شده", lastSeen: "آخرین مشاهده", forget: "حضور این رویداد را فراموش کن", forgotten: "حضور حذف شد. این دستگاه برای این رویداد انصراف داده است.", restore: "اشتراک دوباره حضور ناشناس", noRecord: "هیچ حضوری برای این دستگاه و رویداد ذخیره نشده است.", error: "رسید شما موقتاً در دسترس نیست. شعارهای زنده تحت تأثیر نیستند.", pending: "رکورد ذخیره‌شده پس از اتصال دوباره این دستگاه خودکار حذف می‌شود.", on: "حضور ناشناس روشن", off: "اشتراک حضور خاموش", minutes: "دقیقه" },
};
const runSheetCopy: Record<ParticipantLanguage, {
  title: string; now: string; next: string; progress: string; stageOf: string;
  plannedMinutes: string; waiting: string; completed: string;
}> = {
  en: { title: "Event programme", now: "Now", next: "Next", progress: "Event progress", stageOf: "stage of", plannedMinutes: "planned minutes", waiting: "The organiser has not started the first stage yet.", completed: "The planned programme is complete." },
  es: { title: "Programa del evento", now: "Ahora", next: "A continuación", progress: "Progreso del evento", stageOf: "etapa de", plannedMinutes: "minutos previstos", waiting: "El organizador aún no ha iniciado la primera etapa.", completed: "El programa previsto ha terminado." },
  fr: { title: "Programme de l’événement", now: "Maintenant", next: "Ensuite", progress: "Progression de l’événement", stageOf: "étape sur", plannedMinutes: "minutes prévues", waiting: "L’organisateur n’a pas encore lancé la première étape.", completed: "Le programme prévu est terminé." },
  ar: { title: "برنامج الفعالية", now: "الآن", next: "التالي", progress: "تقدم الفعالية", stageOf: "مرحلة من", plannedMinutes: "دقائق مخططة", waiting: "لم يبدأ المنظم المرحلة الأولى بعد.", completed: "اكتمل البرنامج المخطط." },
  fa: { title: "برنامه رویداد", now: "اکنون", next: "بعدی", progress: "پیشرفت رویداد", stageOf: "مرحله از", plannedMinutes: "دقیقه برنامه‌ریزی‌شده", waiting: "برگزارکننده هنوز مرحله اول را شروع نکرده است.", completed: "برنامه برنامه‌ریزی‌شده به پایان رسیده است." },
};
const programmeCopy: Record<ParticipantLanguage, {
  fullProgramme: string;
  programmeHelp: string;
  completedStage: string;
  currentStage: string;
  upcomingStage: string;
  skippedStage: string;
}> = {
  en: { fullProgramme: "View full programme", programmeHelp: "Public stages and planned timing from the organiser", completedStage: "Completed", currentStage: "Now", upcomingStage: "Upcoming", skippedStage: "Skipped" },
  es: { fullProgramme: "Ver programa completo", programmeHelp: "Etapas públicas y horario previsto por el organizador", completedStage: "Completada", currentStage: "Ahora", upcomingStage: "Próxima", skippedStage: "Omitida" },
  fr: { fullProgramme: "Voir le programme complet", programmeHelp: "Étapes publiques et horaires prévus par l’organisateur", completedStage: "Terminée", currentStage: "Maintenant", upcomingStage: "À venir", skippedStage: "Ignorée" },
  ar: { fullProgramme: "عرض البرنامج الكامل", programmeHelp: "المراحل العامة والتوقيت المخطط من المنظم", completedStage: "مكتملة", currentStage: "الآن", upcomingStage: "قادمة", skippedStage: "تم تخطيها" },
  fa: { fullProgramme: "مشاهده برنامه کامل", programmeHelp: "مراحل عمومی و زمان‌بندی برنامه‌ریزی‌شده توسط برگزارکننده", completedStage: "تکمیل‌شده", currentStage: "اکنون", upcomingStage: "پیش رو", skippedStage: "ردشده" },
};
const conductCopy: Record<ParticipantLanguage, {
  title: string; body: string; privacy: string; emergency: string; category: string;
  categories: Record<ConductReportCategory, string>; followUp: string; urgent: string;
  details: string; placeholder: string; submit: string; sent: string; duplicate: string;
  failed: string; myReports: string; noReports: string; refresh: string; response: string;
  statuses: Record<ConductReport["status"], string>; reference: string; privateLabel: string; urgencyLabel: string; minimumLabel: string;
}> = {
  en: {
    title: "Privately report a conduct concern",
    body: "Tell verified event organisers about harassment, unsafe behaviour, a privacy concern, or harmful misinformation.",
    privacy: "Private to this event's organisers. Your name, phone number, and location are not requested.",
    emergency: "ChantLive is not an emergency service. If anyone is in immediate danger, move to safety and contact local emergency services or a nearby marshal.",
    category: "Concern category",
    categories: { harassment: "Harassment", unsafe_behavior: "Unsafe behaviour", privacy: "Privacy concern", misinformation: "Harmful misinformation", other: "Other concern" },
    followUp: "Can follow up", urgent: "Needs attention now", details: "What happened?", placeholder: "Describe what organisers need to know. Avoid names or identifying details unless essential.",
    submit: "Send private report", sent: "Private report sent. Keep the reference below.", duplicate: "This matching open report already exists; its receipt is shown below.", failed: "The private report was not sent. Move to safety and tell a marshal directly if help is needed.",
    myReports: "Your private report receipts", noReports: "No private reports sent from this device for this event.", refresh: "Refresh status", response: "Organiser response", statuses: { open: "Sent", acknowledged: "Seen by organiser", resolved: "Resolved" }, reference: "Reference", privateLabel: "Private", urgencyLabel: "Urgency", minimumLabel: "minimum",
  },
  es: {
    title: "Informar en privado de una conducta", body: "Avisa a los organizadores verificados sobre acoso, conducta insegura, privacidad o desinformación dañina.", privacy: "Privado para los organizadores del evento. No se pide tu nombre, teléfono ni ubicación.", emergency: "ChantLive no es un servicio de emergencias. Si hay peligro inmediato, ve a un lugar seguro y contacta con emergencias locales o un responsable cercano.", category: "Categoría", categories: { harassment: "Acoso", unsafe_behavior: "Conducta insegura", privacy: "Privacidad", misinformation: "Desinformación dañina", other: "Otro" }, followUp: "Puede esperar", urgent: "Necesita atención ahora", details: "¿Qué ocurrió?", placeholder: "Describe lo que los organizadores deben saber. Evita datos identificativos salvo que sean esenciales.", submit: "Enviar informe privado", sent: "Informe privado enviado. Conserva la referencia.", duplicate: "Ya existe un informe abierto igual; se muestra su recibo.", failed: "No se envió el informe. Ve a un lugar seguro y avisa directamente a un responsable si necesitas ayuda.", myReports: "Tus recibos privados", noReports: "No hay informes privados de este dispositivo para este evento.", refresh: "Actualizar estado", response: "Respuesta del organizador", statuses: { open: "Enviado", acknowledged: "Visto por el organizador", resolved: "Resuelto" }, reference: "Referencia", privateLabel: "Privado", urgencyLabel: "Urgencia", minimumLabel: "mínimo",
  },
  fr: {
    title: "Signaler un problème de conduite en privé", body: "Informez les organisateurs vérifiés d'un harcèlement, d'un comportement dangereux, d'un problème de confidentialité ou d'une désinformation nuisible.", privacy: "Privé pour les organisateurs de cet événement. Votre nom, téléphone et position ne sont pas demandés.", emergency: "ChantLive n'est pas un service d'urgence. En cas de danger immédiat, mettez-vous en sécurité et contactez les secours locaux ou un responsable proche.", category: "Catégorie", categories: { harassment: "Harcèlement", unsafe_behavior: "Comportement dangereux", privacy: "Confidentialité", misinformation: "Désinformation nuisible", other: "Autre" }, followUp: "Suivi possible", urgent: "Attention immédiate", details: "Que s'est-il passé ?", placeholder: "Décrivez ce que les organisateurs doivent savoir. Évitez les données identifiantes sauf si elles sont essentielles.", submit: "Envoyer le signalement privé", sent: "Signalement privé envoyé. Gardez la référence.", duplicate: "Un signalement ouvert identique existe déjà ; son reçu est affiché.", failed: "Le signalement n'a pas été envoyé. Mettez-vous en sécurité et prévenez directement un responsable si nécessaire.", myReports: "Vos reçus privés", noReports: "Aucun signalement privé envoyé depuis cet appareil pour cet événement.", refresh: "Actualiser le statut", response: "Réponse de l'organisateur", statuses: { open: "Envoyé", acknowledged: "Vu par l'organisateur", resolved: "Résolu" }, reference: "Référence", privateLabel: "Privé", urgencyLabel: "Urgence", minimumLabel: "minimum",
  },
  ar: {
    title: "الإبلاغ الخاص عن مشكلة سلوك", body: "أبلغ منظمي الفعالية الموثقين عن تحرش أو سلوك غير آمن أو مشكلة خصوصية أو معلومات مضللة ضارة.", privacy: "خاص بمنظمي هذه الفعالية. لا نطلب اسمك أو رقم هاتفك أو موقعك.", emergency: "ChantLive ليست خدمة طوارئ. عند وجود خطر فوري، انتقل إلى مكان آمن واتصل بالطوارئ المحلية أو بمنظم قريب.", category: "فئة المشكلة", categories: { harassment: "تحرش", unsafe_behavior: "سلوك غير آمن", privacy: "خصوصية", misinformation: "معلومات مضللة ضارة", other: "أخرى" }, followUp: "يمكن متابعته لاحقاً", urgent: "يحتاج انتباهاً الآن", details: "ماذا حدث؟", placeholder: "اشرح ما يحتاج المنظمون إلى معرفته. تجنب بيانات التعريف إلا عند الضرورة.", submit: "إرسال بلاغ خاص", sent: "تم إرسال البلاغ الخاص. احتفظ بالمرجع.", duplicate: "يوجد بلاغ مفتوح مطابق؛ يظهر إيصالُه أدناه.", failed: "لم يُرسل البلاغ. انتقل إلى الأمان وأخبر منظماً مباشرة إذا احتجت للمساعدة.", myReports: "إيصالات بلاغاتك الخاصة", noReports: "لم تُرسل بلاغات خاصة من هذا الجهاز لهذه الفعالية.", refresh: "تحديث الحالة", response: "رد المنظم", statuses: { open: "تم الإرسال", acknowledged: "شاهده المنظم", resolved: "تم الحل" }, reference: "المرجع", privateLabel: "خاص", urgencyLabel: "الاستعجال", minimumLabel: "الحد الأدنى",
  },
  fa: {
    title: "گزارش خصوصی نگرانی رفتاری", body: "آزار، رفتار ناامن، نگرانی حریم خصوصی یا اطلاعات گمراه‌کننده زیان‌بار را به برگزارکنندگان تأییدشده اطلاع دهید.", privacy: "خصوصی برای برگزارکنندگان این رویداد. نام، شماره تلفن و موقعیت شما درخواست نمی‌شود.", emergency: "ChantLive خدمات اضطراری نیست. اگر خطر فوری وجود دارد، به محل امن بروید و با امداد محلی یا مسئول نزدیک تماس بگیرید.", category: "دسته نگرانی", categories: { harassment: "آزار", unsafe_behavior: "رفتار ناامن", privacy: "حریم خصوصی", misinformation: "اطلاعات گمراه‌کننده زیان‌بار", other: "سایر" }, followUp: "پیگیری بعدی", urgent: "نیازمند توجه فوری", details: "چه اتفاقی افتاد؟", placeholder: "آنچه برگزارکنندگان باید بدانند شرح دهید. جز در موارد ضروری از اطلاعات هویتی خودداری کنید.", submit: "ارسال گزارش خصوصی", sent: "گزارش خصوصی ارسال شد. مرجع را نگه دارید.", duplicate: "یک گزارش باز مشابه وجود دارد؛ رسید آن در پایین آمده است.", failed: "گزارش ارسال نشد. به محل امن بروید و در صورت نیاز مستقیماً به مسئول اطلاع دهید.", myReports: "رسیدهای خصوصی شما", noReports: "برای این رویداد گزارشی از این دستگاه ارسال نشده است.", refresh: "تازه‌سازی وضعیت", response: "پاسخ برگزارکننده", statuses: { open: "ارسال شد", acknowledged: "برگزارکننده دید", resolved: "حل شد" }, reference: "مرجع", privateLabel: "خصوصی", urgencyLabel: "فوریت", minimumLabel: "حداقل",
  },
};
const getAnnouncementAudienceLabel = (targetRole: OrganizerAnnouncement["targetRole"], copy: Record<string, string>) => {
  const labels: Record<OrganizerAnnouncement["targetRole"], string> = {
    all: copy.announcementEveryone,
    participant: copy.announcementParticipants,
    marshal: copy.announcementMarshals,
    speaker: copy.announcementSpeakers,
    accessibility: copy.announcementAccessibility,
  };

  return labels[targetRole];
};

const getChantAnnouncement = (chantData: ChantData | null, copy: Record<string, string>, language: ParticipantLanguage) => {
  if (!chantData || chantData.demoStatus !== "live") {
    return "";
  }

  const phaseLabel = chantData.currentPhase === "people" ? copy.everyone : copy.leader;
  const activeText = chantData.currentPhase === "people"
    ? chantData.responseText
    : chantData.callText;
  const chantNumber = chantData.chantIndex !== null ? chantData.chantIndex + 1 : null;
  const cycle = chantData.currentCycle ?? 1;
  const totalCycles = chantData.cycleCount ?? 1;
  const chantPosition = chantNumber
    ? `${copy.chant} ${formatParticipantNumber(chantNumber, language)} ${copy.of} ${formatParticipantNumber(chantData.totalChants, language)}. `
    : "";

  return `${chantPosition}${phaseLabel}, ${copy.cycle} ${formatParticipantNumber(cycle, language)} ${copy.of} ${formatParticipantNumber(totalCycles, language)}. ${activeText ?? copy.waitingForChantText}`;
};

export default function Participant() {
  const { publicId } = useParams<{ publicId: string }>();
  const initialOfflineSnapshot = useRef<OfflineEventSnapshot | null>(loadOfflineEvent(publicId));
  const initiallyOffline = typeof navigator !== "undefined" && !navigator.onLine;
  const [chantData, setChantData] = useState<ChantData | null>(() => initiallyOffline ? initialOfflineSnapshot.current?.chantData ?? null : null);
  const [viewerCount, setViewerCount] = useState(0);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef(getSocket());
  const [fadeIn, setFadeIn] = useState(false);
  const [phaseProgress, setPhaseProgress] = useState(0);
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== "undefined" && !navigator.onLine);
  const [largeText, setLargeText] = useState(() => localStorage.getItem("chant_large_text") === "true");
  const [highContrast, setHighContrast] = useState(() => localStorage.getItem("chant_high_contrast") === "true");
  const [lowBandwidth, setLowBandwidth] = useState(() => localStorage.getItem("chant_low_bandwidth") === "true");
  const [participantLanguage, setParticipantLanguage] = useState<ParticipantLanguage>(getDefaultParticipantLanguage);
  const [showHelp, setShowHelp] = useState(false);
  const [assistanceSent, setAssistanceSent] = useState<string | null>(null);
  const [assistanceError, setAssistanceError] = useState<string | null>(null);
  const [pulseReceipt, setPulseReceipt] = useState<CrowdPulseReceipt | null>(null);
  const [pulseStatus, setPulseStatus] = useState<"sent" | "recovered" | null>(null);
  const [pulseReceiptError, setPulseReceiptError] = useState(false);
  const [pulsePending, setPulsePending] = useState(false);
  const [announcement, setAnnouncement] = useState<OrganizerAnnouncement | null>(null);
  const [audienceQuestions, setAudienceQuestions] = useState<AudienceQuestion[]>([]);
  const [questionReceipts, setQuestionReceipts] = useState<AudienceQuestion[]>([]);
  const [questionSpotlight, setQuestionSpotlight] = useState<AudienceQuestion | null>(null);
  const [questionReceiptError, setQuestionReceiptError] = useState(false);
  const [withdrawQuestionPendingId, setWithdrawQuestionPendingId] = useState<string | null>(null);
  const [activePoll, setActivePoll] = useState<LivePoll | null>(null);
  const [pollVotes, setPollVotes] = useState<Record<string, string>>(getStoredPollVotes);
  const [pollStatus, setPollStatus] = useState<string | null>(null);
  const [pollReceiptError, setPollReceiptError] = useState(false);
  const [activeSafetyCheck, setActiveSafetyCheck] = useState<SafetyCheck | null>(null);
  const [dismissedIncidentId, setDismissedIncidentId] = useState<string | null>(() => localStorage.getItem("chant_dismissed_incident"));
  const [safetyResponses, setSafetyResponses] = useState<Record<string, string>>(getStoredSafetyResponses);
  const [recoveredSafetyResponseId, setRecoveredSafetyResponseId] = useState<string | null>(null);
  const [safetyNote, setSafetyNote] = useState("");
  const [safetyStatus, setSafetyStatus] = useState<string | null>(null);
  const [questionText, setQuestionText] = useState("");
  const [questionStatus, setQuestionStatus] = useState<string | null>(null);
  const [checkInName, setCheckInName] = useState(() => localStorage.getItem("chant_checkin_name") ?? "");
  const [checkedInRole, setCheckedInRole] = useState<CheckInRole | null>(() => localStorage.getItem("chant_checkin_role") as CheckInRole | null);
  const [checkInStatus, setCheckInStatus] = useState<string | null>(null);
  const [feedbackRatings, setFeedbackRatings] = useState({ clarity: 4, safety: 4, accessibility: 4 });
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState<string | null>(null);
  const [conductCategory, setConductCategory] = useState<ConductReportCategory>("harassment");
  const [conductUrgency, setConductUrgency] = useState<"urgent" | "follow_up">("follow_up");
  const [conductDetails, setConductDetails] = useState("");
  const [conductReports, setConductReports] = useState<ConductReport[]>([]);
  const [conductStatus, setConductStatus] = useState<string | null>(null);
  const [conductStatusError, setConductStatusError] = useState(false);
  const [conductLoading, setConductLoading] = useState(false);
  const [runSheet, setRunSheet] = useState<ParticipantRunSheet | null>(null);
  const [engagement, setEngagement] = useState<ParticipantEngagement | null>(null);
  const [attendanceReceipt, setAttendanceReceipt] = useState<AttendanceReceipt | null>(null);
  const [attendanceOptOut, setAttendanceOptOut] = useState(() => localStorage.getItem(`chant_attendance_opt_out_${publicId}`) === "true");
  const [attendanceDeletionPending, setAttendanceDeletionPending] = useState(() => localStorage.getItem(`chant_attendance_delete_pending_${publicId}`) === "true");
  const [attendanceStatus, setAttendanceStatus] = useState<string | null>(null);
  const [attendanceError, setAttendanceError] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [shareFallbackText, setShareFallbackText] = useState<string | null>(null);
  const [recoveryFallbackText, setRecoveryFallbackText] = useState<string | null>(null);
  const [calendarStatus, setCalendarStatus] = useState<string | null>(null);
  const [keepScreenAwake, setKeepScreenAwake] = useState(false);
  const [screenAwakeActive, setScreenAwakeActive] = useState(false);
  const [wakeLockError, setWakeLockError] = useState<string | null>(null);
  const [savedShortcutRemoved, setSavedShortcutRemoved] = useState(false);
  const [offlineSnapshot, setOfflineSnapshot] = useState<OfflineEventSnapshot | null>(initialOfflineSnapshot.current);
  const [usingOfflineSnapshot, setUsingOfflineSnapshot] = useState(() => initiallyOffline && Boolean(initialOfflineSnapshot.current));
  const [offlineStatus, setOfflineStatus] = useState<string | null>(null);
  const [offlineStatusError, setOfflineStatusError] = useState(false);
  const localPhaseStartRef = useRef(Date.now());
  const lowBandwidthRef = useRef(lowBandwidth);
  const checkedInRoleRef = useRef<CheckInRole | null>(checkedInRole);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const t = participantCopy[participantLanguage];
  const attendanceT = attendanceCopy[participantLanguage];
  const runSheetT = runSheetCopy[participantLanguage];
  const programmeT = programmeCopy[participantLanguage];
  const conductT = conductCopy[participantLanguage];
  const restoreSafetyResponse = (check: SafetyCheck | null) => {
    if (!check?.participantResponse) return;
    setSafetyResponses((current) => {
      const nextResponses = { ...current, [check.id]: check.participantResponse! };
      localStorage.setItem("chant_safety_responses", JSON.stringify(nextResponses));
      return nextResponses;
    });
    setRecoveredSafetyResponseId(check.id);
  };
  const wakeLockSupported = typeof navigator !== "undefined" && "wakeLock" in navigator;
  const participantDirection = participantLanguage === "ar" || participantLanguage === "fa" ? "rtl" : "ltr";
  const offlinePreparationMode = new URLSearchParams(window.location.search).get("offline") === "1";

  const renderParticipantLanguageSelect = (className = "") => (
    <label
      className={`inline-flex min-h-11 items-center gap-2 rounded-full border border-neutral-700 px-3 py-2 text-xs font-medium text-neutral-300 ${className}`}
      dir={participantDirection}
      data-testid="select-participant-language-label"
    >
      {t.language}
      <select
        value={participantLanguage}
        onChange={(event) => setParticipantLanguage(event.target.value as ParticipantLanguage)}
        className="min-h-11 rounded-md bg-black px-2 text-neutral-100 outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
        aria-label={t.language}
        data-testid="select-participant-language"
      >
        {participantLanguageOptions.map((option) => (
          <option key={option.code} value={option.code}>{option.label}</option>
        ))}
      </select>
    </label>
  );

  const getSessionId = () => {
    let sessionId = localStorage.getItem("chant_session_id");
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      localStorage.setItem("chant_session_id", sessionId);
    }
    return sessionId;
  };
  const refreshQuestionReceipts = async () => {
    try {
      const [receiptsResponse, spotlightResponse] = await Promise.all([
        fetch(`/api/public/demos/${publicId}/questions/mine?sessionId=${encodeURIComponent(getSessionId())}`),
        fetch(`/api/public/demos/${publicId}/questions/spotlight`),
      ]);
      if (!receiptsResponse.ok || !spotlightResponse.ok) throw new Error("Question receipts unavailable");
      const receipts = await receiptsResponse.json() as ParticipantQuestionReceipts;
      setQuestionReceipts(receipts.questions);
      setQuestionSpotlight(await spotlightResponse.json() as AudienceQuestion | null);
      setQuestionReceiptError(false);
    } catch {
      setQuestionReceiptError(true);
    }
  };
  const refreshPulseReceipt = async (announceRecovery = false) => {
    try {
      const response = await fetch(`/api/public/demos/${publicId}/pulse/receipt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: getSessionId() }),
      });
      if (!response.ok) throw new Error("Pulse receipt unavailable");
      const receipt = await response.json() as CrowdPulseReceipt | null;
      setPulseReceipt(receipt);
      if (announceRecovery && receipt) setPulseStatus("recovered");
      setPulseReceiptError(false);
    } catch {
      setPulseReceiptError(true);
    }
  };
  const refreshPollReceipt = async (announceRecovery = false) => {
    try {
      const response = await fetch(`/api/public/demos/${publicId}/polls/receipt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: getSessionId() }),
      });
      if (!response.ok) throw new Error("Poll receipt unavailable");
      const receipt = await response.json() as ParticipantPollReceipt | null;
      setActivePoll(receipt?.poll ?? null);
      if (receipt?.selectedOptionId) {
        const previousSelection = pollVotes[receipt.poll.id];
        const nextVotes = { ...getStoredPollVotes(), [receipt.poll.id]: receipt.selectedOptionId };
        localStorage.setItem("chant_poll_votes", JSON.stringify(nextVotes));
        setPollVotes(nextVotes);
        if (announceRecovery && previousSelection !== receipt.selectedOptionId) setPollStatus(t.voteRecovered);
      }
      setPollReceiptError(false);
    } catch {
      setPollReceiptError(true);
    }
  };
  const refreshConductReports = async (announce = false) => {
    setConductLoading(true);
    try {
      const response = await fetch(`/api/public/demos/${publicId}/conduct-reports?sessionId=${encodeURIComponent(getSessionId())}`);
      if (!response.ok) throw new Error("Could not load private reports");
      setConductReports(await response.json() as ConductReport[]);
      if (announce) {
        setConductStatus(conductT.refresh);
        setConductStatusError(false);
      }
    } catch {
      if (announce) {
        setConductStatus(conductT.failed);
        setConductStatusError(true);
      }
    } finally {
      setConductLoading(false);
    }
  };

  useEffect(() => {
    checkedInRoleRef.current = checkedInRole;
  }, [checkedInRole]);

  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOffline(!navigator.onLine);
    };

    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    updateOnlineStatus();

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  useEffect(() => {
    const stored = loadOfflineEvent(publicId);
    setOfflineSnapshot(stored);
    setOfflineStatus(null);
    if (!navigator.onLine && stored) {
      setChantData(stored.chantData);
      setUsingOfflineSnapshot(true);
      setError(null);
    }
  }, [publicId]);

  useEffect(() => {
    if (!isOffline || !offlineSnapshot) return;
    setChantData(offlineSnapshot.chantData);
    setUsingOfflineSnapshot(true);
    setError(null);
  }, [isOffline, offlineSnapshot]);

  useEffect(() => {
    setShareStatus(null);
    setShareFallbackText(null);
    setRecoveryFallbackText(null);
  }, [participantLanguage]);

  useEffect(() => {
    if (!chantData?.demoTitle) return;
    rememberParticipantEvent(publicId, chantData.demoTitle);
  }, [chantData?.demoTitle, publicId]);

  useEffect(() => {
    if (!error?.toLowerCase().includes("not found")) return;
    setSavedShortcutRemoved(forgetRecentParticipantEvent(publicId));
    forgetOfflineEvent(publicId);
    setOfflineSnapshot(null);
    setUsingOfflineSnapshot(false);
  }, [error, publicId]);

  useEffect(() => {
    const socket = socketRef.current;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("join_demo", { publicId, sessionId: getSessionId(), attendanceOptOut });
      void refreshPulseReceipt(true);
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on("chant_update", (data: ChantData) => {
      const refreshedOfflineSnapshot = updateOfflineEventIfPrepared(publicId, data);
      if (refreshedOfflineSnapshot) setOfflineSnapshot(refreshedOfflineSnapshot);
      setUsingOfflineSnapshot(false);
      if (lowBandwidthRef.current) {
        localPhaseStartRef.current = Date.now();
        setChantData(data);
        setFadeIn(true);
        return;
      }

      setFadeIn(false);
      setTimeout(() => {
        localPhaseStartRef.current = Date.now();
        setChantData(data);
        setFadeIn(true);
      }, 50);
    });

    socket.on("viewer_count", (count: number) => {
      setViewerCount(count);
    });

    socket.on("demo_ended", () => {
      setChantData((prev) => {
        if (!prev) return null;
        const ended = { ...prev, demoStatus: "ended", callText: null, responseText: null };
        const refreshedOfflineSnapshot = updateOfflineEventIfPrepared(publicId, ended);
        if (refreshedOfflineSnapshot) setOfflineSnapshot(refreshedOfflineSnapshot);
        return ended;
      });
    });

    socket.on("demo_error", (msg: string) => {
      setError(msg);
    });

    socket.on("organizer_announcement", (data: OrganizerAnnouncement) => {
      if (data.targetRole === "all" || data.targetRole === checkedInRoleRef.current) {
        setAnnouncement(data);
      }
    });

    socket.on("attendance_receipt", (receipt: AttendanceReceipt | null) => {
      setAttendanceReceipt(receipt);
      setAttendanceError(false);
    });
    socket.on("attendance_error", () => {
      setAttendanceError(true);
    });

    socket.on("question_update", (questions: AudienceQuestion[]) => {
      setAudienceQuestions(questions);
    });
    socket.on("question_spotlight", (question: AudienceQuestion | null) => {
      setQuestionSpotlight(question);
    });
    socket.on("question_receipt_update", () => {
      refreshQuestionReceipts();
    });

    socket.on("poll_update", (poll: LivePoll | null) => {
      setActivePoll(poll);
      setPollStatus(null);
      setPollReceiptError(false);
    });

    socket.on("poll_results_update", (poll: LivePoll) => {
      setActivePoll((current) => current?.id === poll.id || poll.status === "closed" ? poll : current);
    });

    socket.on("safety_check_update", (check: SafetyCheck | null) => {
      restoreSafetyResponse(check);
      setActiveSafetyCheck(check);
      setSafetyStatus(null);
    });

    socket.on("safety_check_results_update", (check: SafetyCheck) => {
      setActiveSafetyCheck((current) => current?.id === check.id || check.status === "closed" ? check : current);
    });

    socket.on("engagement_update", () => {
      fetch(`/api/public/demos/${publicId}/engagement/${getSessionId()}`)
        .then((response) => response.ok ? response.json() : null)
        .then((data: ParticipantEngagement | null) => setEngagement(data))
        .catch(() => {});
    });
    socket.on("conduct_report_status_update", () => {
      refreshConductReports();
    });
    socket.on("run_sheet_update", (summary: ParticipantRunSheet) => {
      setRunSheet(summary);
    });

    if (!socket.connected) {
      socket.connect();
    } else {
      socket.emit("join_demo", { publicId, sessionId: getSessionId(), attendanceOptOut });
    }

    return () => {
      socket.emit("leave_demo", { publicId });
      socket.off("chant_update");
      socket.off("viewer_count");
      socket.off("demo_ended");
      socket.off("demo_error");
      socket.off("organizer_announcement");
      socket.off("question_update");
      socket.off("question_spotlight");
      socket.off("question_receipt_update");
      socket.off("poll_update");
      socket.off("poll_results_update");
      socket.off("safety_check_update");
      socket.off("safety_check_results_update");
      socket.off("engagement_update");
      socket.off("conduct_report_status_update");
      socket.off("run_sheet_update");
      socket.off("attendance_receipt");
      socket.off("attendance_error");
      socket.off("connect");
      socket.off("disconnect");
    };
  }, [publicId, attendanceOptOut]);

  useEffect(() => {
    fetch(`/api/public/demos/${publicId}/questions`)
      .then((response) => {
        if (response.status === 404) {
          setError("Demonstration not found");
          return [];
        }
        return response.ok ? response.json() : [];
      })
      .then((questions: AudienceQuestion[]) => setAudienceQuestions(questions))
      .catch(() => setAudienceQuestions([]));
    refreshQuestionReceipts();

    void refreshPulseReceipt(true);

    void refreshPollReceipt(true);

    fetch(`/api/public/demos/${publicId}/safety-checks/current?sessionId=${encodeURIComponent(getSessionId())}`)
      .then((response) => response.ok ? response.json() : null)
      .then((check: SafetyCheck | null) => {
        restoreSafetyResponse(check);
        setActiveSafetyCheck(check);
      })
      .catch(() => setActiveSafetyCheck(null));

    fetch(`/api/public/demos/${publicId}/engagement/${getSessionId()}`)
      .then((response) => response.ok ? response.json() : null)
      .then((data: ParticipantEngagement | null) => setEngagement(data))
      .catch(() => setEngagement(null));
    fetch(`/api/public/demos/${publicId}/run-sheet`)
      .then((response) => response.ok ? response.json() : null)
      .then((summary: ParticipantRunSheet | null) => setRunSheet(summary))
      .catch(() => setRunSheet(null));
    refreshConductReports();
  }, [publicId]);

  useEffect(() => {
    if (chantData || error || isOffline) return;
    const savedFallback = window.setTimeout(() => {
      const stored = loadOfflineEvent(publicId);
      if (!stored) return;
      setOfflineSnapshot(stored);
      setChantData(stored.chantData);
      setUsingOfflineSnapshot(true);
    }, 4_000);
    const connectionFailure = window.setTimeout(() => {
      if (!loadOfflineEvent(publicId)) setError("We could not connect to this event");
    }, 12_000);
    return () => {
      window.clearTimeout(savedFallback);
      window.clearTimeout(connectionFailure);
    };
  }, [chantData, error, isOffline, publicId]);

  const hasChantContent = chantData?.callText || chantData?.responseText;
  const activePhase = chantData?.currentPhase ?? "leader";
  const phaseGuidance = activePhase === "people"
    ? {
      label: t.everyoneRespondNow,
      detail: t.readBlueResponse,
      className: "border-sky-400/40 bg-sky-400/10 text-sky-200",
    }
    : {
      label: t.leaderSpeakingNow,
      detail: t.listenOrangeCall,
      className: "border-orange-500/40 bg-orange-500/10 text-orange-200",
    };
  const chantAnnouncement = getChantAnnouncement(chantData, t, participantLanguage);
  const callColor = highContrast ? "#fde047" : "#f97316";
  const responseColor = highContrast ? "#ffffff" : "#38bdf8";
  const chantFontSize = largeText
    ? "clamp(2.35rem, 10vw, 6.5rem)"
    : "clamp(1.75rem, 7vw, 4.5rem)";
  const participantDisplayMode = lowBandwidth
    ? t.lowBandwidthDescription
    : t.fullDisplayDescription;
  const logisticsItems = [
    { label: t.when, value: formatParticipantSchedule(chantData?.scheduledAt, participantLanguage) },
    { label: t.where, value: chantData?.locationName },
    { label: t.meet, value: chantData?.meetingPoint },
    { label: t.arrival, value: chantData?.arrivalNote },
  ].filter((item) => item.value);
  const directionsQuery = [chantData?.locationName, chantData?.meetingPoint]
    .filter(Boolean)
    .join(", ");
  const directionsUrl = directionsQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(directionsQuery)}`
    : null;
  const participantCalendarDetails: CalendarEventDetails | null = chantData?.scheduledAt ? {
    title: chantData.demoTitle,
    scheduledAt: chantData.scheduledAt,
    durationMinutes: chantData.eventDurationMinutes,
    location: [chantData.locationName, chantData.meetingPoint].filter(Boolean).join(", ") || null,
    description: [
      `${t.joinThisEvent}: ${window.location.href}`,
      `${t.eventCode}: ${publicId}`,
      chantData.meetingPoint ? `${t.meet}: ${chantData.meetingPoint}` : null,
      chantData.arrivalNote ? `${t.arrival}: ${chantData.arrivalNote}` : null,
      directionsUrl ? `${t.openDirections}: ${directionsUrl}` : null,
      "",
      t.noAccountOrScanner,
    ].filter((line) => line !== null).join("\n"),
    uid: `chantlive-${publicId}@chantlive.online`,
  } : null;
  const googleCalendarUrl = participantCalendarDetails ? buildGoogleCalendarUrl(participantCalendarDetails) : null;
  const outlookCalendarUrl = participantCalendarDetails ? buildOutlookCalendarUrl(participantCalendarDetails) : null;
  const copyParticipantCode = async () => {
    setShareFallbackText(null);
    setRecoveryFallbackText(null);
    try {
      await navigator.clipboard.writeText(publicId);
      setShareStatus(t.eventCodeCopied);
    } catch {
      setShareStatus(`${t.eventCode}: ${publicId}`);
    }
  };
  const copyRecoveryDetails = async () => {
    const localizedError = error?.toLowerCase().includes("not found") ? t.notFound : t.couldNotConnect;
    const details = [
      localizedError,
      `${t.checkedEventCode}: ${publicId}`,
      window.location.href,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(details);
      setRecoveryFallbackText(null);
      setShareStatus(t.recoveryDetailsCopied);
    } catch {
      setRecoveryFallbackText(details);
      setShareStatus(t.recoveryDetailsManual);
    }
  };
  const copyParticipantLink = async () => {
    setShareFallbackText(null);
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareStatus(t.participantLinkCopied);
    } catch {
      setShareStatus(window.location.href);
    }
  };
  const shareParticipantEvent = async () => {
    const title = chantData?.demoTitle ? `${t.join} ${chantData.demoTitle}` : t.joinThisEvent;
    const text = [
      `${title} — ChantLive.`,
      `${t.eventCode}: ${publicId}`,
      chantData?.scheduledAt ? `${t.when}: ${formatParticipantSchedule(chantData.scheduledAt, participantLanguage)}` : null,
      chantData?.locationName ? `${t.where}: ${chantData.locationName}` : null,
      chantData?.meetingPoint ? `${t.meet}: ${chantData.meetingPoint}` : null,
      chantData?.arrivalNote ? `${t.arrival}: ${chantData.arrivalNote}` : null,
      directionsUrl ? `${t.openDirections}: ${directionsUrl}` : null,
      "",
      t.noAccountOrScanner,
    ].filter((line) => line !== null).join("\n");
    const url = window.location.href;
    const completeInvitation = `${text}\n${url}`;
    setShareFallbackText(null);

    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        setShareStatus(t.eventShared);
        return;
      }

      await navigator.clipboard.writeText(completeInvitation);
      setShareStatus(t.eventInvitationCopied);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(completeInvitation);
        setShareStatus(t.eventInvitationCopied);
      } catch {
        setShareFallbackText(completeInvitation);
        setShareStatus(t.manualShareCopy);
      }
    }
  };
  const addParticipantEventToCalendar = () => {
    if (!participantCalendarDetails) return;
    const added = downloadCalendarFile(participantCalendarDetails);
    setCalendarStatus(added ? t.calendarDownloaded : t.calendarFailed);
  };
  const requestScreenWakeLock = async () => {
    try {
      const wakeLock = await navigator.wakeLock.request("screen");
      wakeLockRef.current = wakeLock;
      setScreenAwakeActive(true);
      setWakeLockError(null);
      wakeLock.addEventListener("release", () => {
        if (wakeLockRef.current === wakeLock) wakeLockRef.current = null;
        setScreenAwakeActive(false);
      }, { once: true });
      return true;
    } catch {
      setWakeLockError(t.wakeLockError);
      return false;
    }
  };
  const toggleScreenWakeLock = async () => {
    if (keepScreenAwake) {
      setKeepScreenAwake(false);
      setScreenAwakeActive(false);
      await wakeLockRef.current?.release();
      wakeLockRef.current = null;
      return;
    }

    if (await requestScreenWakeLock()) setKeepScreenAwake(true);
  };
  const prepareOfflineEvent = () => {
    if (!chantData) return;
    const saved = saveOfflineEvent(publicId, chantData);
    if (!saved) {
      setOfflineStatus(t.offlineSaveFailed);
      setOfflineStatusError(true);
      return;
    }
    setOfflineSnapshot(saved);
    setOfflineStatus(t.offlineSaved);
    setOfflineStatusError(false);
  };
  const removeOfflineEvent = () => {
    forgetOfflineEvent(publicId);
    setOfflineSnapshot(null);
    setOfflineStatus(t.offlineForgotten);
    setOfflineStatusError(false);
    if (usingOfflineSnapshot) {
      setUsingOfflineSnapshot(false);
      setChantData(null);
    }
  };
  const offlineSavedLabel = offlineSnapshot
    ? new Intl.DateTimeFormat(participantLocales[participantLanguage], { dateStyle: "medium", timeStyle: "short" }).format(new Date(offlineSnapshot.savedAt))
    : null;
  const renderOfflinePreparation = () => (
    <div className="mt-4 rounded-xl border border-sky-400/40 bg-sky-950/30 p-3" data-testid="panel-offline-preparation">
      <p className="flex items-center gap-2 text-sm font-semibold text-sky-100">
        <Download className="h-4 w-4" aria-hidden="true" />
        {t.offlinePrepTitle}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-sky-100/80">{t.offlinePrepBody}</p>
      <p className="mt-2 text-xs text-neutral-400">{t.offlinePrivacy}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!offlineSnapshot && (
          <button
            type="button"
            onClick={prepareOfflineEvent}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-sky-300/70 bg-sky-300/10 px-4 py-2 text-xs font-semibold text-sky-50 hover:bg-sky-300/20"
            data-testid="button-save-offline-event"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            {t.offlineSave}
          </button>
        )}
        {offlineSnapshot && (
          <>
            <span className="text-xs font-medium text-emerald-300" data-testid="text-offline-ready">
              {t.offlineSaved} {offlineSavedLabel ? `${t.offlineStoredAt}: ${offlineSavedLabel}` : ""}
            </span>
            <button
              type="button"
              onClick={removeOfflineEvent}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-neutral-700 px-4 py-2 text-xs font-medium text-neutral-300 hover:bg-neutral-900"
              data-testid="button-forget-offline-event"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              {t.offlineForget}
            </button>
          </>
        )}
      </div>
      {offlineStatus && <p className={`mt-2 text-xs ${offlineStatusError ? "text-red-300" : "text-emerald-300"}`} role={offlineStatusError ? "alert" : "status"} aria-live="polite" data-testid="text-offline-save-status">{offlineStatus}</p>}
    </div>
  );
  const renderOfflineWarning = () => usingOfflineSnapshot && offlineSnapshot ? (
    <div className="mx-auto mb-5 mt-4 max-w-2xl rounded-2xl border border-amber-300/60 bg-amber-300/15 p-4 text-start text-amber-50" role="alert" data-testid="banner-offline-snapshot">
      <p className="flex items-center gap-2 text-sm font-semibold"><WifiOff className="h-4 w-4" aria-hidden="true" />{t.offlineCopyTitle}</p>
      <p className="mt-2 text-sm leading-relaxed text-amber-50/90">{t.offlineCopyBody}</p>
      <p className="mt-2 text-xs text-amber-100/80">{t.offlineStoredAt}: {offlineSavedLabel}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={retryConnection} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-amber-100/70 px-4 py-2 text-xs font-semibold" data-testid="button-offline-reconnect">
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />{t.reconnectNow}
        </button>
        <button type="button" onClick={removeOfflineEvent} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-amber-100/40 px-4 py-2 text-xs font-medium" data-testid="button-offline-forget">
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />{t.offlineForget}
        </button>
      </div>
    </div>
  ) : null;
  const renderParticipantAccess = (className = "", compact = false) => (
    <div className={`rounded-2xl border border-neutral-800 bg-neutral-950/90 text-start ${compact ? "p-2.5" : "p-4"} ${className}`} data-testid="panel-participant-access">
      <div className={`flex gap-3 ${compact ? "items-center justify-between" : "flex-col sm:flex-row sm:items-center sm:justify-between"}`}>
        <div>
          <p className="text-xs uppercase tracking-widest text-neutral-500">{t.eventCode}</p>
          <p className={`mt-1 font-mono font-bold tracking-[0.2em] text-white ${compact ? "text-base" : "text-xl"}`} data-testid="text-participant-event-code">{publicId}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {chantData?.scheduledAt && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={`inline-flex min-h-11 items-center gap-2 rounded-full border border-sky-400/60 text-xs font-medium text-sky-100 hover:bg-sky-950/40 ${compact ? "px-2.5 py-2" : "px-3 py-2"}`}
                  data-testid="button-add-participant-calendar"
                >
                  <CalendarPlus className="h-3.5 w-3.5" />
                  {compact ? t.calendar : t.addToCalendar}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {googleCalendarUrl && (
                  <DropdownMenuItem asChild>
                    <a href={googleCalendarUrl} target="_blank" rel="noopener noreferrer" data-testid="link-participant-google-calendar">
                      {t.googleCalendar}
                    </a>
                  </DropdownMenuItem>
                )}
                {outlookCalendarUrl && (
                  <DropdownMenuItem asChild>
                    <a href={outlookCalendarUrl} target="_blank" rel="noopener noreferrer" data-testid="link-participant-outlook-calendar">
                      {t.outlookCalendar}
                    </a>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={addParticipantEventToCalendar} data-testid="button-download-participant-calendar">
                  {t.downloadCalendarFile}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <button
            type="button"
            onClick={copyParticipantCode}
            className={`inline-flex min-h-11 items-center gap-2 rounded-full border border-neutral-700 text-xs font-medium text-neutral-200 hover:bg-neutral-900 ${compact ? "px-2.5 py-2" : "px-3 py-2"}`}
            aria-label={t.copyEventCode}
            data-testid="button-copy-participant-code"
          >
            <Copy className="h-3.5 w-3.5" />
            {compact ? t.copy : t.copyCode}
          </button>
          <button
            type="button"
            onClick={copyParticipantLink}
            className={`inline-flex min-h-11 items-center gap-2 rounded-full border border-neutral-700 text-xs font-medium text-neutral-200 hover:bg-neutral-900 ${compact ? "px-2.5 py-2" : "px-3 py-2"}`}
            aria-label={t.copyLink}
            data-testid="button-copy-participant-link"
          >
            <Link2 className="h-3.5 w-3.5" />
            {t.copyLink}
          </button>
          <button
            type="button"
            onClick={shareParticipantEvent}
            className={`inline-flex min-h-11 items-center gap-2 rounded-full border border-orange-400/60 text-xs font-medium text-orange-100 hover:bg-orange-950/40 ${compact ? "px-2.5 py-2" : "px-3 py-2"}`}
            data-testid="button-share-participant-event"
          >
            <Share2 className="h-3.5 w-3.5" />
            {t.shareEvent}
          </button>
        </div>
      </div>
      {!compact && (
        <p className="mt-3 flex items-center gap-2 text-xs text-neutral-400" data-testid="text-participant-access-reassurance">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-300" aria-hidden="true" />
          {t.noAccountOrScanner}
        </p>
      )}
      {shareStatus && <p className="mt-2 text-xs text-emerald-300" role="status" data-testid="text-participant-share-status">{shareStatus}</p>}
      {shareFallbackText && (
        <textarea
          readOnly
          value={shareFallbackText}
          onFocus={(event) => event.currentTarget.select()}
          className="mt-3 min-h-40 w-full resize-y rounded-lg border border-orange-400/50 bg-black p-3 text-xs leading-relaxed text-neutral-100"
          dir={participantDirection}
          aria-label={t.manualShareCopy}
          data-testid="textarea-participant-share-fallback"
        />
      )}
      {calendarStatus && <p className="mt-2 text-xs text-sky-300" role="status" data-testid="text-participant-calendar-status">{calendarStatus}</p>}
      {(!compact || offlinePreparationMode) && renderOfflinePreparation()}
    </div>
  );
  const renderDirectionsLink = () => directionsUrl && (
    <a
      href={directionsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-sky-400/50 px-4 py-2 text-sm font-semibold text-sky-100 hover:bg-sky-950/40"
      data-testid="link-participant-directions"
    >
      <MapPin className="h-4 w-4" aria-hidden="true" />
      {t.openDirections}
    </a>
  );
  const retryConnection = () => {
    setError(null);
    window.location.reload();
  };
  const requestAssistance = async (type: "accessibility" | "connection" | "safety" | "organizer", message: string) => {
    setAssistanceError(null);
    try {
      const response = await fetch(`/api/public/demos/${publicId}/assistance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, message, sessionId: getSessionId() }),
      });

      if (!response.ok) {
        throw new Error("Could not notify the organizer.");
      }

      setAssistanceSent(type);
      setTimeout(() => setAssistanceSent(null), 3500);
    } catch {
      setAssistanceError(t.assistanceFailed);
    }
  };
  const sendPulse = async (type: CrowdPulseType) => {
    setPulsePending(true);
    try {
      const response = await fetch(`/api/public/demos/${publicId}/pulse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, sessionId: getSessionId() }),
      });

      if (!response.ok) throw new Error("Could not save signal");
      const result = await response.json() as { receipt: CrowdPulseReceipt };
      setPulseReceipt(result.receipt);
      setPulseStatus("sent");
      setPulseReceiptError(false);
    } catch {
      setPulseReceiptError(true);
      setPulseStatus(null);
    } finally {
      setPulsePending(false);
    }
  };
  const submitQuestion = async () => {
    const text = questionText.trim();
    if (!text) return;

    try {
      const response = await fetch(`/api/public/demos/${publicId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, sessionId: getSessionId() }),
      });

      if (!response.ok) {
        throw new Error("Could not send question.");
      }

      setQuestionText("");
      setQuestionStatus(t.questionSent);
      await refreshQuestionReceipts();
      setTimeout(() => setQuestionStatus(null), 3000);
    } catch {
      setQuestionStatus(t.questionFailed);
    }
  };
  const upvoteQuestion = async (questionId: string) => {
    try {
      await fetch(`/api/public/demos/${publicId}/questions/${questionId}/upvote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: getSessionId() }),
      });
    } catch {
      // Upvotes are best-effort and should not disrupt the live chant view.
    }
  };
  const withdrawQuestion = async (questionId: string) => {
    if (withdrawQuestionPendingId !== questionId) {
      setWithdrawQuestionPendingId(questionId);
      return;
    }
    try {
      const response = await fetch(`/api/public/demos/${publicId}/questions/${questionId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: getSessionId() }),
      });
      if (!response.ok) throw new Error("Question could not be withdrawn");
      setWithdrawQuestionPendingId(null);
      setQuestionStatus(t.questionWithdrawn);
      await refreshQuestionReceipts();
    } catch {
      setWithdrawQuestionPendingId(null);
      setQuestionStatus(t.questionWithdrawFailed);
    }
  };
  const submitPollVote = async (pollId: string, optionId: string) => {
    try {
      const response = await fetch(`/api/public/demos/${publicId}/polls/${pollId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionId, sessionId: getSessionId() }),
      });

      if (!response.ok) {
        throw new Error("Could not send poll vote.");
      }

      const poll = await response.json() as LivePoll;
      const nextVotes = { ...pollVotes, [pollId]: optionId };
      localStorage.setItem("chant_poll_votes", JSON.stringify(nextVotes));
      setPollVotes(nextVotes);
      setActivePoll(poll);
      setPollReceiptError(false);
      setPollStatus(t.voteSent);
      setTimeout(() => setPollStatus(null), 2500);
    } catch {
      setPollStatus(t.voteFailed);
    }
  };
  const submitSafetyResponse = async (checkId: string, responseType: "ok" | "need_help" | "leaving" | "not_sure") => {
    try {
      const response = await fetch(`/api/public/demos/${publicId}/safety-checks/${checkId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: responseType, note: safetyNote, sessionId: getSessionId() }),
      });

      if (!response.ok) {
        throw new Error("Could not send safety response.");
      }

      const check = await response.json() as SafetyCheck;
      const nextResponses = { ...safetyResponses, [checkId]: responseType };
      localStorage.setItem("chant_safety_responses", JSON.stringify(nextResponses));
      setSafetyResponses(nextResponses);
      setRecoveredSafetyResponseId(null);
      setActiveSafetyCheck(check);
      setSafetyStatus(responseType === "need_help" ? t.organizerNotified : t.safetyResponseSent);
      setTimeout(() => setSafetyStatus(null), 3500);
    } catch {
      setSafetyStatus(t.safetyResponseFailed);
    }
  };
  const dismissIncidentNotice = (checkId: string) => {
    localStorage.setItem("chant_dismissed_incident", checkId);
    setDismissedIncidentId(checkId);
  };
  const renderIncidentNotice = () => {
    if (!activeSafetyCheck || (activeSafetyCheck.status === "closed" && dismissedIncidentId === activeSafetyCheck.id)) return null;
    const isOpen = activeSafetyCheck.status === "open";
    const incidentKindLabels = {
      route_change: t.incidentRoute,
      separation: t.incidentSeparation,
      weather: t.incidentWeather,
      accessibility: t.incidentAccessibility,
      general: t.incidentGeneral,
    };
    const responseOptions: Array<["ok" | "need_help" | "leaving" | "not_sure", string]> = [
      ["ok", t.imOk],
      ["need_help", t.needHelp],
      ["leaving", t.leaving],
      ["not_sure", t.notSure],
    ];

    return (
      <section
        className={`mx-4 mt-4 rounded-2xl border p-4 text-start shadow-lg ${isOpen ? "border-red-300/70 bg-red-950 text-red-50" : "border-emerald-300/60 bg-emerald-950 text-emerald-50"}`}
        role={isOpen ? "alert" : "status"}
        aria-live={isOpen ? "assertive" : "polite"}
        aria-labelledby={`incident-title-${activeSafetyCheck.id}`}
        data-testid={isOpen ? "banner-active-incident" : "banner-incident-all-clear"}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p id={`incident-title-${activeSafetyCheck.id}`} className="text-sm font-bold uppercase tracking-wide">
            {isOpen ? t.incidentActive : t.incidentAllClear}
          </p>
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${isOpen ? "border-red-200/50" : "border-emerald-200/50"}`}>
            {incidentKindLabels[activeSafetyCheck.kind]}
          </span>
        </div>
        <p className="mt-3 text-xl font-bold" data-testid="text-incident-message">{activeSafetyCheck.message}</p>
        {isOpen ? (
          <>
            <div className="mt-3 rounded-xl border border-red-200/30 bg-black/20 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-100/80">{t.incidentInstruction}</p>
              <p className="mt-1 text-sm leading-relaxed" data-testid="text-incident-instruction">{activeSafetyCheck.instruction}</p>
            </div>
            <p className="mt-3 text-sm text-red-100/90">{t.incidentRespond}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label={t.safetyCheck}>
              {responseOptions.map(([value, label]) => {
                const selected = safetyResponses[activeSafetyCheck.id] === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => submitSafetyResponse(activeSafetyCheck.id, value)}
                    aria-pressed={selected}
                    className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold ${selected ? "border-white bg-white/20" : "border-red-200/40 hover:bg-white/10"}`}
                    data-testid={`button-incident-${value}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            {safetyResponses[activeSafetyCheck.id] && (
              <p className="mt-2 text-xs text-red-100" role="status" data-testid="status-incident-response">
                {recoveredSafetyResponseId === activeSafetyCheck.id ? t.incidentResponseRecovered : t.incidentResponseRecorded}
              </p>
            )}
          </>
        ) : (
          <>
            <p className="mt-3 text-base leading-relaxed" data-testid="text-incident-resolution">
              {activeSafetyCheck.resolutionMessage || activeSafetyCheck.instruction}
            </p>
            {activeSafetyCheck.closedAt && (
              <p className="mt-2 text-xs text-emerald-100/80">
                {t.incidentResolvedAt}: {new Intl.DateTimeFormat(participantLocales[participantLanguage], { timeStyle: "short" }).format(new Date(activeSafetyCheck.closedAt))}
              </p>
            )}
            <button
              type="button"
              onClick={() => dismissIncidentNotice(activeSafetyCheck.id)}
              className="mt-3 min-h-11 rounded-full border border-emerald-100/50 px-4 py-2 text-sm font-semibold hover:bg-white/10"
              data-testid="button-dismiss-incident"
            >
              {t.incidentDismiss}
            </button>
          </>
        )}
      </section>
    );
  };
  const submitCheckIn = async (role: CheckInRole) => {
    try {
      const displayName = checkInName.trim();
      const response = await fetch(`/api/public/demos/${publicId}/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, displayName, sessionId: getSessionId() }),
      });

      if (!response.ok) {
        throw new Error("Could not check in.");
      }

      localStorage.setItem("chant_checkin_role", role);
      localStorage.setItem("chant_checkin_name", displayName);
      setCheckedInRole(role);
      const roleLabel = {
        participant: t.participant,
        marshal: t.marshal,
        speaker: t.speaker,
        accessibility: t.accessibilityHelper,
      }[role];
      setCheckInStatus(`${t.checkedInAs} ${roleLabel}.`);
      setTimeout(() => setCheckInStatus(null), 3000);
    } catch {
      setCheckInStatus(t.checkInFailed);
    }
  };
  const submitFeedback = async () => {
    try {
      const response = await fetch(`/api/public/demos/${publicId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clarityRating: feedbackRatings.clarity,
          safetyRating: feedbackRatings.safety,
          accessibilityRating: feedbackRatings.accessibility,
          comment: feedbackComment,
          sessionId: getSessionId(),
        }),
      });

      if (!response.ok) {
        throw new Error("Could not send feedback.");
      }

      setFeedbackComment("");
      setFeedbackStatus(t.feedbackSent);
      setTimeout(() => setFeedbackStatus(null), 3500);
    } catch {
      setFeedbackStatus(t.feedbackFailed);
    }
  };
  const forgetAttendance = async () => {
    setAttendanceStatus(null);
    setAttendanceError(false);
    const sessionId = getSessionId();
    localStorage.setItem(`chant_attendance_opt_out_${publicId}`, "true");
    localStorage.setItem(`chant_attendance_delete_pending_${publicId}`, "true");
    setAttendanceReceipt(null);
    setAttendanceOptOut(true);
    setAttendanceDeletionPending(true);
    try {
      const response = await fetch(`/api/public/demos/${publicId}/attendance-receipt`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      if (!response.ok) throw new Error("Could not forget attendance");
      localStorage.removeItem(`chant_attendance_delete_pending_${publicId}`);
      setAttendanceDeletionPending(false);
      setAttendanceStatus(attendanceT.forgotten);
    } catch {
      setAttendanceError(true);
      setAttendanceStatus(`${attendanceT.forgotten} ${attendanceT.pending}`);
    }
  };
  const restoreAttendance = () => {
    localStorage.removeItem(`chant_attendance_opt_out_${publicId}`);
    localStorage.removeItem(`chant_attendance_delete_pending_${publicId}`);
    setAttendanceOptOut(false);
    setAttendanceDeletionPending(false);
    setAttendanceStatus(null);
    setAttendanceError(false);
  };

  useEffect(() => {
    if (!attendanceDeletionPending || isOffline) return;
    const retryDeletion = async () => {
      try {
        const response = await fetch(`/api/public/demos/${publicId}/attendance-receipt`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: getSessionId() }),
        });
        if (!response.ok) return;
        localStorage.removeItem(`chant_attendance_delete_pending_${publicId}`);
        setAttendanceDeletionPending(false);
        setAttendanceError(false);
        setAttendanceStatus(attendanceT.forgotten);
      } catch {
        // The device stays opted out; the next online transition retries deletion.
      }
    };
    void retryDeletion();
  }, [attendanceDeletionPending, attendanceT.forgotten, isOffline, publicId]);
  const submitConductReport = async () => {
    const details = conductDetails.trim();
    if (details.length < 20) return;
    setConductLoading(true);
    setConductStatus(null);
    setConductStatusError(false);
    try {
      const response = await fetch(`/api/public/demos/${publicId}/conduct-reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: conductCategory, urgency: conductUrgency, details, sessionId: getSessionId() }),
      });
      const report = await response.json() as ConductReport & { message?: string };
      if (!response.ok) throw new Error(report.message || "Could not send report");
      setConductDetails("");
      setConductReports((current) => [report, ...current.filter((item) => item.id !== report.id)]);
      setConductStatus(report.duplicate ? conductT.duplicate : conductT.sent);
    } catch {
      setConductStatus(conductT.failed);
      setConductStatusError(true);
    } finally {
      setConductLoading(false);
    }
  };

  useEffect(() => {
    localStorage.setItem("chant_large_text", String(largeText));
  }, [largeText]);

  useEffect(() => {
    localStorage.setItem("chant_high_contrast", String(highContrast));
  }, [highContrast]);

  useEffect(() => {
    lowBandwidthRef.current = lowBandwidth;
    localStorage.setItem("chant_low_bandwidth", String(lowBandwidth));
    if (lowBandwidth) {
      setPhaseProgress(0);
      setFadeIn(true);
    }
  }, [lowBandwidth]);

  useEffect(() => {
    localStorage.setItem("chant_participant_language", participantLanguage);
  }, [participantLanguage]);

  useEffect(() => {
    const previousLanguage = document.documentElement.lang;
    const previousDirection = document.documentElement.dir;
    document.documentElement.lang = participantLanguage;
    document.documentElement.dir = participantDirection;

    return () => {
      document.documentElement.lang = previousLanguage;
      document.documentElement.dir = previousDirection;
    };
  }, [participantDirection, participantLanguage]);

  useEffect(() => {
    if (!wakeLockSupported || !keepScreenAwake) return;

    const restoreWakeLock = () => {
      if (document.visibilityState === "visible" && !wakeLockRef.current) {
        void requestScreenWakeLock();
      }
    };

    document.addEventListener("visibilitychange", restoreWakeLock);
    return () => document.removeEventListener("visibilitychange", restoreWakeLock);
  }, [keepScreenAwake, wakeLockSupported, t.wakeLockError]);

  useEffect(() => () => {
    void wakeLockRef.current?.release();
  }, []);

  useEffect(() => {
    if (chantData?.demoStatus === "live" || !keepScreenAwake) return;
    setKeepScreenAwake(false);
    setScreenAwakeActive(false);
    void wakeLockRef.current?.release();
    wakeLockRef.current = null;
  }, [chantData?.demoStatus, keepScreenAwake]);

  useEffect(() => {
    if (lowBandwidth) {
      setPhaseProgress(0);
      return;
    }

    if (!chantData) {
      setPhaseProgress(0);
      return;
    }

    const hasServerTiming = Boolean(
      chantData.phaseStartedAt &&
      chantData.phaseDurationMs &&
      chantData.serverNow,
    );
    const phaseStartedAt = chantData.phaseStartedAt
      ? Date.parse(chantData.phaseStartedAt)
      : localPhaseStartRef.current;
    const serverNowAtUpdate = chantData.serverNow
      ? Date.parse(chantData.serverNow)
      : Date.now();
    const phaseDurationMs = chantData.phaseDurationMs ?? getFallbackPhaseDuration(activePhase);
    const receivedAt = Date.now();

    if (
      Number.isNaN(phaseStartedAt) ||
      Number.isNaN(serverNowAtUpdate) ||
      phaseDurationMs <= 0
    ) {
      setPhaseProgress(0);
      return;
    }

    let animationFrame = 0;
    const updateProgress = () => {
      const elapsedMs = hasServerTiming
        ? serverNowAtUpdate + (Date.now() - receivedAt) - phaseStartedAt
        : Date.now() - phaseStartedAt;
      setPhaseProgress(clampProgress((elapsedMs / phaseDurationMs) * 100));
      animationFrame = requestAnimationFrame(updateProgress);
    };

    updateProgress();

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [
    activePhase,
    lowBandwidth,
    chantData?.chantIndex,
    chantData?.currentCycle,
    chantData?.phaseStartedAt,
    chantData?.phaseDurationMs,
    chantData?.serverNow,
  ]);

  const renderRunSheetStage = (className = "") => {
    if (!runSheet || runSheet.total === 0) return null;
    const progressed = runSheet.completed + runSheet.skipped;
    const progressPercent = Math.min(100, Math.round((progressed / runSheet.total) * 100));
    return (
      <section className={`rounded-2xl border border-indigo-300/40 bg-indigo-300/10 p-4 text-start text-indigo-50 ${className}`} aria-labelledby="participant-run-sheet-title" data-testid="panel-participant-run-sheet">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="participant-run-sheet-title" className="flex items-center gap-2 text-sm font-semibold">
            <ListOrdered className="h-4 w-4" aria-hidden="true" />
            {runSheetT.title}
          </h2>
          <span className="text-xs text-indigo-100/75">{runSheetT.progress}: {formatParticipantNumber(progressed, participantLanguage)} {runSheetT.stageOf} {formatParticipantNumber(runSheet.total, participantLanguage)}</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-label={runSheetT.progress} aria-valuemin={0} aria-valuemax={runSheet.total} aria-valuenow={progressed}>
          <div className="h-full rounded-full bg-indigo-300" style={{ width: `${progressPercent}%` }} />
        </div>
        {runSheet.active ? (
          <div className="mt-4" role="status" aria-live="polite" aria-atomic="true">
            <p className="text-xs font-mono uppercase tracking-widest text-indigo-200/75">{runSheetT.now}</p>
            <p className="mt-1 text-lg font-bold" data-testid="text-participant-run-sheet-now">{runSheet.active.title}</p>
            {runSheet.active.participantNote && <p className="mt-1 text-sm leading-relaxed text-indigo-50/90">{runSheet.active.participantNote}</p>}
            <p className="mt-2 flex items-center gap-1 text-xs text-indigo-100/70"><Clock3 className="h-3.5 w-3.5" aria-hidden="true" /> {formatParticipantNumber(runSheet.active.plannedDurationMinutes, participantLanguage)} {runSheetT.plannedMinutes}</p>
          </div>
        ) : (
          <p className="mt-4 text-sm text-indigo-50/85" role="status" data-testid="text-participant-run-sheet-waiting">{runSheet.next ? runSheetT.waiting : runSheetT.completed}</p>
        )}
        {runSheet.next && runSheet.next.id !== runSheet.active?.id && (
          <div className="mt-4 border-t border-indigo-200/20 pt-3">
            <p className="text-xs font-mono uppercase tracking-widest text-indigo-200/75">{runSheetT.next}</p>
            <p className="mt-1 font-semibold" data-testid="text-participant-run-sheet-next">{runSheet.next.title}</p>
            {runSheet.next.participantNote && <p className="mt-1 text-sm text-indigo-50/80">{runSheet.next.participantNote}</p>}
          </div>
        )}
        <details className="mt-4 border-t border-indigo-200/20 pt-3" data-testid="details-participant-full-programme">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm font-semibold text-indigo-50 outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-indigo-200">
            <span className="flex items-center gap-2"><ListOrdered className="h-4 w-4" aria-hidden="true" /> {programmeT.fullProgramme}</span>
            <span className="text-xs font-normal text-indigo-100/70">{formatParticipantNumber(runSheet.total, participantLanguage)}</span>
          </summary>
          <p className="mt-2 px-2 text-xs text-indigo-100/70">{programmeT.programmeHelp}</p>
          <ol className="mt-3 grid gap-2" aria-label={programmeT.fullProgramme} data-testid="list-participant-full-programme">
            {(runSheet.items ?? []).map((item, index) => {
              const statusLabel = item.status === "active"
                ? programmeT.currentStage
                : item.status === "completed"
                  ? programmeT.completedStage
                  : item.status === "skipped"
                    ? programmeT.skippedStage
                    : programmeT.upcomingStage;
              return (
                <li key={item.id} className={`rounded-lg border p-3 ${item.status === "active" ? "border-indigo-200 bg-white/10" : "border-indigo-200/20 bg-black/10"}`} aria-current={item.status === "active" ? "step" : undefined}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="font-semibold">{formatParticipantNumber(index + 1, participantLanguage)}. {item.title}</p>
                    <span className="rounded-full border border-indigo-200/30 px-2 py-1 text-[11px] text-indigo-100">{statusLabel}</span>
                  </div>
                  {item.participantNote && <p className="mt-1 text-sm text-indigo-50/80">{item.participantNote}</p>}
                  <p className="mt-2 flex items-center gap-1 text-xs text-indigo-100/65"><Clock3 className="h-3.5 w-3.5" aria-hidden="true" /> {formatParticipantNumber(item.plannedDurationMinutes, participantLanguage)} {runSheetT.plannedMinutes}</p>
                </li>
              );
            })}
          </ol>
        </details>
      </section>
    );
  };

  const renderPhaseProgress = (phase: "leader" | "people") => {
    if (activePhase !== phase || !chantData || lowBandwidth) {
      return null;
    }

    const barColor = highContrast
      ? "bg-white"
      : phase === "leader"
        ? "bg-emerald-400"
        : "bg-fuchsia-400";

    return (
      <div
        className="mt-5 h-3 w-full overflow-hidden rounded-full bg-white/15 shadow-[0_0_18px_rgba(255,255,255,0.12)]"
        role="progressbar"
        aria-label={phase === "leader" ? t.leaderChantProgress : t.everyoneChantProgress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(phaseProgress)}
        data-testid={`progress-${phase}`}
      >
        <div
          className={`h-full rounded-full ${barColor} shadow-[0_0_20px_currentColor]`}
          style={{
            transform: `scaleX(${phaseProgress / 100})`,
            transformOrigin: participantDirection === "rtl" ? "right center" : "left center",
          }}
        />
      </div>
    );
  };

  if (error) {
    const localizedError = error.toLowerCase().includes("not found") ? t.notFound : t.couldNotConnect;
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4" dir={participantDirection}>
        <div className="text-center">
          <Megaphone className="w-16 h-16 text-neutral-500 mx-auto mb-4" />
          <p className="text-white text-xl mb-2" data-testid="text-error">{localizedError}</p>
          <p className="mb-2 text-sm text-neutral-300" data-testid="text-failed-participant-code">
            {t.checkedEventCode}: <bdi dir="ltr" className="font-mono font-semibold tracking-wider text-white">{publicId}</bdi>
          </p>
          <div className="mb-3 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={copyParticipantCode}
              className="inline-flex min-h-11 items-center gap-2 rounded-md border border-neutral-700 px-3 py-2 text-sm font-medium text-neutral-200 hover:bg-neutral-900"
              aria-label={t.copyEventCode}
              data-testid="button-copy-failed-participant-code"
            >
              <Copy className="h-4 w-4" />
              {t.copyCode}
            </button>
            <button
              type="button"
              onClick={() => void copyRecoveryDetails()}
              className="inline-flex min-h-11 items-center gap-2 rounded-md border border-orange-400/60 px-3 py-2 text-sm font-medium text-orange-100 hover:bg-orange-500/10"
              data-testid="button-copy-recovery-details"
            >
              <Copy className="h-4 w-4" />
              {t.copyRecoveryDetails}
            </button>
          </div>
          {shareStatus && (
            <p className="mb-3 text-xs text-emerald-300" role="status" aria-live="polite" data-testid="text-failed-code-copy-status">
              {shareStatus}
            </p>
          )}
          {recoveryFallbackText && (
            <textarea
              readOnly
              value={recoveryFallbackText}
              onFocus={(event) => event.currentTarget.select()}
              className="mb-4 min-h-32 w-full resize-y rounded-lg border border-orange-400/50 bg-black p-3 text-start text-xs leading-relaxed text-neutral-100"
              dir={participantDirection}
              aria-label={t.recoveryDetailsManual}
              data-testid="textarea-recovery-details-fallback"
            />
          )}
          <p className="text-neutral-400 text-sm mb-4">{t.recoveryBody}</p>
          <div className="mx-auto mb-5 max-w-md rounded-lg border border-neutral-800 bg-neutral-950/80 p-4 text-start" data-testid="list-participant-recovery-steps">
            <p className="mb-2 text-sm font-semibold text-white">{t.recoveryStepsTitle}</p>
            <ul className="list-disc space-y-1.5 ps-5 text-sm leading-relaxed text-neutral-300">
              <li>{t.recoveryCheckCode}</li>
              <li>{t.recoveryOpenLink}</li>
              <li>{t.recoveryAskOrganizer}</li>
            </ul>
          </div>
          {savedShortcutRemoved && (
            <p className="mb-5 text-sm text-emerald-300" role="status" data-testid="text-saved-shortcut-removed">
              {t.savedShortcutRemoved}
            </p>
          )}
          <button
            type="button"
            onClick={retryConnection}
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-200 hover:bg-neutral-900"
            data-testid="button-retry-participant"
          >
            <RefreshCw className="h-4 w-4" />
            {t.tryAgain}
          </button>
          <Link
            href={`/?code=${encodeURIComponent(publicId)}#join-event`}
            className="mt-3 inline-flex min-h-11 items-center justify-center px-3 py-2 text-sm font-medium text-orange-300 underline underline-offset-4 hover:text-orange-200"
            data-testid="link-enter-different-code"
          >
            {t.differentEventCode}
          </Link>
          {renderParticipantLanguageSelect("mt-6")}
        </div>
      </div>
    );
  }

  if (!chantData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4" dir={participantDirection}>
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" aria-hidden="true" />
          <p className="text-neutral-400 text-sm mb-2" role="status" aria-live="polite">{isOffline ? t.waitingNetwork : t.connecting}</p>
          <p className="text-neutral-600 text-xs mb-5 max-w-xs">
            {isOffline
              ? t.offlineLoadingBody
              : t.connectingBody}
          </p>
          <button
            type="button"
            onClick={retryConnection}
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-neutral-800 px-4 py-2 text-xs font-medium text-neutral-300 hover:bg-neutral-900"
            data-testid="button-retry-loading"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {t.retryConnection}
          </button>
          <div>{renderParticipantLanguageSelect("mt-6")}</div>
        </div>
      </div>
    );
  }

  if (chantData.demoStatus === "ended") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4" dir={participantDirection}>
        <div className="w-full max-w-2xl text-center">
          {renderIncidentNotice()}
          {renderOfflineWarning()}
          <Megaphone className="w-16 h-16 text-neutral-600 mx-auto mb-4" />
          <p className="text-neutral-300 text-2xl font-semibold mb-2" data-testid="text-ended">
            {t.eventEnded}
          </p>
          <p className="text-neutral-500 text-sm">{chantData.demoTitle}</p>
          <p className="text-neutral-500 text-sm mt-4 max-w-xs mx-auto" data-testid="text-ended-next-step">
            {t.endedNextStep}
          </p>
          <Link
            href="/#join-event"
            className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-sky-400/60 px-5 py-2 text-sm font-semibold text-sky-100 hover:bg-sky-950/40"
            data-testid="link-ended-join-another-event"
          >
            <Link2 className="h-4 w-4" aria-hidden="true" />
            {t.joinAnotherEvent}
          </Link>
          {renderParticipantAccess("mt-5")}
          <ParticipantRegistration publicId={publicId} sessionId={getSessionId()} language={participantLanguage} className="mx-auto mt-5 max-w-lg" />
          <div className="mt-4">{renderParticipantLanguageSelect()}</div>
          {logisticsItems.length > 0 && (
            <div className="mx-auto mt-5 max-w-lg rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-start" data-testid="panel-ended-logistics">
              <p className="text-sm font-semibold text-neutral-100">{t.eventDetails}</p>
              <dl className="mt-3 space-y-2 text-sm text-neutral-400">
                {logisticsItems.map((item) => (
                  <div key={item.label}>
                    <dt className="text-xs uppercase tracking-wide text-neutral-600">{item.label}</dt>
                    <dd className="mt-0.5 text-neutral-200">{item.value}</dd>
                  </div>
                ))}
              </dl>
              {renderDirectionsLink()}
            </div>
          )}
          {chantData.supportUrl && (
            <a
              href={chantData.supportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-400/50 px-4 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-950/40"
              data-testid="link-ended-support-action"
            >
              {chantData.supportLabel || t.supportEvent}
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
          <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-start" data-testid="panel-ended-feedback">
            <p className="font-semibold text-white">{t.rateExperience}</p>
            <p className="mt-1 text-xs text-neutral-400">{t.rateBody}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                ["clarity", t.clearFollow],
                ["safety", t.feltSafe],
                ["accessibility", t.accessible],
              ].map(([key, label]) => (
                <label key={key} className="text-xs text-neutral-300">
                  {label}
                  <select
                    value={feedbackRatings[key as keyof typeof feedbackRatings]}
                    onChange={(event) => setFeedbackRatings((current) => ({ ...current, [key]: Number.parseInt(event.target.value, 10) }))}
                    className="mt-1 w-full rounded-md border border-neutral-700 bg-black p-2 text-neutral-100"
                    data-testid={`select-feedback-${key}`}
                  >
                    {[5, 4, 3, 2, 1].map((value) => (
                      <option key={value} value={value}>{value}/5</option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <textarea
              value={feedbackComment}
              onChange={(event) => setFeedbackComment(event.target.value)}
              maxLength={300}
              rows={3}
              className="mt-3 w-full rounded-lg border border-neutral-700 bg-black p-3 text-sm text-neutral-100 outline-none focus:border-neutral-400"
              placeholder={t.feedbackNote}
              data-testid="input-ended-feedback-comment"
            />
            <button
              type="button"
              onClick={submitFeedback}
              className="mt-3 rounded-md border border-emerald-400/50 px-4 py-2 text-sm font-medium text-emerald-100 hover:bg-emerald-950/40"
              data-testid="button-submit-ended-feedback"
            >
              {t.sendFeedback}
            </button>
            {feedbackStatus && (
              <p className="mt-2 text-xs text-emerald-300" role="status" data-testid="text-feedback-status">{feedbackStatus}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (chantData.demoStatus === "draft") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4" dir={participantDirection}>
        <div className="text-center">
          {renderIncidentNotice()}
          {renderOfflineWarning()}
          <Megaphone className="w-16 h-16 text-neutral-600 mx-auto mb-6" />
          <p className="text-neutral-300 text-2xl font-semibold mb-2" data-testid="text-waiting">
            {t.waitingToBegin}
          </p>
          <p className="text-neutral-500">{chantData.demoTitle}</p>
          {renderParticipantAccess("mx-auto mt-5 max-w-lg")}
          <ParticipantRegistration publicId={publicId} sessionId={getSessionId()} language={participantLanguage} className="mx-auto mt-5 max-w-lg" />
          {renderRunSheetStage("mx-auto mt-5 max-w-lg")}
          <div className="mt-4">{renderParticipantLanguageSelect()}</div>
          {logisticsItems.length > 0 && (
            <div className="mx-auto mt-5 max-w-lg rounded-2xl border border-neutral-800 bg-neutral-950/80 p-4 text-start" data-testid="panel-waiting-logistics">
              <p className="text-sm font-semibold text-neutral-100">{t.eventDetails}</p>
              <dl className="mt-3 space-y-2 text-sm text-neutral-400">
                {logisticsItems.map((item) => (
                  <div key={item.label}>
                    <dt className="text-xs uppercase tracking-wide text-neutral-600">{item.label}</dt>
                    <dd className="mt-0.5 text-neutral-200">{item.value}</dd>
                  </div>
                ))}
              </dl>
              {renderDirectionsLink()}
            </div>
          )}
          <p className="text-neutral-500 text-sm mt-4 max-w-xs mx-auto">
            {t.waitingBody}
          </p>
          <p
            className={`mt-4 inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${
              isOffline
                ? "border-red-500/30 bg-red-500/10 text-red-300"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
            }`}
            role="status"
            aria-live="polite"
            data-testid="text-waiting-connection-status"
          >
            {isOffline ? t.waitingOfflineStatus : t.waitingConnectedStatus}
          </p>
          {chantData.supportUrl && (
            <a
              href={chantData.supportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/50 px-4 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-950/40"
              data-testid="link-waiting-support-action"
            >
              {chantData.supportLabel || t.supportEvent}
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
          <div className="mt-5 rounded-lg border border-neutral-800 bg-neutral-950/70 p-4 text-start text-sm text-neutral-400" data-testid="text-waiting-tips">
            <p className="font-medium text-neutral-300 mb-2">{t.whileWaiting}</p>
            <ul className="space-y-1">
              <li>{t.waitTipOpen}</li>
              <li>{t.waitTipAudio}</li>
              <li>{t.waitTipRefresh}</li>
            </ul>
          </div>
          {isOffline && (
            <p className="text-red-300 text-sm mt-4 max-w-xs mx-auto" role="status" data-testid="text-waiting-offline">
              {t.waitingOfflineBody}
            </p>
          )}
          <button
            type="button"
            onClick={retryConnection}
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-md border border-neutral-800 px-4 py-2 text-xs font-medium text-neutral-300 hover:bg-neutral-900"
            data-testid="button-retry-waiting"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {t.refresh}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col select-none" dir={participantDirection} data-testid="participant-view">
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {chantAnnouncement}
      </div>
      {announcement && (
        <div className="mx-4 mt-4 rounded-2xl border border-amber-300/40 bg-amber-300/15 p-4 text-center text-amber-50" role="status" data-testid="banner-organizer-announcement">
          <p className="text-xs font-mono uppercase tracking-widest text-amber-100/80">
            {getAnnouncementAudienceLabel(announcement.targetRole, t)}
          </p>
          <p className="mt-1 text-lg font-semibold">{announcement.message}</p>
          <button
            type="button"
            onClick={() => setAnnouncement(null)}
            className="mt-2 text-xs font-medium text-amber-100 underline"
            data-testid="button-dismiss-announcement"
          >
            {t.dismiss}
          </button>
        </div>
      )}
      {questionSpotlight && (questionSpotlight.status === "answering" || questionSpotlight.status === "answered") && (
        <section
          className={`mx-4 mt-4 rounded-2xl border p-4 text-center ${questionSpotlight.status === "answering" ? "border-sky-300/50 bg-sky-400/15 text-sky-50" : "border-emerald-300/50 bg-emerald-400/15 text-emerald-50"}`}
          aria-live="polite"
          aria-labelledby="question-spotlight-title"
          data-testid="banner-question-spotlight"
        >
          <p id="question-spotlight-title" className="text-xs font-mono uppercase tracking-widest opacity-80">
            {questionSpotlight.status === "answering" ? t.nowAnswering : t.publishedAnswer}
          </p>
          <p className="mx-auto mt-2 max-w-2xl text-lg font-semibold">{questionSpotlight.text}</p>
          {questionSpotlight.status === "answered" && questionSpotlight.organizerResponse ? (
            <p className="mx-auto mt-3 max-w-2xl rounded-xl bg-black/25 p-3 text-base leading-relaxed" data-testid="text-question-spotlight-answer">{questionSpotlight.organizerResponse}</p>
          ) : (
            <p className="mt-2 text-sm opacity-85">{t.waitingAnswer}</p>
          )}
        </section>
      )}
      {renderParticipantAccess("mx-4 mt-3", true)}
      <ParticipantRegistration publicId={publicId} sessionId={getSessionId()} language={participantLanguage} className="mx-4 mt-4" />
      {renderRunSheetStage("mx-4 mt-4")}
      {renderIncidentNotice()}
      {renderOfflineWarning()}
      {(!connected || isOffline) && (
        <div
          className="mx-4 mt-4 rounded-2xl border border-red-400/50 bg-red-500/15 p-4 text-center text-red-50"
          role="alert"
          data-testid="banner-live-connection-recovery"
        >
          <p className="flex items-center justify-center gap-2 text-sm font-semibold">
            <WifiOff className="h-4 w-4" aria-hidden="true" />
            {t.connectionLostTitle}
          </p>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-red-100/90">
            {t.connectionLostBody}
          </p>
          <button
            type="button"
            onClick={retryConnection}
            className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-red-200/70 bg-black/30 px-5 py-2 text-sm font-semibold text-white hover:bg-black/50"
            data-testid="button-live-reconnect-now"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {t.reconnectNow}
          </button>
        </div>
      )}
      {chantData.supportUrl && (
        <div className="mx-4 mt-4 rounded-2xl border border-emerald-300/40 bg-emerald-300/15 p-4 text-center text-emerald-50" data-testid="banner-participant-support-action">
          <p className="text-xs font-mono uppercase tracking-widest text-emerald-100/80">
            {t.organizerAction}
          </p>
          <a
            href={chantData.supportUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-emerald-300 px-5 py-2 text-sm font-bold text-emerald-950 shadow-lg shadow-emerald-950/20"
            data-testid="link-participant-support-action"
          >
            {chantData.supportLabel || t.supportEvent}
            <ExternalLink className="h-4 w-4" />
          </a>
          <p className="mx-auto mt-2 max-w-md text-xs text-emerald-50/80">
            {t.opensOrganizerPage}
          </p>
        </div>
      )}
      {logisticsItems.length > 0 && (
        <div className="mx-4 mt-4 rounded-2xl border border-neutral-800 bg-neutral-950/90 p-4 text-neutral-100" data-testid="banner-participant-logistics">
          <p className="text-xs font-mono uppercase tracking-widest text-neutral-500">{t.eventDetails}</p>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            {logisticsItems.map((item) => (
              <div key={item.label}>
                <dt className="text-xs uppercase tracking-wide text-neutral-600">{item.label}</dt>
                <dd className="mt-0.5 text-neutral-200">{item.value}</dd>
              </div>
            ))}
          </dl>
          {renderDirectionsLink()}
        </div>
      )}
      <div className="flex-1 flex items-center justify-center p-6">
        <div 
          className={`text-center ${
            lowBandwidth
              ? ""
              : `transition-all duration-500 transform ${fadeIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`
          }`}
          style={{ width: "100%", maxWidth: "90vw" }}
        >
          {chantData.chantIndex !== null && (
            <p className="text-neutral-500 text-sm font-mono mb-6 tracking-wider" data-testid="text-chant-number">
              {t.chant} {formatParticipantNumber(chantData.chantIndex + 1, participantLanguage)} {t.of} {formatParticipantNumber(chantData.totalChants, participantLanguage)} - {t.cycle} {formatParticipantNumber(chantData.currentCycle ?? 1, participantLanguage)} {t.of} {formatParticipantNumber(chantData.cycleCount ?? 1, participantLanguage)}
            </p>
          )}
          {hasChantContent ? (
            <div className="space-y-6" style={{ maxWidth: "90vw" }}>
              <div
                className={`mx-auto max-w-xl rounded-full border px-4 py-2 text-sm font-semibold ${phaseGuidance.className}`}
                role="status"
                aria-live="polite"
                data-testid="text-phase-guidance"
              >
                <span>{phaseGuidance.label}</span>
                <span className="ml-2 font-normal opacity-80">{phaseGuidance.detail}</span>
              </div>
              {chantData.callText && (
                <div data-testid="text-call" className={chantData.currentPhase === "leader" ? "ring-2 ring-orange-500/80 rounded-xl p-2" : "p-2"}>
                  <p className="text-neutral-400 text-xs font-mono uppercase tracking-widest mb-2">{t.leader}</p>
                  <h1
                    className="font-bold leading-tight break-words"
                    style={{
                      fontSize: chantFontSize,
                      lineHeight: 1.15,
                      color: callColor,
                    }}
                  >
                    {chantData.callText}
                  </h1>
                  {renderPhaseProgress("leader")}
                </div>
              )}
              {chantData.responseText && (
                <div data-testid="text-response" className={chantData.currentPhase === "people" ? "ring-2 ring-sky-400/80 rounded-xl p-2" : "p-2"}>
                  <p className="text-neutral-400 text-xs font-mono uppercase tracking-widest mb-2">{t.everyone}</p>
                  <h1
                    className="font-bold leading-tight break-words"
                    style={{
                      fontSize: chantFontSize,
                      lineHeight: 1.15,
                      color: responseColor,
                    }}
                  >
                    {chantData.responseText}
                  </h1>
                  {renderPhaseProgress("people")}
                </div>
              )}

              {/* Next Chant Preview */}
              {!lowBandwidth && (chantData.nextCallText || chantData.nextResponseText) && (
                <div className="mt-12 pt-8 border-t border-neutral-800 opacity-50 relative">
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-black px-3 text-xs font-mono text-neutral-600 uppercase tracking-widest">
                    {t.next}
                  </span>
                  <div className="space-y-4">
                    {chantData.nextCallText && (
                      <div>
                        <p className="text-neutral-500 text-[10px] font-mono uppercase tracking-wider mb-1">{t.leader}</p>
                        <h2 className="font-semibold text-orange-500/70 text-base leading-snug break-words">
                          {chantData.nextCallText}
                        </h2>
                      </div>
                    )}
                    {chantData.nextResponseText && (
                      <div>
                        <p className="text-neutral-500 text-[10px] font-mono uppercase tracking-wider mb-1">{t.everyone}</p>
                        <h2 className="font-semibold text-sky-400/70 text-base leading-snug break-words">
                          {chantData.nextResponseText}
                        </h2>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-neutral-500 text-xl" data-testid="text-no-chant">
              {t.waitNext}
            </p>
          )}
        </div>
      </div>

      {showHelp && (
        <section
          className="mx-4 mb-3 rounded-2xl border border-neutral-700 bg-neutral-950 p-4 text-sm text-neutral-300 shadow-2xl"
          aria-label={t.helpPanelLabel}
          data-testid="panel-participant-help"
        >
          <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-4">
            <div>
              <p className="mb-1 flex items-center gap-2 font-semibold text-white">
                <HelpCircle className="h-4 w-4" />
                {t.pageStops}
              </p>
              <p className="text-neutral-400">{t.pageStopsBody}</p>
              <button
                type="button"
                onClick={retryConnection}
                className="mt-3 inline-flex items-center gap-2 rounded-md border border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-200 hover:bg-neutral-900"
                data-testid="button-help-refresh-connection"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {t.refresh}
              </button>
            </div>
            <div>
              <p className="mb-1 flex items-center gap-2 font-semibold text-white">
                <Eye className="h-4 w-4" />
                {t.visibility}
              </p>
              <p className="text-neutral-400">{t.visibilityBody}</p>
            </div>
            <div>
              <p className="mb-1 flex items-center gap-2 font-semibold text-white">
                <ShieldCheck className="h-4 w-4" />
                {t.plansChange}
              </p>
              <p className="text-neutral-400">{t.plansChangeBody}</p>
            </div>
            <div>
              <p className="mb-1 flex items-center gap-2 font-semibold text-white">
                <Users className="h-4 w-4" />
                {t.signalTitle}
              </p>
              <p className="text-neutral-400">{t.signalBody}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => sendPulse("too_fast")}
                  disabled={pulsePending}
                  aria-pressed={pulseReceipt?.type === "too_fast"}
                  className={`min-h-11 rounded-md border px-3 py-2 text-xs font-medium ${pulseReceipt?.type === "too_fast" ? "border-amber-300 bg-amber-300/15 text-amber-100" : "border-neutral-700 text-neutral-200 hover:bg-neutral-900"}`}
                  data-testid="button-pulse-too-fast"
                >
                  {t.tooFast}
                </button>
                <button
                  type="button"
                  onClick={() => sendPulse("too_slow")}
                  disabled={pulsePending}
                  aria-pressed={pulseReceipt?.type === "too_slow"}
                  className={`min-h-11 rounded-md border px-3 py-2 text-xs font-medium ${pulseReceipt?.type === "too_slow" ? "border-amber-300 bg-amber-300/15 text-amber-100" : "border-neutral-700 text-neutral-200 hover:bg-neutral-900"}`}
                  data-testid="button-pulse-too-slow"
                >
                  {t.tooSlow}
                </button>
                <button
                  type="button"
                  onClick={() => sendPulse("cant_hear")}
                  disabled={pulsePending}
                  aria-pressed={pulseReceipt?.type === "cant_hear"}
                  className={`min-h-11 rounded-md border px-3 py-2 text-xs font-medium ${pulseReceipt?.type === "cant_hear" ? "border-amber-300 bg-amber-300/15 text-amber-100" : "border-neutral-700 text-neutral-200 hover:bg-neutral-900"}`}
                  data-testid="button-pulse-cant-hear"
                >
                  {t.cantHear}
                </button>
                <button
                  type="button"
                  onClick={() => sendPulse("all_good")}
                  disabled={pulsePending}
                  aria-pressed={pulseReceipt?.type === "all_good"}
                  className={`min-h-11 rounded-md border px-3 py-2 text-xs font-medium ${pulseReceipt?.type === "all_good" ? "border-emerald-200 bg-emerald-300/20 text-white" : "border-emerald-400/40 text-emerald-100 hover:bg-emerald-950/40"}`}
                  data-testid="button-pulse-all-good"
                >
                  {t.allGood}
                </button>
              </div>
              {pulseReceipt && (
                <div className="mt-3 rounded-lg border border-emerald-300/30 bg-emerald-300/10 p-3 text-xs text-emerald-100" role="status" aria-live="polite" data-testid="card-pulse-receipt">
                  <p className="font-semibold">{pulseStatus === "recovered" ? t.signalRecovered : t.signalSent}</p>
                  <p className="mt-1">{t.signalRecordedAt}: {new Intl.DateTimeFormat(participantLocales[participantLanguage], { timeStyle: "short" }).format(new Date(pulseReceipt.createdAt))}</p>
                  <p className="mt-1 text-emerald-100/80">{t.signalPrivate}</p>
                </div>
              )}
              {pulseReceiptError && (
                <div className="mt-3 rounded-lg border border-amber-300/40 bg-amber-300/10 p-3 text-xs text-amber-50" role="alert" data-testid="alert-pulse-receipt-error">
                  <p>{t.signalReceiptFailed}</p>
                  <button type="button" className="mt-2 min-h-11 rounded-md border border-amber-200/50 px-3 py-2 font-semibold" onClick={() => void refreshPulseReceipt(true)}>{t.retrySignal}</button>
                </div>
              )}
            </div>
            <div>
              <p className="mb-1 flex items-center gap-2 font-semibold text-white">
                <Users className="h-4 w-4" />
                {t.supportTitle}
              </p>
              <p className="text-neutral-400">{t.supportBody}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => requestAssistance("accessibility", "Participant needs accessibility support.")}
                  className="rounded-md border border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-200 hover:bg-neutral-900"
                  data-testid="button-request-accessibility-help"
                >
                  {t.needAccessibility}
                </button>
                <button
                  type="button"
                  onClick={() => requestAssistance("connection", "Participant needs connection help.")}
                  className="rounded-md border border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-200 hover:bg-neutral-900"
                  data-testid="button-request-connection-help"
                >
                  {t.needConnection}
                </button>
                <button
                  type="button"
                  onClick={() => requestAssistance("safety", "Participant needs safety or marshal help.")}
                  className="rounded-md border border-red-500/40 px-3 py-1.5 text-xs font-medium text-red-100 hover:bg-red-950/40"
                  data-testid="button-request-safety-help"
                >
                  {t.needSafety}
                </button>
              </div>
              {assistanceSent && (
                <p className="mt-2 text-xs text-emerald-300" role="status" data-testid="text-assistance-sent">
                  {t.organizerNotified}
                </p>
              )}
              {assistanceError && (
                <p className="mt-2 text-xs text-red-300" role="alert" data-testid="text-assistance-error">
                  {assistanceError}
                </p>
              )}
            </div>
          </div>
          <div className="mx-auto mt-4 grid max-w-6xl gap-4 md:grid-cols-[1fr_1.2fr]">
            <div className="rounded-xl border border-sky-300/40 bg-sky-400/10 p-4 md:col-span-2" dir={participantDirection} data-testid="card-attendance-receipt">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="max-w-3xl">
                  <p className="flex items-center gap-2 font-semibold text-sky-50">
                    <Users className="h-4 w-4" aria-hidden="true" />
                    {attendanceT.title}
                  </p>
                  <p className="mt-1 text-sm text-sky-100/90">{attendanceT.body}</p>
                  <p className="mt-2 text-xs leading-relaxed text-sky-100/80" data-testid="text-attendance-privacy">{attendanceT.exactPrivacy}</p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${attendanceOptOut ? "border-neutral-500 text-neutral-300" : "border-emerald-300/50 text-emerald-100"}`}>
                  {attendanceOptOut ? attendanceT.off : attendanceT.on}
                </span>
              </div>
              {attendanceReceipt && !attendanceOptOut ? (
                <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-testid="attendance-receipt-values">
                  <div className="rounded-lg border border-sky-200/20 bg-black/20 p-3"><dt className="text-xs text-sky-100/70">{attendanceT.firstJoin}</dt><dd className="mt-1 font-semibold text-white">{formatParticipantSchedule(attendanceReceipt.firstJoinAt, participantLanguage)}</dd></div>
                  <div className="rounded-lg border border-sky-200/20 bg-black/20 p-3"><dt className="text-xs text-sky-100/70">{attendanceT.visits}</dt><dd className="mt-1 font-semibold text-white">{formatParticipantNumber(attendanceReceipt.visitCount, participantLanguage)}</dd></div>
                  <div className="rounded-lg border border-sky-200/20 bg-black/20 p-3"><dt className="text-xs text-sky-100/70">{attendanceT.observed}</dt><dd className="mt-1 font-semibold text-white">{formatParticipantNumber(Math.round(attendanceReceipt.observedSeconds / 60), participantLanguage)} {attendanceT.minutes}</dd></div>
                  <div className="rounded-lg border border-sky-200/20 bg-black/20 p-3"><dt className="text-xs text-sky-100/70">{attendanceT.lastSeen}</dt><dd className="mt-1 font-semibold text-white">{formatParticipantSchedule(attendanceReceipt.lastSeenAt, participantLanguage)}</dd></div>
                </dl>
              ) : (
                <p className="mt-4 rounded-lg border border-sky-200/20 bg-black/20 p-3 text-sm text-sky-100/80" data-testid="text-no-attendance-receipt">{attendanceT.noRecord}</p>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {attendanceOptOut ? (
                  <button type="button" onClick={restoreAttendance} className="min-h-11 rounded-md border border-sky-200/40 px-3 py-2 text-xs font-semibold text-sky-50 hover:bg-sky-950/40" data-testid="button-restore-attendance">{attendanceT.restore}</button>
                ) : (
                  <button type="button" onClick={forgetAttendance} className="min-h-11 rounded-md border border-neutral-600 px-3 py-2 text-xs font-semibold text-neutral-200 hover:bg-neutral-900" data-testid="button-forget-attendance">{attendanceT.forget}</button>
                )}
                {attendanceStatus && <p className="text-xs text-emerald-200" role="status" data-testid="text-attendance-status">{attendanceStatus}</p>}
                {attendanceError && <p className="text-xs text-amber-200" role="alert" data-testid="text-attendance-error">{attendanceT.error}</p>}
              </div>
            </div>
            <div className="rounded-xl border border-violet-300/40 bg-violet-400/10 p-4 md:col-span-2" data-testid="card-private-conduct-report">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="max-w-3xl">
                  <p className="flex items-center gap-2 font-semibold text-violet-50">
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                    {conductT.title}
                  </p>
                  <p className="mt-1 text-sm text-violet-100/90">{conductT.body}</p>
                  <p className="mt-2 text-xs text-violet-100/80" data-testid="text-conduct-privacy">{conductT.privacy}</p>
                </div>
                <span className="rounded-full border border-violet-200/40 px-3 py-1 text-xs font-semibold text-violet-50">{conductT.privateLabel}</span>
              </div>
              <p className="mt-3 rounded-lg border border-amber-300/40 bg-amber-300/10 p-3 text-xs leading-relaxed text-amber-100" role="note" data-testid="text-conduct-emergency-boundary">
                {conductT.emergency}
              </p>
              <div className="mt-4 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
                <div>
                  <label htmlFor="conduct-category" className="text-xs font-medium text-violet-100">{conductT.category}</label>
                  <select
                    id="conduct-category"
                    value={conductCategory}
                    onChange={(event) => setConductCategory(event.target.value as ConductReportCategory)}
                    className="mt-1 min-h-11 w-full rounded-lg border border-violet-300/30 bg-neutral-950 px-3 text-sm text-white"
                    data-testid="select-conduct-category"
                  >
                    {(Object.keys(conductT.categories) as ConductReportCategory[]).map((category) => (
                      <option key={category} value={category}>{conductT.categories[category]}</option>
                    ))}
                  </select>
                  <fieldset className="mt-3">
                    <legend className="text-xs font-medium text-violet-100">{conductT.urgencyLabel}</legend>
                    <div className="mt-1 grid grid-cols-2 gap-2">
                      {(["follow_up", "urgent"] as const).map((urgency) => (
                        <button
                          key={urgency}
                          type="button"
                          onClick={() => setConductUrgency(urgency)}
                          aria-pressed={conductUrgency === urgency}
                          className={`min-h-11 rounded-lg border px-3 py-2 text-xs font-semibold ${conductUrgency === urgency ? "border-violet-100 bg-violet-200/20 text-white" : "border-violet-300/30 text-violet-100"}`}
                          data-testid={`button-conduct-urgency-${urgency}`}
                        >
                          {urgency === "urgent" ? conductT.urgent : conductT.followUp}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                </div>
                <div>
                  <label htmlFor="conduct-details" className="text-xs font-medium text-violet-100">{conductT.details}</label>
                  <textarea
                    id="conduct-details"
                    value={conductDetails}
                    onChange={(event) => setConductDetails(event.target.value)}
                    maxLength={600}
                    rows={5}
                    className="mt-1 w-full rounded-lg border border-violet-300/30 bg-neutral-950 p-3 text-sm text-white outline-none focus:border-violet-100"
                    placeholder={conductT.placeholder}
                    data-testid="input-conduct-details"
                  />
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-violet-100/70">{conductDetails.trim().length}/600 · {conductT.minimumLabel} 20</span>
                    <button
                      type="button"
                      onClick={submitConductReport}
                      disabled={conductDetails.trim().length < 20 || conductLoading}
                      className="min-h-11 rounded-lg border border-violet-200/50 bg-violet-200/15 px-4 py-2 text-sm font-semibold text-violet-50 hover:bg-violet-200/25 disabled:cursor-not-allowed disabled:opacity-50"
                      data-testid="button-submit-conduct-report"
                    >
                      {conductLoading ? "…" : conductT.submit}
                    </button>
                  </div>
                </div>
              </div>
              {conductStatus && (
                <p className={`mt-3 text-sm ${conductStatusError ? "text-red-200" : "text-emerald-200"}`} role={conductStatusError ? "alert" : "status"} data-testid="text-conduct-submit-status">
                  {conductStatus}
                </p>
              )}
              <div className="mt-5 border-t border-violet-200/20 pt-4" data-testid="panel-private-conduct-receipts">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-violet-50">{conductT.myReports}</p>
                  <button type="button" onClick={() => refreshConductReports(true)} disabled={conductLoading} className="min-h-11 rounded-full border border-violet-200/30 px-3 py-2 text-xs font-semibold text-violet-100 disabled:opacity-50" data-testid="button-refresh-conduct-reports">
                    <RefreshCw className="me-1 inline h-3.5 w-3.5" aria-hidden="true" />{conductT.refresh}
                  </button>
                </div>
                {conductReports.length === 0 ? (
                  <p className="mt-2 text-sm text-violet-100/70" data-testid="text-no-conduct-reports">{conductT.noReports}</p>
                ) : (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {conductReports.map((report) => (
                      <article key={report.id} className="rounded-lg border border-violet-200/25 bg-black/25 p-3" data-testid={`card-conduct-receipt-${report.id}`}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-violet-100">{conductT.reference} {report.reference}</p>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${report.status === "resolved" ? "bg-emerald-300/20 text-emerald-100" : report.status === "acknowledged" ? "bg-sky-300/20 text-sky-100" : "bg-amber-300/20 text-amber-100"}`}>
                            {conductT.statuses[report.status]}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-violet-100/80">{conductT.categories[report.category]} · {report.urgency === "urgent" ? conductT.urgent : conductT.followUp}</p>
                        <p className="mt-2 line-clamp-3 text-sm text-violet-50">{report.details}</p>
                        {report.organizerResponse && (
                          <div className="mt-3 rounded-md border border-emerald-300/30 bg-emerald-300/10 p-2 text-sm text-emerald-50">
                            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100/80">{conductT.response}</p>
                            <p className="mt-1">{report.organizerResponse}</p>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 md:col-span-2" data-testid="card-participant-engagement">
              <p className="font-semibold text-emerald-50">{t.participation}</p>
              <p className="mt-1 text-xs text-emerald-100/80">
                {t.participationBody}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-emerald-300/40 px-3 py-1 text-sm font-semibold text-emerald-50" data-testid="text-engagement-points">
                  {formatParticipantNumber(engagement?.points ?? 0, participantLanguage)} {t.points}
                </span>
                {(engagement?.badges.length ?? 0) > 0 ? engagement?.badges.map((badge) => (
                  <span key={badge} className="rounded-full border border-emerald-300/30 bg-black/20 px-3 py-1 text-xs text-emerald-100">
                    {badge}
                  </span>
                )) : (
                  <span className="text-xs text-emerald-100/70">{t.firstBadge}</span>
                )}
              </div>
            </div>
            <div className="rounded-xl border border-sky-400/30 bg-sky-400/10 p-4 md:col-span-2" data-testid="card-live-participant-poll">
              <p className="font-semibold text-sky-50">{t.livePoll}</p>
              {activePoll ? (
                <div>
                  <div className="mt-1 flex flex-wrap items-start justify-between gap-2">
                    <p className="text-sm text-sky-100">{activePoll.question}</p>
                    <span className="rounded-full border border-sky-300/30 px-2 py-1 text-[11px] font-semibold text-sky-100">
                      {activePoll.status === "open" ? t.pollOpen : t.pollClosed}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    {activePoll.options.map((option) => {
                      const selected = pollVotes[activePoll.id] === option.id;
                      const percent = activePoll.totalVotes > 0 ? Math.round((option.votes / activePoll.totalVotes) * 100) : 0;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => submitPollVote(activePoll.id, option.id)}
                          disabled={activePoll.status !== "open"}
                          aria-pressed={selected}
                          className={`rounded-lg border p-3 text-start text-sm ${
                            selected
                              ? "border-sky-200 bg-sky-200/20 text-white"
                              : "border-sky-300/30 text-sky-50 hover:bg-sky-300/10 disabled:cursor-default disabled:opacity-80"
                          }`}
                          data-testid={`button-live-poll-option-${option.id}`}
                        >
                          <span className="font-semibold">{option.label}</span>
                          <span className="mt-1 block text-xs text-sky-100/80">
                            {formatParticipantNumber(option.votes, participantLanguage)} {t.votes} - {formatParticipantNumber(percent, participantLanguage)}%
                          </span>
                          <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-black/30">
                            <span className="block h-full rounded-full bg-sky-200" style={{ width: `${percent}%` }} />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {activePoll.status === "closed" ? (
                    <div className="mt-3 rounded-lg border border-sky-200/30 bg-black/20 p-3" role="status" aria-live="polite" data-testid="panel-participant-poll-decision">
                      <p className="text-xs font-semibold uppercase tracking-wide text-sky-100">{t.decisionRecorded}</p>
                      <p className="mt-1 text-sm font-semibold text-white">
                        {t.decisionOutcome}: {activePoll.options.find((option) => option.id === activePoll.decisionOptionId)?.label ?? t.outcomeUnavailable}
                      </p>
                      {activePoll.decisionNote ? <p className="mt-2 text-sm text-sky-100"><span className="font-semibold">{t.decisionReason}:</span> {activePoll.decisionNote}</p> : null}
                      <p className="mt-2 text-xs text-sky-100/80">{t.pollDecisionRetained}</p>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-sky-100/80">
                      {pollVotes[activePoll.id] ? t.voteCounted : t.voteGuidance}
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-1 text-sm text-sky-100/80">{t.noPoll}</p>
              )}
              {pollStatus && (
                <p className="mt-2 text-xs text-sky-50" role="status" data-testid="text-live-poll-status">{pollStatus}</p>
              )}
              {pollReceiptError && (
                <div className="mt-3 rounded-lg border border-amber-300/40 bg-amber-300/10 p-3 text-xs text-amber-50" role="alert" data-testid="alert-poll-receipt-error">
                  <p>{t.pollReceiptFailed}</p>
                  <button type="button" className="mt-2 min-h-11 rounded-md border border-amber-200/50 px-3 py-2 font-semibold" onClick={() => void refreshPollReceipt(true)}>{t.retryPollReceipt}</button>
                </div>
              )}
            </div>
            <div className="rounded-xl border border-red-400/30 bg-red-400/10 p-4 md:col-span-2" data-testid="card-participant-safety-check">
              <p className="font-semibold text-red-50">{t.safetyCheck}</p>
              {activeSafetyCheck?.status === "open" ? (
                <div>
                  <p className="mt-1 text-sm text-red-100">{activeSafetyCheck.message}</p>
                  <textarea
                    value={safetyNote}
                    onChange={(event) => setSafetyNote(event.target.value)}
                    maxLength={160}
                    rows={2}
                    className="mt-3 w-full rounded-lg border border-red-300/30 bg-black/30 p-3 text-sm text-red-50 outline-none focus:border-red-200"
                    placeholder={t.optionalSafetyNote}
                    data-testid="input-safety-check-note"
                  />
                  <div className="mt-3 grid gap-2 sm:grid-cols-4">
                    {[
                      ["ok", t.imOk],
                      ["need_help", t.needHelp],
                      ["leaving", t.leaving],
                      ["not_sure", t.notSure],
                    ].map(([value, label]) => {
                      const selected = safetyResponses[activeSafetyCheck.id] === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => submitSafetyResponse(activeSafetyCheck.id, value as "ok" | "need_help" | "leaving" | "not_sure")}
                          className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                            selected
                              ? "border-red-100 bg-red-100/20 text-white"
                              : "border-red-300/30 text-red-50 hover:bg-red-300/10"
                          }`}
                          data-testid={`button-safety-check-${value}`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs text-red-100/80">
                    {safetyResponses[activeSafetyCheck.id] ? t.safetyCounted : t.safetyGuidance}
                  </p>
                </div>
              ) : (
                <p className="mt-1 text-sm text-red-100/80">{t.noSafetyCheck}</p>
              )}
              {safetyStatus && (
                <p className="mt-2 text-xs text-red-50" role="status" data-testid="text-safety-check-status">{safetyStatus}</p>
              )}
            </div>
            <div className="rounded-xl border border-neutral-800 bg-black/30 p-4 md:col-span-2">
              <p className="font-semibold text-white">{t.checkInTitle}</p>
              <p className="mt-1 text-xs text-neutral-400">{t.checkInBody}</p>
              <input
                value={checkInName}
                onChange={(event) => setCheckInName(event.target.value)}
                maxLength={60}
                className="mt-3 w-full rounded-lg border border-neutral-700 bg-neutral-950 p-3 text-sm text-neutral-100 outline-none focus:border-neutral-400"
                placeholder={t.optionalName}
                data-testid="input-checkin-name"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  ["participant", t.participant],
                  ["marshal", t.marshal],
                  ["speaker", t.speaker],
                  ["accessibility", t.accessibilityHelper],
                ].map(([role, label]) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => submitCheckIn(role as CheckInRole)}
                    className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                      checkedInRole === role
                        ? "border-emerald-300/70 bg-emerald-300/15 text-emerald-100"
                        : "border-neutral-700 text-neutral-200 hover:bg-neutral-900"
                    }`}
                    data-testid={`button-checkin-${role}`}
                  >
                    {checkedInRole === role ? `${t.checkedIn}: ` : ""}
                    {label}
                  </button>
                ))}
              </div>
              {checkInStatus && (
                <p className="mt-2 text-xs text-emerald-300" role="status" data-testid="text-checkin-status">
                  {checkInStatus}
                </p>
              )}
            </div>
            <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
              <p className="font-semibold text-white">{t.askOrganizer}</p>
              <p className="mt-1 text-xs text-neutral-400">{t.askBody}</p>
              <textarea
                value={questionText}
                onChange={(event) => setQuestionText(event.target.value)}
                maxLength={220}
                rows={3}
                className="mt-3 w-full rounded-lg border border-neutral-700 bg-neutral-950 p-3 text-sm text-neutral-100 outline-none focus:border-neutral-400"
                placeholder={t.askPlaceholder}
                data-testid="input-audience-question"
              />
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-xs text-neutral-500">{questionText.length}/220</span>
                <button
                  type="button"
                  onClick={submitQuestion}
                  disabled={!questionText.trim()}
                  className="min-h-11 rounded-md border border-neutral-700 px-3 py-2 text-xs font-medium text-neutral-200 hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-50"
                  data-testid="button-submit-audience-question"
                >
                  {t.sendQuestion}
                </button>
              </div>
              {questionStatus && (
                <p className="mt-2 text-xs text-emerald-300" role="status" data-testid="text-question-status">
                  {questionStatus}
                </p>
              )}
              <div className="mt-4 border-t border-neutral-800 pt-4" data-testid="panel-private-question-receipts">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-neutral-200">{t.questionReceipts}</p>
                  <span className="rounded-full border border-emerald-400/30 px-2 py-1 text-[10px] text-emerald-200">{conductT.privateLabel}</span>
                </div>
                {questionReceiptError ? (
                  <div className="mt-2" role="alert">
                    <p className="text-xs text-amber-200">{t.questionFailed}</p>
                    <button type="button" onClick={refreshQuestionReceipts} className="mt-2 min-h-11 rounded-md border border-neutral-700 px-3 py-2 text-xs">{t.refresh}</button>
                  </div>
                ) : questionReceipts.length === 0 ? (
                  <p className="mt-2 text-xs text-neutral-500">{t.noQuestionReceipts}</p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {questionReceipts.slice(0, 3).map((receipt) => {
                      const statusLabel = receipt.status === "open" ? t.questionOpen : receipt.status === "answering" ? t.questionAnswering : receipt.status === "answered" ? t.questionAnswered : t.questionDismissed;
                      return (
                        <div key={receipt.id} className="rounded-lg border border-neutral-800 bg-neutral-950 p-3" data-testid={`card-private-question-receipt-${receipt.id}`}>
                          <p className="text-xs text-neutral-200">{receipt.text}</p>
                          <p className="mt-2 text-[11px] font-semibold text-sky-200" role="status">{statusLabel}</p>
                          {receipt.organizerResponse && <p className="mt-2 rounded-md bg-emerald-400/10 p-2 text-xs text-emerald-100">{receipt.organizerResponse}</p>}
                          {receipt.status === "open" && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              <button type="button" onClick={() => withdrawQuestion(receipt.id)} className="min-h-11 rounded-md border border-neutral-700 px-3 py-2 text-xs text-neutral-200" data-testid={`button-withdraw-question-${receipt.id}`}>
                                {withdrawQuestionPendingId === receipt.id ? t.confirmWithdrawQuestion : t.withdrawQuestion}
                              </button>
                              {withdrawQuestionPendingId === receipt.id && <button type="button" onClick={() => setWithdrawQuestionPendingId(null)} className="min-h-11 rounded-md px-3 py-2 text-xs text-neutral-300 underline">{t.keepQuestion}</button>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                <p className="mt-2 text-[11px] leading-relaxed text-neutral-500">{t.questionReceiptPrivacy}</p>
              </div>
            </div>
            <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
              <p className="font-semibold text-white">{t.raisedQuestions}</p>
              <div className="mt-3 max-h-52 space-y-2 overflow-y-auto pr-1">
                {audienceQuestions.length === 0 ? (
                  <p className="text-sm text-neutral-500" data-testid="text-no-audience-questions">{t.noQuestions}</p>
                ) : (
                  audienceQuestions.slice(0, 5).map((question) => (
                    <div key={question.id} className="rounded-lg border border-neutral-800 bg-neutral-950 p-3" data-testid={`card-audience-question-${question.id}`}>
                      <p className="text-sm text-neutral-200">{question.text}</p>
                      <button
                        type="button"
                        onClick={() => upvoteQuestion(question.id)}
                        className="mt-2 min-h-11 rounded-full border border-neutral-700 px-3 py-2 text-xs text-neutral-300 hover:bg-neutral-900"
                        data-testid={`button-upvote-question-${question.id}`}
                      >
                        {t.voteUp} ({formatParticipantNumber(question.votes, participantLanguage)})
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="rounded-xl border border-neutral-800 bg-black/30 p-4 md:col-span-2">
              <p className="font-semibold text-white">{t.rateExperience}</p>
              <p className="mt-1 text-xs text-neutral-400">{t.rateBody}</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {[
                  ["clarity", t.clearFollow],
                  ["safety", t.feltSafe],
                  ["accessibility", t.accessible],
                ].map(([key, label]) => (
                  <label key={key} className="text-xs text-neutral-300">
                    {label}
                    <select
                      value={feedbackRatings[key as keyof typeof feedbackRatings]}
                      onChange={(event) => setFeedbackRatings((current) => ({ ...current, [key]: Number.parseInt(event.target.value, 10) }))}
                      className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-950 p-2 text-neutral-100"
                      data-testid={`select-live-feedback-${key}`}
                    >
                      {[5, 4, 3, 2, 1].map((value) => (
                        <option key={value} value={value}>{value}/5</option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              <textarea
                value={feedbackComment}
                onChange={(event) => setFeedbackComment(event.target.value)}
                maxLength={300}
                rows={2}
                className="mt-3 w-full rounded-lg border border-neutral-700 bg-neutral-950 p-3 text-sm text-neutral-100 outline-none focus:border-neutral-400"
                placeholder={t.feedbackNote}
                data-testid="input-live-feedback-comment"
              />
              <button
                type="button"
                onClick={submitFeedback}
                className="mt-3 rounded-md border border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-200 hover:bg-neutral-900"
                data-testid="button-submit-live-feedback"
              >
                {t.sendFeedback}
              </button>
              {feedbackStatus && (
                <p className="mt-2 text-xs text-emerald-300" role="status" data-testid="text-live-feedback-status">{feedbackStatus}</p>
              )}
            </div>
          </div>
        </section>
      )}

      <footer className="px-4 py-3 flex flex-wrap items-center justify-center gap-3 border-t border-neutral-800">
        <span className="sr-only" role="status" aria-live="polite">{participantDisplayMode}</span>
        <button
          type="button"
          onClick={() => setShowHelp((value) => !value)}
          className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
            showHelp ? "border-emerald-300/80 bg-emerald-300/15 text-emerald-100" : "border-neutral-700 text-neutral-300"
          }`}
          aria-expanded={showHelp}
          data-testid="button-toggle-participant-help"
        >
          <HelpCircle className="h-3.5 w-3.5" />
          {showHelp ? t.helpOpen : t.help}
        </button>
        <button
          type="button"
          onClick={() => setLowBandwidth((value) => !value)}
          className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
            lowBandwidth ? "border-sky-300/80 bg-sky-300/15 text-sky-100" : "border-neutral-700 text-neutral-300"
          }`}
          aria-pressed={lowBandwidth}
          title={participantDisplayMode}
          data-testid="button-toggle-low-bandwidth"
        >
          <WifiOff className="h-3.5 w-3.5" />
          {lowBandwidth ? t.lowBandwidthOn : t.lowBandwidth}
        </button>
        <button
          type="button"
          onClick={() => setLargeText((value) => !value)}
          className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
            largeText ? "border-white/60 bg-white/15 text-white" : "border-neutral-700 text-neutral-300"
          }`}
          aria-pressed={largeText}
          data-testid="button-toggle-large-text"
        >
          <Type className="h-3.5 w-3.5" />
          {largeText ? t.largeTextOn : t.largeText}
        </button>
        <button
          type="button"
          onClick={() => setHighContrast((value) => !value)}
          className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
            highContrast ? "border-yellow-300/80 bg-yellow-300/15 text-yellow-100" : "border-neutral-700 text-neutral-300"
          }`}
          aria-pressed={highContrast}
          data-testid="button-toggle-high-contrast"
        >
          <Eye className="h-3.5 w-3.5" />
          {highContrast ? t.highContrastOn : t.highContrast}
        </button>
        {wakeLockSupported && (
          <button
            type="button"
            onClick={toggleScreenWakeLock}
            className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
              keepScreenAwake ? "border-amber-300/80 bg-amber-300/15 text-amber-100" : "border-neutral-700 text-neutral-300"
            }`}
            aria-pressed={keepScreenAwake}
            title={screenAwakeActive ? t.wakeLockActive : t.wakeLockDescription}
            data-testid="button-toggle-screen-awake"
          >
            <Sun className="h-3.5 w-3.5" />
            {keepScreenAwake ? t.screenStaysOn : t.keepScreenOn}
          </button>
        )}
        {renderParticipantLanguageSelect()}
        <button
          type="button"
          onClick={() => setShowHelp(true)}
          className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${attendanceOptOut ? "border-neutral-700 text-neutral-300" : "border-sky-500/30 bg-sky-500/10 text-sky-200"}`}
          aria-label={`${attendanceOptOut ? attendanceT.off : attendanceT.on}. ${attendanceT.title}`}
          data-testid="button-open-attendance-receipt"
        >
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          {attendanceOptOut ? attendanceT.off : attendanceT.on}
        </button>
        <span className="inline-flex items-center gap-2">
          <Users className="w-4 h-4 text-neutral-500" />
          <span className="text-neutral-400 text-sm font-mono" data-testid="text-viewer-count">
            {t.viewingNow}: {formatParticipantNumber(viewerCount, participantLanguage)}
          </span>
        </span>
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
            connected && !isOffline
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-red-500/30 bg-red-500/10 text-red-300"
          }`}
          role="status"
          aria-live="polite"
          data-testid="text-connection-status"
        >
          <span className={`h-2 w-2 rounded-full ${connected && !isOffline ? "bg-emerald-300" : "bg-red-300"}`} aria-hidden="true" />
          {isOffline
            ? t.offline
            : connected
              ? t.connected
              : t.reconnecting}
        </span>
        {wakeLockError && (
          <span className="w-full text-center text-xs text-amber-300" role="status" data-testid="text-screen-awake-error">
            {wakeLockError}
          </span>
        )}
      </footer>
    </div>
  );
}
