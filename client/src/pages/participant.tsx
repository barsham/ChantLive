import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { getSocket } from "@/lib/socket";
import { Eye, HelpCircle, ShieldCheck, Type, Users, Megaphone, RefreshCw, WifiOff } from "lucide-react";

type ChantData = {
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
};
type OrganizerAnnouncement = {
  id: string;
  message: string;
  targetRole: "all" | CheckInRole;
  createdAt: string;
};
type AudienceQuestion = {
  id: string;
  text: string;
  status: "open" | "answered" | "dismissed";
  votes: number;
  createdAt: string;
  participantLabel: string;
};
type CheckInRole = "participant" | "marshal" | "speaker" | "accessibility";
type ParticipantEngagement = {
  points: number;
  badges: string[];
  participantLabel: string;
  updatedAt: string;
};

const clampProgress = (value: number) => Math.min(100, Math.max(0, value));
const getFallbackPhaseDuration = (phase: "leader" | "people") => phase === "leader" ? 4000 : 3000;
const getAnnouncementAudienceLabel = (targetRole: OrganizerAnnouncement["targetRole"]) => {
  const labels: Record<OrganizerAnnouncement["targetRole"], string> = {
    all: "Organizer update for everyone",
    participant: "Organizer update for participants",
    marshal: "Organizer update for marshals",
    speaker: "Organizer update for speakers",
    accessibility: "Organizer update for accessibility helpers",
  };

  return labels[targetRole];
};

const getChantAnnouncement = (chantData: ChantData | null) => {
  if (!chantData || chantData.demoStatus !== "live") {
    return "";
  }

  const phaseLabel = chantData.currentPhase === "people" ? "Everyone" : "Leader";
  const activeText = chantData.currentPhase === "people"
    ? chantData.responseText
    : chantData.callText;
  const chantNumber = chantData.chantIndex !== null ? chantData.chantIndex + 1 : null;
  const cycle = chantData.currentCycle ?? 1;
  const totalCycles = chantData.cycleCount ?? 1;
  const chantPosition = chantNumber
    ? `Chant ${chantNumber} of ${chantData.totalChants}. `
    : "";

  return `${chantPosition}${phaseLabel}, cycle ${cycle} of ${totalCycles}. ${activeText ?? "Waiting for chant text."}`;
};

export default function Participant() {
  const { publicId } = useParams<{ publicId: string }>();
  const [chantData, setChantData] = useState<ChantData | null>(null);
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
  const [showHelp, setShowHelp] = useState(false);
  const [assistanceSent, setAssistanceSent] = useState<string | null>(null);
  const [assistanceError, setAssistanceError] = useState<string | null>(null);
  const [pulseSent, setPulseSent] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<OrganizerAnnouncement | null>(null);
  const [audienceQuestions, setAudienceQuestions] = useState<AudienceQuestion[]>([]);
  const [questionText, setQuestionText] = useState("");
  const [questionStatus, setQuestionStatus] = useState<string | null>(null);
  const [checkInName, setCheckInName] = useState(() => localStorage.getItem("chant_checkin_name") ?? "");
  const [checkedInRole, setCheckedInRole] = useState<CheckInRole | null>(() => localStorage.getItem("chant_checkin_role") as CheckInRole | null);
  const [checkInStatus, setCheckInStatus] = useState<string | null>(null);
  const [feedbackRatings, setFeedbackRatings] = useState({ clarity: 4, safety: 4, accessibility: 4 });
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState<string | null>(null);
  const [engagement, setEngagement] = useState<ParticipantEngagement | null>(null);
  const localPhaseStartRef = useRef(Date.now());
  const lowBandwidthRef = useRef(lowBandwidth);

  const getSessionId = () => {
    let sessionId = localStorage.getItem("chant_session_id");
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      localStorage.setItem("chant_session_id", sessionId);
    }
    return sessionId;
  };

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
    const socket = socketRef.current;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("join_demo", { publicId, sessionId: getSessionId() });
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on("chant_update", (data: ChantData) => {
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
      setChantData((prev) =>
        prev ? { ...prev, demoStatus: "ended", callText: null, responseText: null } : null
      );
    });

    socket.on("demo_error", (msg: string) => {
      setError(msg);
    });

    socket.on("organizer_announcement", (data: OrganizerAnnouncement) => {
      if (data.targetRole === "all" || data.targetRole === checkedInRole) {
        setAnnouncement(data);
      }
    });

    socket.on("question_update", (questions: AudienceQuestion[]) => {
      setAudienceQuestions(questions);
    });

    socket.on("engagement_update", () => {
      fetch(`/api/public/demos/${publicId}/engagement/${getSessionId()}`)
        .then((response) => response.ok ? response.json() : null)
        .then((data: ParticipantEngagement | null) => setEngagement(data))
        .catch(() => {});
    });

    if (!socket.connected) {
      socket.connect();
    } else {
      socket.emit("join_demo", { publicId, sessionId: getSessionId() });
    }

    return () => {
      socket.emit("leave_demo", { publicId });
      socket.off("chant_update");
      socket.off("viewer_count");
      socket.off("demo_ended");
      socket.off("demo_error");
      socket.off("organizer_announcement");
      socket.off("question_update");
      socket.off("engagement_update");
      socket.off("connect");
      socket.off("disconnect");
    };
  }, [publicId, checkedInRole]);

  useEffect(() => {
    fetch(`/api/public/demos/${publicId}/questions`)
      .then((response) => response.ok ? response.json() : [])
      .then((questions: AudienceQuestion[]) => setAudienceQuestions(questions))
      .catch(() => setAudienceQuestions([]));

    fetch(`/api/public/demos/${publicId}/engagement/${getSessionId()}`)
      .then((response) => response.ok ? response.json() : null)
      .then((data: ParticipantEngagement | null) => setEngagement(data))
      .catch(() => setEngagement(null));
  }, [publicId]);

  const hasChantContent = chantData?.callText || chantData?.responseText;
  const activePhase = chantData?.currentPhase ?? "leader";
  const phaseGuidance = activePhase === "people"
    ? {
      label: "Everyone respond now",
      detail: "Read the blue response together.",
      className: "border-sky-400/40 bg-sky-400/10 text-sky-200",
    }
    : {
      label: "Leader is speaking now",
      detail: "Listen for the orange call.",
      className: "border-orange-500/40 bg-orange-500/10 text-orange-200",
    };
  const chantAnnouncement = getChantAnnouncement(chantData);
  const callColor = highContrast ? "#fde047" : "#f97316";
  const responseColor = highContrast ? "#ffffff" : "#38bdf8";
  const chantFontSize = largeText
    ? "clamp(2.35rem, 10vw, 6.5rem)"
    : "clamp(1.75rem, 7vw, 4.5rem)";
  const participantDisplayMode = lowBandwidth
    ? "Low-bandwidth mode reduces animation and hides next-up previews."
    : "Full display mode shows motion, timing, and next-up previews.";
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
      setAssistanceError("Could not notify the organizer. Please ask someone nearby for help.");
    }
  };
  const sendPulse = async (type: "too_fast" | "too_slow" | "cant_hear" | "all_good") => {
    try {
      const response = await fetch(`/api/public/demos/${publicId}/pulse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, sessionId: getSessionId() }),
      });

      if (!response.ok) return;
      setPulseSent(type);
      setTimeout(() => setPulseSent(null), 2500);
    } catch {
      // Crowd pulse is optional feedback; avoid interrupting the live chant view on failure.
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
      setQuestionStatus("Question sent to the organizer.");
      setTimeout(() => setQuestionStatus(null), 3000);
    } catch {
      setQuestionStatus("Could not send question. Please ask an organizer directly.");
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
      setCheckInStatus(`Checked in as ${role === "accessibility" ? "accessibility helper" : role}.`);
      setTimeout(() => setCheckInStatus(null), 3000);
    } catch {
      setCheckInStatus("Could not check in. Please tell an organizer you are here.");
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
      setFeedbackStatus("Feedback sent. Thank you.");
      setTimeout(() => setFeedbackStatus(null), 3500);
    } catch {
      setFeedbackStatus("Could not send feedback. Please tell an organizer directly.");
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
        aria-label={`${phase === "leader" ? "Leader" : "Everyone"} chant progress`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(phaseProgress)}
        data-testid={`progress-${phase}`}
      >
        <div
          className={`h-full rounded-full ${barColor} shadow-[0_0_20px_currentColor]`}
          style={{
            transform: `scaleX(${phaseProgress / 100})`,
            transformOrigin: "left center",
          }}
        />
      </div>
    );
  };

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <Megaphone className="w-16 h-16 text-neutral-500 mx-auto mb-4" />
          <p className="text-white text-xl mb-2" data-testid="text-error">{error}</p>
          <p className="text-neutral-500 text-sm mb-5">Check the participant link or try reconnecting.</p>
          <button
            type="button"
            onClick={retryConnection}
            className="inline-flex items-center gap-2 rounded-md border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-200 hover:bg-neutral-900"
            data-testid="button-retry-participant"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!chantData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-400 text-sm mb-2">{isOffline ? "Waiting for network..." : "Connecting..."}</p>
          <p className="text-neutral-600 text-xs mb-5 max-w-xs">
            {isOffline
              ? "You appear to be offline. Reconnect to receive live chants."
              : "If this takes too long, retry the connection or ask an organiser to confirm the QR/link."}
          </p>
          <button
            type="button"
            onClick={retryConnection}
            className="inline-flex items-center gap-2 rounded-md border border-neutral-800 px-4 py-2 text-xs font-medium text-neutral-300 hover:bg-neutral-900"
            data-testid="button-retry-loading"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry connection
          </button>
        </div>
      </div>
    );
  }

  if (chantData.demoStatus === "ended") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="w-full max-w-2xl text-center">
          <Megaphone className="w-16 h-16 text-neutral-600 mx-auto mb-4" />
          <p className="text-neutral-300 text-2xl font-semibold mb-2" data-testid="text-ended">
            This demonstration has ended
          </p>
          <p className="text-neutral-500 text-sm">{chantData.demoTitle}</p>
          <p className="text-neutral-500 text-sm mt-4 max-w-xs mx-auto" data-testid="text-ended-next-step">
            Thanks for joining. You can close this page or ask an organizer for the next participant link.
          </p>
          <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-left" data-testid="panel-ended-feedback">
            <p className="font-semibold text-white">Share quick feedback</p>
            <p className="mt-1 text-xs text-neutral-400">Help organisers improve the next chant or demonstration.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                ["clarity", "Clear to follow"],
                ["safety", "Felt safe"],
                ["accessibility", "Accessible"],
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
              placeholder="Optional note for the organizer..."
              data-testid="input-ended-feedback-comment"
            />
            <button
              type="button"
              onClick={submitFeedback}
              className="mt-3 rounded-md border border-emerald-400/50 px-4 py-2 text-sm font-medium text-emerald-100 hover:bg-emerald-950/40"
              data-testid="button-submit-ended-feedback"
            >
              Send feedback
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
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <Megaphone className="w-16 h-16 text-neutral-600 mx-auto mb-6" />
          <p className="text-neutral-300 text-2xl font-semibold mb-2" data-testid="text-waiting">
            Waiting to begin...
          </p>
          <p className="text-neutral-500">{chantData.demoTitle}</p>
          <p className="text-neutral-500 text-sm mt-4 max-w-xs mx-auto">
            Keep this page open. Chants will appear automatically when an organiser starts the demonstration.
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
            {isOffline ? "Offline - reconnect to receive chants" : "Connected and waiting for the organizer"}
          </p>
          <div className="mt-5 rounded-lg border border-neutral-800 bg-neutral-950/70 p-4 text-left text-sm text-neutral-400" data-testid="text-waiting-tips">
            <p className="font-medium text-neutral-300 mb-2">While you wait</p>
            <ul className="space-y-1">
              <li>Keep this page open.</li>
              <li>Stay near the organizer or speaker if you need audio cues.</li>
              <li>If the page stops updating, use refresh connection.</li>
            </ul>
          </div>
          {isOffline && (
            <p className="text-red-300 text-sm mt-4 max-w-xs mx-auto" role="status" data-testid="text-waiting-offline">
              You are offline. Reconnect before the demonstration starts so live chants can appear.
            </p>
          )}
          <button
            type="button"
            onClick={retryConnection}
            className="mt-5 inline-flex items-center gap-2 rounded-md border border-neutral-800 px-4 py-2 text-xs font-medium text-neutral-300 hover:bg-neutral-900"
            data-testid="button-retry-waiting"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col select-none" data-testid="participant-view">
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {chantAnnouncement}
      </div>
      {announcement && (
        <div className="mx-4 mt-4 rounded-2xl border border-amber-300/40 bg-amber-300/15 p-4 text-center text-amber-50" role="status" data-testid="banner-organizer-announcement">
          <p className="text-xs font-mono uppercase tracking-widest text-amber-100/80">
            {getAnnouncementAudienceLabel(announcement.targetRole)}
          </p>
          <p className="mt-1 text-lg font-semibold">{announcement.message}</p>
          <button
            type="button"
            onClick={() => setAnnouncement(null)}
            className="mt-2 text-xs font-medium text-amber-100 underline"
            data-testid="button-dismiss-announcement"
          >
            Dismiss
          </button>
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
              {chantData.chantIndex + 1} / {chantData.totalChants} - Cycle {chantData.currentCycle ?? 1}/{chantData.cycleCount ?? 1}
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
                  <p className="text-neutral-400 text-xs font-mono uppercase tracking-widest mb-2">Leader</p>
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
                  <p className="text-neutral-400 text-xs font-mono uppercase tracking-widest mb-2">Everyone</p>
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
                    Coming Up Next
                  </span>
                  <div className="space-y-4">
                    {chantData.nextCallText && (
                      <div>
                        <p className="text-neutral-500 text-[10px] font-mono uppercase tracking-wider mb-1">Leader</p>
                        <h2 className="font-semibold text-orange-500/70 text-base leading-snug break-words">
                          {chantData.nextCallText}
                        </h2>
                      </div>
                    )}
                    {chantData.nextResponseText && (
                      <div>
                        <p className="text-neutral-500 text-[10px] font-mono uppercase tracking-wider mb-1">Everyone</p>
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
              Waiting for next chant...
            </p>
          )}
        </div>
      </div>

      {showHelp && (
        <section
          className="mx-4 mb-3 rounded-2xl border border-neutral-700 bg-neutral-950 p-4 text-sm text-neutral-300 shadow-2xl"
          aria-label="Participant help and safety panel"
          data-testid="panel-participant-help"
        >
          <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-4">
            <div>
              <p className="mb-1 flex items-center gap-2 font-semibold text-white">
                <HelpCircle className="h-4 w-4" />
                If the page stops updating
              </p>
              <p className="text-neutral-400">Stay on this page. If the status says reconnecting for more than a few seconds, use refresh connection.</p>
              <button
                type="button"
                onClick={retryConnection}
                className="mt-3 inline-flex items-center gap-2 rounded-md border border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-200 hover:bg-neutral-900"
                data-testid="button-help-refresh-connection"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh connection
              </button>
            </div>
            <div>
              <p className="mb-1 flex items-center gap-2 font-semibold text-white">
                <Eye className="h-4 w-4" />
                If visibility is difficult
              </p>
              <p className="text-neutral-400">Turn on large text or high contrast below. Move closer to the organiser if you need audio cues.</p>
            </div>
            <div>
              <p className="mb-1 flex items-center gap-2 font-semibold text-white">
                <ShieldCheck className="h-4 w-4" />
                If plans change
              </p>
              <p className="text-neutral-400">Follow organiser instructions first. ChantLive shows chant timing, but local safety directions take priority.</p>
            </div>
            <div>
              <p className="mb-1 flex items-center gap-2 font-semibold text-white">
                <Users className="h-4 w-4" />
                Send the organizer a signal
              </p>
              <p className="text-neutral-400">Tell the organizer if the pace, sound, or access needs attention. Your phone does not show your name.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => sendPulse("too_fast")}
                  className="rounded-md border border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-200 hover:bg-neutral-900"
                  data-testid="button-pulse-too-fast"
                >
                  Too fast
                </button>
                <button
                  type="button"
                  onClick={() => sendPulse("too_slow")}
                  className="rounded-md border border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-200 hover:bg-neutral-900"
                  data-testid="button-pulse-too-slow"
                >
                  Too slow
                </button>
                <button
                  type="button"
                  onClick={() => sendPulse("cant_hear")}
                  className="rounded-md border border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-200 hover:bg-neutral-900"
                  data-testid="button-pulse-cant-hear"
                >
                  Can't hear
                </button>
                <button
                  type="button"
                  onClick={() => sendPulse("all_good")}
                  className="rounded-md border border-emerald-400/40 px-3 py-1.5 text-xs font-medium text-emerald-100 hover:bg-emerald-950/40"
                  data-testid="button-pulse-all-good"
                >
                  All good
                </button>
              </div>
              {pulseSent && (
                <p className="mt-2 text-xs text-emerald-300" role="status" data-testid="text-pulse-sent">
                  Signal sent to the organizer.
                </p>
              )}
            </div>
            <div>
              <p className="mb-1 flex items-center gap-2 font-semibold text-white">
                <Users className="h-4 w-4" />
                If you need support
              </p>
              <p className="text-neutral-400">Ask a marshal or accessibility helper for the plain link, a quieter place, repeated instructions, or help reading the chant.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => requestAssistance("accessibility", "Participant needs accessibility support.")}
                  className="rounded-md border border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-200 hover:bg-neutral-900"
                  data-testid="button-request-accessibility-help"
                >
                  Need accessibility help
                </button>
                <button
                  type="button"
                  onClick={() => requestAssistance("connection", "Participant needs connection help.")}
                  className="rounded-md border border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-200 hover:bg-neutral-900"
                  data-testid="button-request-connection-help"
                >
                  Need connection help
                </button>
                <button
                  type="button"
                  onClick={() => requestAssistance("safety", "Participant needs safety or marshal help.")}
                  className="rounded-md border border-red-500/40 px-3 py-1.5 text-xs font-medium text-red-100 hover:bg-red-950/40"
                  data-testid="button-request-safety-help"
                >
                  Need safety help
                </button>
              </div>
              {assistanceSent && (
                <p className="mt-2 text-xs text-emerald-300" role="status" data-testid="text-assistance-sent">
                  Organizer notified. Stay where you are if it is safe.
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
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 md:col-span-2" data-testid="card-participant-engagement">
              <p className="font-semibold text-emerald-50">Participation progress</p>
              <p className="mt-1 text-xs text-emerald-100/80">
                Earn points for useful event actions like checking in, sending pulse signals, asking questions, and giving feedback.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-emerald-300/40 px-3 py-1 text-sm font-semibold text-emerald-50" data-testid="text-engagement-points">
                  {engagement?.points ?? 0} points
                </span>
                {(engagement?.badges.length ?? 0) > 0 ? engagement?.badges.map((badge) => (
                  <span key={badge} className="rounded-full border border-emerald-300/30 bg-black/20 px-3 py-1 text-xs text-emerald-100">
                    {badge}
                  </span>
                )) : (
                  <span className="text-xs text-emerald-100/70">Check in or send a signal to earn your first badge.</span>
                )}
              </div>
            </div>
            <div className="rounded-xl border border-neutral-800 bg-black/30 p-4 md:col-span-2">
              <p className="font-semibold text-white">Check in with the organizer</p>
              <p className="mt-1 text-xs text-neutral-400">Let the organizer know you are here and what role you can help with. Name is optional.</p>
              <input
                value={checkInName}
                onChange={(event) => setCheckInName(event.target.value)}
                maxLength={60}
                className="mt-3 w-full rounded-lg border border-neutral-700 bg-neutral-950 p-3 text-sm text-neutral-100 outline-none focus:border-neutral-400"
                placeholder="Optional name or team label"
                data-testid="input-checkin-name"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  ["participant", "Participant"],
                  ["marshal", "Marshal"],
                  ["speaker", "Speaker"],
                  ["accessibility", "Accessibility helper"],
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
                    {checkedInRole === role ? "Checked in: " : ""}
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
              <p className="font-semibold text-white">Ask the organizer</p>
              <p className="mt-1 text-xs text-neutral-400">Send an anonymous question without interrupting the chant.</p>
              <textarea
                value={questionText}
                onChange={(event) => setQuestionText(event.target.value)}
                maxLength={220}
                rows={3}
                className="mt-3 w-full rounded-lg border border-neutral-700 bg-neutral-950 p-3 text-sm text-neutral-100 outline-none focus:border-neutral-400"
                placeholder="Type a short question for the organizer..."
                data-testid="input-audience-question"
              />
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-xs text-neutral-500">{questionText.length}/220</span>
                <button
                  type="button"
                  onClick={submitQuestion}
                  disabled={!questionText.trim()}
                  className="rounded-md border border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-200 hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-50"
                  data-testid="button-submit-audience-question"
                >
                  Send question
                </button>
              </div>
              {questionStatus && (
                <p className="mt-2 text-xs text-emerald-300" role="status" data-testid="text-question-status">
                  {questionStatus}
                </p>
              )}
            </div>
            <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
              <p className="font-semibold text-white">Questions people have raised</p>
              <div className="mt-3 max-h-52 space-y-2 overflow-y-auto pr-1">
                {audienceQuestions.length === 0 ? (
                  <p className="text-sm text-neutral-500" data-testid="text-no-audience-questions">No open questions yet.</p>
                ) : (
                  audienceQuestions.slice(0, 5).map((question) => (
                    <div key={question.id} className="rounded-lg border border-neutral-800 bg-neutral-950 p-3" data-testid={`card-audience-question-${question.id}`}>
                      <p className="text-sm text-neutral-200">{question.text}</p>
                      <button
                        type="button"
                        onClick={() => upvoteQuestion(question.id)}
                        className="mt-2 rounded-full border border-neutral-700 px-2.5 py-1 text-xs text-neutral-300 hover:bg-neutral-900"
                        data-testid={`button-upvote-question-${question.id}`}
                      >
                        Vote up ({question.votes})
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="rounded-xl border border-neutral-800 bg-black/30 p-4 md:col-span-2">
              <p className="font-semibold text-white">Rate the experience</p>
              <p className="mt-1 text-xs text-neutral-400">Send quick feedback the organiser can review after the event.</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {[
                  ["clarity", "Clear to follow"],
                  ["safety", "Felt safe"],
                  ["accessibility", "Accessible"],
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
                placeholder="Optional feedback note..."
                data-testid="input-live-feedback-comment"
              />
              <button
                type="button"
                onClick={submitFeedback}
                className="mt-3 rounded-md border border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-200 hover:bg-neutral-900"
                data-testid="button-submit-live-feedback"
              >
                Send feedback
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
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
            showHelp ? "border-emerald-300/80 bg-emerald-300/15 text-emerald-100" : "border-neutral-700 text-neutral-300"
          }`}
          aria-expanded={showHelp}
          data-testid="button-toggle-participant-help"
        >
          <HelpCircle className="h-3.5 w-3.5" />
          {showHelp ? "Help open" : "Help"}
        </button>
        <button
          type="button"
          onClick={() => setLowBandwidth((value) => !value)}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
            lowBandwidth ? "border-sky-300/80 bg-sky-300/15 text-sky-100" : "border-neutral-700 text-neutral-300"
          }`}
          aria-pressed={lowBandwidth}
          title={participantDisplayMode}
          data-testid="button-toggle-low-bandwidth"
        >
          <WifiOff className="h-3.5 w-3.5" />
          {lowBandwidth ? "Low bandwidth on" : "Low bandwidth"}
        </button>
        <button
          type="button"
          onClick={() => setLargeText((value) => !value)}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
            largeText ? "border-white/60 bg-white/15 text-white" : "border-neutral-700 text-neutral-300"
          }`}
          aria-pressed={largeText}
          data-testid="button-toggle-large-text"
        >
          <Type className="h-3.5 w-3.5" />
          {largeText ? "Large text on" : "Large text"}
        </button>
        <button
          type="button"
          onClick={() => setHighContrast((value) => !value)}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
            highContrast ? "border-yellow-300/80 bg-yellow-300/15 text-yellow-100" : "border-neutral-700 text-neutral-300"
          }`}
          aria-pressed={highContrast}
          data-testid="button-toggle-high-contrast"
        >
          <Eye className="h-3.5 w-3.5" />
          {highContrast ? "High contrast on" : "High contrast"}
        </button>
        <span className="inline-flex items-center gap-2">
          <Users className="w-4 h-4 text-neutral-500" />
          <span className="text-neutral-400 text-sm font-mono" data-testid="text-viewer-count">
            Viewing now: {viewerCount}
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
            ? "Offline - reconnect to receive updates"
            : connected
              ? "Connected to live updates"
              : "Reconnecting - updates resume automatically"}
        </span>
      </footer>
    </div>
  );
}
