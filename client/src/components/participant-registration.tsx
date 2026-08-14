import { useCallback, useEffect, useState } from "react";
import { CalendarCheck2, Clock3, RefreshCw, ShieldCheck, TicketCheck, Trash2, Users } from "lucide-react";

type ParticipantLanguage = "en" | "es" | "fr" | "ar" | "fa";

type RegistrationReceipt = {
  status: "confirmed" | "waitlisted";
  registeredAt: string;
  updatedAt: string;
  waitlistPosition: number | null;
};

type RegistrationState = {
  enabled: boolean;
  capacity: number | null;
  closesAt: string | null;
  manuallyClosed: boolean;
  closed: boolean;
  confirmed: number;
  waitlisted: number;
  available: number | null;
  receipt: RegistrationReceipt | null;
  privacy: string;
};

const copy: Record<ParticipantLanguage, {
  title: string; body: string; confirmed: string; waitlisted: string; position: string; reserved: string;
  capacity: string; placesLeft: string; closes: string; closed: string; reserve: string; cancel: string;
  cancelCheck: string; keep: string; cancelDone: string; retry: string; error: string; privacy: string; updating: string;
}> = {
  en: { title: "Anonymous event RSVP", body: "Reserve one place on this device. No account, name, email, or phone number is requested.", confirmed: "Place confirmed", waitlisted: "On the waitlist", position: "Waitlist position", reserved: "Reserved", capacity: "Capacity", placesLeft: "Places available", closes: "Registration closes", closed: "Registration is closed", reserve: "Reserve my place", cancel: "Cancel my reservation", cancelCheck: "Cancel and give this place to the next person?", keep: "Keep my place", cancelDone: "Reservation cancelled.", retry: "Try again", error: "Registration is temporarily unavailable. Your existing place is not changed.", privacy: "The server stores only an event-scoped anonymous hash; this device keeps the private key. Organisers see totals, never a participant list.", updating: "Updating…" },
  es: { title: "Reserva anónima", body: "Reserva una plaza en este dispositivo. No se pide cuenta, nombre, correo ni teléfono.", confirmed: "Plaza confirmada", waitlisted: "En lista de espera", position: "Puesto en la lista", reserved: "Reservado", capacity: "Capacidad", placesLeft: "Plazas disponibles", closes: "Cierre de reservas", closed: "Las reservas están cerradas", reserve: "Reservar mi plaza", cancel: "Cancelar mi reserva", cancelCheck: "¿Cancelar y ceder la plaza a la siguiente persona?", keep: "Conservar mi plaza", cancelDone: "Reserva cancelada.", retry: "Reintentar", error: "Las reservas no están disponibles temporalmente. Tu plaza actual no cambia.", privacy: "El servidor guarda solo un identificador anónimo propio del evento; este dispositivo conserva la clave privada. Los organizadores ven totales, nunca una lista.", updating: "Actualizando…" },
  fr: { title: "Réservation anonyme", body: "Réservez une place sur cet appareil. Aucun compte, nom, e-mail ou téléphone n’est demandé.", confirmed: "Place confirmée", waitlisted: "Sur liste d’attente", position: "Position d’attente", reserved: "Réservé", capacity: "Capacité", placesLeft: "Places disponibles", closes: "Clôture des réservations", closed: "Les réservations sont closes", reserve: "Réserver ma place", cancel: "Annuler ma réservation", cancelCheck: "Annuler et donner cette place à la personne suivante ?", keep: "Garder ma place", cancelDone: "Réservation annulée.", retry: "Réessayer", error: "Les réservations sont temporairement indisponibles. Votre place actuelle ne change pas.", privacy: "Le serveur ne conserve qu’un identifiant anonyme propre à l’événement ; cet appareil garde la clé privée. Les organisateurs voient des totaux, jamais une liste.", updating: "Mise à jour…" },
  ar: { title: "حجز مجهول للفعالية", body: "احجز مكاناً واحداً على هذا الجهاز. لا نطلب حساباً أو اسماً أو بريداً أو هاتفاً.", confirmed: "المكان مؤكد", waitlisted: "على قائمة الانتظار", position: "الترتيب في الانتظار", reserved: "تم الحجز", capacity: "السعة", placesLeft: "الأماكن المتاحة", closes: "يغلق الحجز", closed: "الحجز مغلق", reserve: "احجز مكاني", cancel: "إلغاء حجزي", cancelCheck: "إلغاء الحجز ومنح المكان للشخص التالي؟", keep: "الاحتفاظ بمكاني", cancelDone: "تم إلغاء الحجز.", retry: "المحاولة مجدداً", error: "الحجز غير متاح مؤقتاً. لن يتغير مكانك الحالي.", privacy: "يحفظ الخادم معرّفاً مجهولاً خاصاً بالفعالية فقط، ويحتفظ هذا الجهاز بالمفتاح الخاص. يرى المنظمون الأعداد فقط، وليس قائمة المشاركين.", updating: "جارٍ التحديث…" },
  fa: { title: "رزرو ناشناس رویداد", body: "یک جایگاه را روی این دستگاه رزرو کنید. حساب، نام، ایمیل یا تلفن خواسته نمی‌شود.", confirmed: "جایگاه تأیید شد", waitlisted: "در فهرست انتظار", position: "رتبه در انتظار", reserved: "رزرو شده", capacity: "ظرفیت", placesLeft: "جایگاه موجود", closes: "پایان رزرو", closed: "رزرو بسته است", reserve: "رزرو جایگاه من", cancel: "لغو رزرو من", cancelCheck: "لغو شود و جایگاه به نفر بعد برسد؟", keep: "حفظ جایگاه", cancelDone: "رزرو لغو شد.", retry: "تلاش دوباره", error: "رزرو موقتاً در دسترس نیست. جایگاه فعلی شما تغییر نمی‌کند.", privacy: "سرور فقط یک شناسه ناشناس مخصوص این رویداد ذخیره می‌کند و این دستگاه کلید خصوصی را نگه می‌دارد. برگزارکنندگان فقط آمار را می‌بینند، نه فهرست افراد.", updating: "در حال به‌روزرسانی…" },
};

function formatDate(value: string, language: ParticipantLanguage) {
  return new Intl.DateTimeFormat(language, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function ParticipantRegistration({ publicId, sessionId, language, className = "" }: {
  publicId: string;
  sessionId: string;
  language: ParticipantLanguage;
  className?: string;
}) {
  const [data, setData] = useState<RegistrationState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const t = copy[language];

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/public/demos/${publicId}/registration?sessionId=${encodeURIComponent(sessionId)}`, { cache: "no-store" });
      if (!response.ok) throw new Error("registration unavailable");
      setData(await response.json());
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [publicId, sessionId]);

  useEffect(() => {
    load();
    const interval = window.setInterval(load, data?.receipt?.status === "waitlisted" ? 5_000 : 15_000);
    window.addEventListener("online", load);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("online", load);
    };
  }, [data?.receipt?.status, load]);

  const changeReservation = async (method: "POST" | "DELETE") => {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/public/demos/${publicId}/registration`, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      if (!response.ok) throw new Error("registration unavailable");
      setData(await response.json());
      setError(false);
      setConfirmCancel(false);
      if (method === "DELETE") setMessage(t.cancelDone);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  if (loading && !data) return null;
  if (!data || (!data.enabled && !data.receipt)) return null;
  const receipt = data.receipt;
  const confirmed = receipt?.status === "confirmed";

  return (
    <section className={`rounded-2xl border border-cyan-300/35 bg-cyan-300/10 p-4 text-start text-cyan-50 ${className}`} aria-labelledby="participant-registration-title" data-testid="card-participant-registration">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-xl">
          <h2 id="participant-registration-title" className="flex items-center gap-2 font-semibold"><CalendarCheck2 className="h-5 w-5" aria-hidden="true" /> {t.title}</h2>
          <p className="mt-1 text-sm text-cyan-50/85">{t.body}</p>
        </div>
        {receipt && (
          <span className={`rounded-full border px-3 py-1 text-xs font-bold ${confirmed ? "border-emerald-300/50 bg-emerald-300/10 text-emerald-100" : "border-amber-300/50 bg-amber-300/10 text-amber-100"}`} role="status" data-testid="text-registration-status">
            {confirmed ? t.confirmed : t.waitlisted}
          </span>
        )}
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <div className="rounded-lg border border-cyan-100/20 bg-black/20 p-3"><dt className="flex items-center gap-2 text-xs text-cyan-100/70"><Users className="h-4 w-4" aria-hidden="true" /> {t.capacity}</dt><dd className="mt-1 font-semibold">{data.capacity ?? "—"}</dd></div>
        <div className="rounded-lg border border-cyan-100/20 bg-black/20 p-3"><dt className="flex items-center gap-2 text-xs text-cyan-100/70"><TicketCheck className="h-4 w-4" aria-hidden="true" /> {t.placesLeft}</dt><dd className="mt-1 font-semibold">{data.available ?? "—"}</dd></div>
        <div className="rounded-lg border border-cyan-100/20 bg-black/20 p-3"><dt className="flex items-center gap-2 text-xs text-cyan-100/70"><Clock3 className="h-4 w-4" aria-hidden="true" /> {t.closes}</dt><dd className="mt-1 font-semibold">{data.closesAt ? formatDate(data.closesAt, language) : "—"}</dd></div>
      </dl>

      {receipt && (
        <div className="mt-4 rounded-lg border border-cyan-100/20 bg-black/25 p-3 text-sm" data-testid="registration-receipt">
          <p className="font-semibold">{confirmed ? t.confirmed : `${t.position}: ${receipt.waitlistPosition ?? "—"}`}</p>
          <p className="mt-1 text-xs text-cyan-100/70">{t.reserved}: {formatDate(receipt.registeredAt, language)}</p>
        </div>
      )}

      {!receipt && data.closed && <p className="mt-4 rounded-lg border border-amber-300/30 bg-amber-300/10 p-3 text-sm text-amber-100" role="status">{t.closed}</p>}
      <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-cyan-100/75"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {t.privacy}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {!receipt && !data.closed && <button type="button" onClick={() => changeReservation("POST")} disabled={busy} className="min-h-11 rounded-md bg-cyan-200 px-4 py-2 text-sm font-bold text-cyan-950 disabled:opacity-60" data-testid="button-reserve-event-place">{busy ? t.updating : t.reserve}</button>}
        {receipt && !confirmCancel && <button type="button" onClick={() => setConfirmCancel(true)} disabled={busy} className="min-h-11 rounded-md border border-cyan-100/30 px-4 py-2 text-sm font-semibold text-cyan-50 disabled:opacity-60" data-testid="button-cancel-event-registration"><Trash2 className="mr-2 inline h-4 w-4" aria-hidden="true" />{t.cancel}</button>}
        {receipt && confirmCancel && <>
          <span className="w-full text-sm text-amber-100" role="alert">{t.cancelCheck}</span>
          <button type="button" onClick={() => changeReservation("DELETE")} disabled={busy} className="min-h-11 rounded-md border border-red-300/50 bg-red-300/10 px-4 py-2 text-sm font-bold text-red-100 disabled:opacity-60" data-testid="button-confirm-cancel-registration">{busy ? t.updating : t.cancel}</button>
          <button type="button" onClick={() => setConfirmCancel(false)} className="min-h-11 rounded-md border border-cyan-100/30 px-4 py-2 text-sm font-semibold" data-testid="button-keep-registration">{t.keep}</button>
        </>}
        {error && <button type="button" onClick={load} className="min-h-11 rounded-md border border-amber-300/40 px-3 py-2 text-xs font-semibold text-amber-100" data-testid="button-retry-registration"><RefreshCw className="mr-2 inline h-4 w-4" aria-hidden="true" />{t.retry}</button>}
      </div>
      {message && <p className="mt-3 text-sm text-emerald-200" role="status">{message}</p>}
      {error && <p className="mt-3 text-sm text-amber-100" role="alert" data-testid="text-registration-error">{t.error}</p>}
    </section>
  );
}
