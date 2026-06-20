import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { getSocket } from "@/lib/socket";
import { Eye, Type, Users, Megaphone, RefreshCw } from "lucide-react";

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

const clampProgress = (value: number) => Math.min(100, Math.max(0, value));
const getFallbackPhaseDuration = (phase: "leader" | "people") => phase === "leader" ? 4000 : 3000;

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
  const localPhaseStartRef = useRef(Date.now());

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
      let sessionId = localStorage.getItem("chant_session_id");
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        localStorage.setItem("chant_session_id", sessionId);
      }
      socket.emit("join_demo", { publicId, sessionId });
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on("chant_update", (data: ChantData) => {
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

    if (!socket.connected) {
      socket.connect();
    } else {
      let sessionId = localStorage.getItem("chant_session_id");
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        localStorage.setItem("chant_session_id", sessionId);
      }
      socket.emit("join_demo", { publicId, sessionId });
    }

    return () => {
      socket.emit("leave_demo", { publicId });
      socket.off("chant_update");
      socket.off("viewer_count");
      socket.off("demo_ended");
      socket.off("demo_error");
      socket.off("connect");
      socket.off("disconnect");
    };
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
  const retryConnection = () => {
    setError(null);
    window.location.reload();
  };

  useEffect(() => {
    localStorage.setItem("chant_large_text", String(largeText));
  }, [largeText]);

  useEffect(() => {
    localStorage.setItem("chant_high_contrast", String(highContrast));
  }, [highContrast]);

  useEffect(() => {
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
    chantData?.chantIndex,
    chantData?.currentCycle,
    chantData?.phaseStartedAt,
    chantData?.phaseDurationMs,
    chantData?.serverNow,
  ]);

  const renderPhaseProgress = (phase: "leader" | "people") => {
    if (activePhase !== phase || !chantData) {
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
        <div className="text-center">
          <Megaphone className="w-16 h-16 text-neutral-600 mx-auto mb-4" />
          <p className="text-neutral-300 text-2xl font-semibold mb-2" data-testid="text-ended">
            This demonstration has ended
          </p>
          <p className="text-neutral-500 text-sm">{chantData.demoTitle}</p>
          <p className="text-neutral-500 text-sm mt-4 max-w-xs mx-auto" data-testid="text-ended-next-step">
            Thanks for joining. You can close this page or ask an organizer for the next participant link.
          </p>
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
      <div className="flex-1 flex items-center justify-center p-6">
        <div 
          className={`text-center transition-all duration-500 transform ${
            fadeIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
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
              {(chantData.nextCallText || chantData.nextResponseText) && (
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

      <footer className="px-4 py-3 flex flex-wrap items-center justify-center gap-3 border-t border-neutral-800">
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
