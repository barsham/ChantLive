import type { Demonstration } from "@shared/schema";

export type InvitationLanguage = "en" | "es" | "fr" | "ar" | "fa";

export const invitationLanguageOptions: Array<{ code: InvitationLanguage; label: string }> = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "ar", label: "العربية" },
  { code: "fa", label: "فارسی" },
];

export const invitationLocales: Record<InvitationLanguage, string> = {
  en: "en",
  es: "es",
  fr: "fr",
  ar: "ar-u-nu-arab",
  fa: "fa-u-nu-arabext",
};

export const invitationDirections: Record<InvitationLanguage, "ltr" | "rtl"> = {
  en: "ltr",
  es: "ltr",
  fr: "ltr",
  ar: "rtl",
  fa: "rtl",
};

const INVITATION_LANGUAGE_STORAGE_KEY = "chantlive-invitation-language";

export function getStoredInvitationLanguage(): InvitationLanguage {
  if (typeof window === "undefined") return "en";
  try {
    const value = window.localStorage.getItem(INVITATION_LANGUAGE_STORAGE_KEY);
    return invitationLanguageOptions.some((option) => option.code === value)
      ? value as InvitationLanguage
      : "en";
  } catch {
    return "en";
  }
}

export function storeInvitationLanguage(language: InvitationLanguage) {
  try {
    window.localStorage.setItem(INVITATION_LANGUAGE_STORAGE_KEY, language);
  } catch {
    // The selected language still works for this page when storage is unavailable.
  }
}

export function formatInvitationSchedule(value: Date | string | null | undefined, language: InvitationLanguage) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(invitationLocales[language], {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

const invitationCopy: Record<InvitationLanguage, {
  join: (title: string) => string;
  eventCode: string;
  enterAt: string;
  when: string;
  where: string;
  meetingPoint: string;
  arrival: string;
  noAccount: string;
}> = {
  en: {
    join: (title) => `Join ${title} on ChantLive:`,
    eventCode: "Event code",
    enterAt: "enter it at",
    when: "When",
    where: "Where",
    meetingPoint: "Meeting point",
    arrival: "Arrival guidance",
    noAccount: "No participant account or QR scanner is required.",
  },
  es: {
    join: (title) => `Únete a ${title} en ChantLive:`,
    eventCode: "Código del evento",
    enterAt: "introdúcelo en",
    when: "Cuándo",
    where: "Dónde",
    meetingPoint: "Punto de encuentro",
    arrival: "Indicaciones de llegada",
    noAccount: "No se necesita una cuenta de participante ni un escáner de códigos QR.",
  },
  fr: {
    join: (title) => `Rejoignez ${title} sur ChantLive :`,
    eventCode: "Code de l’événement",
    enterAt: "saisissez-le sur",
    when: "Quand",
    where: "Où",
    meetingPoint: "Point de rendez-vous",
    arrival: "Consignes d’arrivée",
    noAccount: "Aucun compte participant ni lecteur de code QR n’est nécessaire.",
  },
  ar: {
    join: (title) => `انضم إلى ${title} على ChantLive:`,
    eventCode: "رمز الفعالية",
    enterAt: "أدخله في",
    when: "الوقت",
    where: "المكان",
    meetingPoint: "نقطة التجمع",
    arrival: "إرشادات الوصول",
    noAccount: "لا يلزم حساب مشارك أو ماسح رمز QR.",
  },
  fa: {
    join: (title) => `در ${title} در ChantLive شرکت کنید:`,
    eventCode: "کد رویداد",
    enterAt: "آن را در این نشانی وارد کنید",
    when: "زمان",
    where: "مکان",
    meetingPoint: "محل دیدار",
    arrival: "راهنمای ورود",
    noAccount: "به حساب شرکت‌کننده یا اسکنر کد QR نیازی نیست.",
  },
};

export function buildParticipantInvitation(
  demo: Pick<Demonstration, "title" | "publicId" | "scheduledAt" | "locationName" | "meetingPoint" | "arrivalNote">,
  origin: string,
  language: InvitationLanguage,
) {
  const participantUrl = `${origin}/d/${demo.publicId}`;
  const host = new URL(origin).host;
  const copy = invitationCopy[language];
  const schedule = formatInvitationSchedule(demo.scheduledAt, language);

  return [
    copy.join(demo.title),
    participantUrl,
    `${copy.eventCode}: ${demo.publicId} (${copy.enterAt} ${host})`,
    schedule ? `${copy.when}: ${schedule}` : null,
    demo.locationName ? `${copy.where}: ${demo.locationName}` : null,
    demo.meetingPoint ? `${copy.meetingPoint}: ${demo.meetingPoint}` : null,
    demo.arrivalNote ? `${copy.arrival}: ${demo.arrivalNote}` : null,
    "",
    copy.noAccount,
  ].filter((line) => line !== null).join("\n");
}
