const PENDING_ACTIVATION_KEY = "chantlive:pending-admin-activation";

export const ACTIVATION_LINK_LIFETIME_MS = 24 * 60 * 60 * 1000;
export const ACTIVATION_RESEND_COOLDOWN_MS = 60 * 1000;

export type PendingActivation = {
  email: string;
  sentAt: number | null;
};

function isPendingActivation(value: unknown): value is PendingActivation {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PendingActivation>;
  return typeof candidate.email === "string"
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate.email)
    && (candidate.sentAt === null || (
      typeof candidate.sentAt === "number"
      && Number.isFinite(candidate.sentAt)
      && candidate.sentAt > 0
    ));
}

export function readPendingActivation(): PendingActivation | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(PENDING_ACTIVATION_KEY) ?? "null");
    return isPendingActivation(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function rememberPendingActivation(email: string, sentAt: number | null = Date.now()): PendingActivation {
  const pending = { email: email.trim().toLowerCase(), sentAt };
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem(PENDING_ACTIVATION_KEY, JSON.stringify(pending));
    } catch {
      // The activation flow still works when browser storage is unavailable.
    }
  }
  return pending;
}

export function clearPendingActivation() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(PENDING_ACTIVATION_KEY);
  } catch {
    // Nothing else is required when browser storage is unavailable.
  }
}
