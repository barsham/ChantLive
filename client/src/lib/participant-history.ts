const RECENT_PARTICIPANT_EVENT_KEY = "chantlive-recent-participant-event";

export type RecentParticipantEvent = {
  publicId: string;
  title: string;
  visitedAt: string;
};

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
      typeof event.visitedAt !== "string"
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

export function forgetRecentParticipantEvent() {
  try {
    localStorage.removeItem(RECENT_PARTICIPANT_EVENT_KEY);
  } catch {
    // Nothing else is required when browser storage is unavailable.
  }
}
