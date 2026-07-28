const RECENT_PARTICIPANT_EVENT_KEY = "chantlive-recent-participant-event";

export type RecentParticipantEvent = {
  publicId: string;
  title: string;
  visitedAt: string;
};

export function describeParticipantEventRecency(visitedAt: string, now = Date.now()) {
  const visitedTime = new Date(visitedAt).getTime();
  if (!Number.isFinite(visitedTime)) return null;

  const elapsedDays = Math.max(0, Math.floor((now - visitedTime) / 86_400_000));
  if (elapsedDays === 0) return { label: "Joined today", isStale: false };
  if (elapsedDays === 1) return { label: "Joined yesterday", isStale: false };
  if (elapsedDays < 7) return { label: `Joined ${elapsedDays} days ago`, isStale: false };
  if (elapsedDays < 30) {
    const weeks = Math.floor(elapsedDays / 7);
    return { label: `Joined ${weeks} week${weeks === 1 ? "" : "s"} ago`, isStale: true };
  }

  const months = Math.floor(elapsedDays / 30);
  return { label: `Joined ${months} month${months === 1 ? "" : "s"} ago`, isStale: true };
}

export function readRecentParticipantEvent(): RecentParticipantEvent | null {
  try {
    const stored = localStorage.getItem(RECENT_PARTICIPANT_EVENT_KEY);
    if (!stored) return null;

    const event = JSON.parse(stored) as Partial<RecentParticipantEvent>;
    if (
      typeof event.publicId !== "string" ||
      !/^[A-Za-z0-9_-]{6,12}$/.test(event.publicId) ||
      typeof event.title !== "string" ||
      !event.title.trim() ||
      typeof event.visitedAt !== "string" ||
      !describeParticipantEventRecency(event.visitedAt)
    ) {
      localStorage.removeItem(RECENT_PARTICIPANT_EVENT_KEY);
      return null;
    }

    return {
      publicId: event.publicId,
      title: event.title.trim().slice(0, 120),
      visitedAt: event.visitedAt,
    };
  } catch {
    return null;
  }
}

export function rememberParticipantEvent(publicId: string, title: string) {
  if (!/^[A-Za-z0-9_-]{6,12}$/.test(publicId) || !title.trim()) return;

  try {
    localStorage.setItem(
      RECENT_PARTICIPANT_EVENT_KEY,
      JSON.stringify({
        publicId,
        title: title.trim().slice(0, 120),
        visitedAt: new Date().toISOString(),
      } satisfies RecentParticipantEvent),
    );
  } catch {
    // The participant experience remains usable when browser storage is unavailable.
  }
}

export function forgetRecentParticipantEvent(publicId?: string) {
  try {
    if (publicId) {
      const recentEvent = readRecentParticipantEvent();
      if (!recentEvent || recentEvent.publicId !== publicId) return false;
    }
    localStorage.removeItem(RECENT_PARTICIPANT_EVENT_KEY);
    return true;
  } catch {
    // Nothing else is required when browser storage is unavailable.
    return false;
  }
}
