import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { getSocket } from "@/lib/socket";
import { Users, Megaphone } from "lucide-react";

type ChantData = {
  chantText: string | null;
  chantIndex: number | null;
  totalChants: number;
  demoTitle: string;
  demoStatus: string;
};

export default function Participant() {
  const { publicId } = useParams<{ publicId: string }>();
  const [chantData, setChantData] = useState<ChantData | null>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef(getSocket());
  const [fadeIn, setFadeIn] = useState(false);

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
        setChantData(data);
        setFadeIn(true);
      }, 50);
    });

    socket.on("viewer_count", (count: number) => {
      setViewerCount(count);
    });

    socket.on("demo_ended", () => {
      setChantData((prev) =>
        prev ? { ...prev, demoStatus: "ended", chantText: null } : null
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

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <Megaphone className="w-16 h-16 text-neutral-500 mx-auto mb-4" />
          <p className="text-white text-xl" data-testid="text-error">{error}</p>
        </div>
      </div>
    );
  }

  if (!chantData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-400 text-sm">Connecting...</p>
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
          <p className="text-neutral-600 text-sm mt-4">The demonstration will start shortly.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col select-none" data-testid="participant-view">
      <div className="flex-1 flex items-center justify-center p-6">
        <div className={`text-center transition-opacity duration-300 ${fadeIn ? "opacity-100" : "opacity-0"}`}>
          {chantData.chantIndex !== null && (
            <p className="text-neutral-500 text-sm font-mono mb-4 tracking-wider" data-testid="text-chant-number">
              {chantData.chantIndex + 1} / {chantData.totalChants}
            </p>
          )}
          {chantData.chantText ? (
            <h1
              className="text-white font-bold leading-tight break-words"
              style={{
                fontSize: "clamp(2rem, 8vw, 5rem)",
                lineHeight: 1.15,
                maxWidth: "90vw",
              }}
              data-testid="text-chant"
            >
              {chantData.chantText}
            </h1>
          ) : (
            <p className="text-neutral-500 text-xl" data-testid="text-no-chant">
              Waiting for next chant...
            </p>
          )}
        </div>
      </div>

      <footer className="px-4 py-3 flex items-center justify-center gap-2 border-t border-neutral-800">
        <Users className="w-4 h-4 text-neutral-500" />
        <span className="text-neutral-400 text-sm font-mono" data-testid="text-viewer-count">
          Viewing now: {viewerCount}
        </span>
        {!connected && (
          <span className="ml-2 text-red-400 text-xs">Reconnecting...</span>
        )}
      </footer>
    </div>
  );
}
