export type OfflineChantData = {
  callText: string | null;
  responseText: string | null;
  nextCallText?: string | null;
  nextResponseText?: string | null;
  chantIndex: number | null;
  totalChants: number;
  demoTitle: string;
  demoStatus: string;
  currentPhase?: "leader" | "people";
  currentCycle?: number;
  cycleCount?: number;
  phaseStartedAt?: string;
  phaseDurationMs?: number;
  serverNow?: string;
  supportUrl?: string | null;
  supportLabel?: string | null;
  scheduledAt?: string | null;
  locationName?: string | null;
  meetingPoint?: string | null;
  arrivalNote?: string | null;
  eventDurationMinutes?: number;
};

export type OfflineEventSnapshot = {
  publicId: string;
  savedAt: string;
  chantData: OfflineChantData;
};

const keyFor = (publicId: string) => `chantlive-offline-event:${publicId}`;

const isOfflineSnapshot = (value: unknown, publicId: string): value is OfflineEventSnapshot => {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Partial<OfflineEventSnapshot>;
  const data = snapshot.chantData as Partial<OfflineChantData> | undefined;
  return snapshot.publicId === publicId &&
    typeof snapshot.savedAt === "string" &&
    !Number.isNaN(new Date(snapshot.savedAt).getTime()) &&
    Boolean(data) &&
    typeof data?.demoTitle === "string" &&
    typeof data?.demoStatus === "string" &&
    typeof data?.totalChants === "number";
};

export function loadOfflineEvent(publicId: string): OfflineEventSnapshot | null {
  try {
    const stored = localStorage.getItem(keyFor(publicId));
    if (!stored) return null;
    const parsed: unknown = JSON.parse(stored);
    if (!isOfflineSnapshot(parsed, publicId)) {
      localStorage.removeItem(keyFor(publicId));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveOfflineEvent(publicId: string, chantData: OfflineChantData): OfflineEventSnapshot | null {
  const snapshot: OfflineEventSnapshot = {
    publicId,
    savedAt: new Date().toISOString(),
    chantData,
  };
  try {
    localStorage.setItem(keyFor(publicId), JSON.stringify(snapshot));
    return snapshot;
  } catch {
    return null;
  }
}

export function updateOfflineEventIfPrepared(publicId: string, chantData: OfflineChantData): OfflineEventSnapshot | null {
  return loadOfflineEvent(publicId) ? saveOfflineEvent(publicId, chantData) : null;
}

export function forgetOfflineEvent(publicId: string): boolean {
  try {
    const existed = localStorage.getItem(keyFor(publicId)) !== null;
    localStorage.removeItem(keyFor(publicId));
    return existed;
  } catch {
    return false;
  }
}
