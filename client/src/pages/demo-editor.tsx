import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Separator,
} from "@/components/ui/separator";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  Megaphone,
  ArrowLeft,
  Plus,
  Trash2,
  Radio,
  Square,
  QrCode,
  ExternalLink,
  Check,
  Copy,
  ChevronUp,
  ChevronDown,
  Pencil,
  RotateCw,
  Pause,
  Play,
  Timer,
  Users,
  UserPlus,
  Download,
  X,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  FileText,
  LifeBuoy,
  MessageSquare,
  Smartphone,
  Printer,
  Route,
  MapPin,
  Share2,
  ShieldCheck,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Demonstration, Chant, DemoState } from "@shared/schema";
import { useState, useEffect, useCallback } from "react";

type AdminInfo = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
};

type DemoDetail = {
  demo: Demonstration;
  chants: Chant[];
  state: DemoState | null;
  viewerCount: number;
  admins: AdminInfo[];
};

const clampProgress = (value: number) => Math.min(100, Math.max(0, value));

const getPhaseDurationMs = (chant: Chant | undefined, phase: "leader" | "people") => {
  const durationSeconds = phase === "leader"
    ? (chant?.leaderDuration ?? 4)
    : (chant?.peopleDuration ?? 3);

  return Math.max(1, durationSeconds) * 1000;
};

const chantStarters = [
  { label: "Call for unity", call: "What do we want?", response: "Justice and dignity!" },
  { label: "Prayer response", call: "Guide us together", response: "With peace and courage" },
  { label: "March cadence", call: "Whose streets?", response: "Our streets!" },
];

function toDateTimeLocalValue(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function formatEventSchedule(value: Date | string | null | undefined) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not scheduled";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function DemoEditor() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [newCallText, setNewCallText] = useState("");
  const [newResponseText, setNewResponseText] = useState("");
  const [newChantCycles, setNewChantCycles] = useState(1);
  const [newChantLeaderDuration, setNewChantLeaderDuration] = useState(4);
  const [newChantPeopleDuration, setNewChantPeopleDuration] = useState(3);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingChant, setEditingChant] = useState<Chant | null>(null);
  const [editCallText, setEditCallText] = useState("");
  const [editResponseText, setEditResponseText] = useState("");
  const [editChantCycles, setEditChantCycles] = useState(1);
  const [editChantLeaderDuration, setEditChantLeaderDuration] = useState(4);
  const [editChantPeopleDuration, setEditChantPeopleDuration] = useState(3);

  const [rotationInterval, setRotationInterval] = useState(60);
  const [cycleDelay, setCycleDelay] = useState(500);
  const [eventDuration, setEventDuration] = useState(300);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [supportUrl, setSupportUrl] = useState("");
  const [supportLabel, setSupportLabel] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [locationName, setLocationName] = useState("");
  const [meetingPoint, setMeetingPoint] = useState("");
  const [arrivalNote, setArrivalNote] = useState("");
  const [logisticsLoadedFor, setLogisticsLoadedFor] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [phaseProgress, setPhaseProgress] = useState(0);

  const { data, isLoading, refetch } = useQuery<DemoDetail>({
    queryKey: ["/api/demos", id],
    refetchInterval: 5000,
  });

  const demo = data?.demo;
  const chantsList = data?.chants ?? [];
  const state = data?.state;
  const viewerCount = data?.viewerCount ?? 0;
  const autoRotate = state?.autoRotate ?? false;
  const admins = data?.admins ?? [];
  const { user: currentUser } = useAuth();

  const isLive = demo?.status === "live";
  const isDraft = demo?.status === "draft";
  const isEnded = demo?.status === "ended";
  const currentPhase = state?.currentPhase === "people" ? "people" : "leader";
  const currentChant = state?.currentChantId
    ? chantsList.find((chant) => chant.id === state.currentChantId)
    : undefined;
  const savedScheduledAt = toDateTimeLocalValue(demo?.scheduledAt);
  const logisticsDirty = demo && logisticsLoadedFor === demo.id
    ? scheduledAt !== savedScheduledAt ||
      locationName !== (demo.locationName ?? "") ||
      meetingPoint !== (demo.meetingPoint ?? "") ||
      arrivalNote !== (demo.arrivalNote ?? "")
    : false;
  const readinessItems = [
    {
      label: "Add at least one chant",
      ready: chantsList.length > 0,
      help: "Participants need a call or response before the event can go live.",
    },
    {
      label: "Open the participant page on a phone",
      ready: Boolean(demo),
      help: "Use the QR/link button to test the exact page participants will see.",
    },
    {
      label: "Add a backup admin",
      ready: admins.length > 1,
      help: "A second admin can keep the session running if one device drops out.",
    },
    {
      label: "Set event duration and chant timing",
      ready: eventDuration > 0 && cycleDelay >= 0,
      help: "Confirm the event timer and delay feel right before the crowd joins.",
    },
  ];
  const readyCount = readinessItems.filter((item) => item.ready).length;
  const totalChantSeconds = chantsList.reduce((total, chant, index) => {
    const cycles = Math.max(1, chant.cycles ?? 1);
    const chantSeconds = cycles * ((chant.leaderDuration ?? 4) + (chant.peopleDuration ?? 3));
    const delaySeconds = index > 0 ? cycleDelay / 1000 : 0;
    return total + chantSeconds + delaySeconds;
  }, 0);
  const chantRuntimeMinutes = Math.floor(totalChantSeconds / 60);
  const chantRuntimeSeconds = Math.round(totalChantSeconds % 60);
  const formattedChantRuntime = chantRuntimeMinutes > 0
    ? `${chantRuntimeMinutes}m${chantRuntimeSeconds > 0 ? ` ${chantRuntimeSeconds}s` : ""}`
    : `${chantRuntimeSeconds}s`;

  useEffect(() => {
    if (!state) return;
    if (state.rotationInterval) setRotationInterval(state.rotationInterval);
    if (state.cycleDelay != null) setCycleDelay(state.cycleDelay);
    if (state.eventDurationMinutes) setEventDuration(state.eventDurationMinutes);
  }, [state]);

  useEffect(() => {
    if (!demo) return;
    setSupportUrl(demo.supportUrl ?? "");
    setSupportLabel(demo.supportLabel ?? "");
  }, [demo?.id, demo?.supportUrl, demo?.supportLabel]);

  useEffect(() => {
    if (!demo) return;
    setScheduledAt(toDateTimeLocalValue(demo.scheduledAt));
    setLocationName(demo.locationName ?? "");
    setMeetingPoint(demo.meetingPoint ?? "");
    setArrivalNote(demo.arrivalNote ?? "");
    setLogisticsLoadedFor(demo.id);
  }, [demo?.id, demo?.scheduledAt, demo?.locationName, demo?.meetingPoint, demo?.arrivalNote]);

  useEffect(() => {
    if (!logisticsDirty) return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [logisticsDirty]);

  useEffect(() => {
    if (!state?.liveStartedAt || !isLive) {
      setRemainingTime(null);
      return;
    }

    const startTime = new Date(state.liveStartedAt).getTime();
    if (Number.isNaN(startTime)) {
      setRemainingTime(null);
      return;
    }

    let timerInterval: ReturnType<typeof setInterval> | null = null;

    const updateRemaining = () => {
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - startTime) / 1000);
      const totalSeconds = (state.eventDurationMinutes ?? 300) * 60;
      const remaining = Math.max(0, totalSeconds - elapsedSeconds);
      setRemainingTime(remaining);

      if (remaining === 0 && timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
    };

    updateRemaining();
    timerInterval = setInterval(updateRemaining, 1000);

    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [state?.liveStartedAt, state?.eventDurationMinutes, isLive]);

  useEffect(() => {
    if (!isLive || !state?.updatedAt || !currentChant) {
      setPhaseProgress(0);
      return;
    }

    const phaseStartedAt = new Date(state.updatedAt).getTime();
    const phaseDurationMs = getPhaseDurationMs(currentChant, currentPhase);

    if (Number.isNaN(phaseStartedAt) || phaseDurationMs <= 0) {
      setPhaseProgress(0);
      return;
    }

    let animationFrame = 0;
    const updateProgress = () => {
      const elapsedMs = Date.now() - phaseStartedAt;
      setPhaseProgress(clampProgress((elapsedMs / phaseDurationMs) * 100));
      animationFrame = requestAnimationFrame(updateProgress);
    };

    updateProgress();

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [
    currentChant?.id,
    currentPhase,
    isLive,
    state?.currentCycle,
    state?.updatedAt,
  ]);

  const addChant = useMutation({
    mutationFn: async ({ callText, responseText, cycles, leaderDuration, peopleDuration }: { callText: string; responseText: string; cycles: number; leaderDuration: number; peopleDuration: number }) => {
      await apiRequest("POST", `/api/demos/${id}/chants`, { callText, responseText, cycles, leaderDuration, peopleDuration });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/demos", id] });
      setAddDialogOpen(false);
      setNewCallText("");
      setNewResponseText("");
      setNewChantCycles(1);
      setNewChantLeaderDuration(4);
      setNewChantPeopleDuration(3);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const editChant = useMutation({
    mutationFn: async ({ chantId, callText, responseText, cycles, leaderDuration, peopleDuration }: { chantId: string; callText: string; responseText: string; cycles: number; leaderDuration: number; peopleDuration: number }) => {
      await apiRequest("PATCH", `/api/demos/${id}/chants/${chantId}`, { callText, responseText, cycles, leaderDuration, peopleDuration });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/demos", id] });
      setEditDialogOpen(false);
      setEditingChant(null);
      toast({ title: "Chant updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteChant = useMutation({
    mutationFn: async (chantId: string) => {
      await apiRequest("DELETE", `/api/demos/${id}/chants/${chantId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/demos", id] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const reorderChant = useMutation({
    mutationFn: async ({ chantId, direction }: { chantId: string; direction: "up" | "down" }) => {
      await apiRequest("POST", `/api/demos/${id}/chants/${chantId}/reorder`, { direction });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/demos", id] });
    },
  });

  const setCurrentChant = useMutation({
    mutationFn: async (chantId: string) => {
      await apiRequest("POST", `/api/demos/${id}/current`, { chantId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/demos", id] });
      toast({ title: "Chant pushed live" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const goLive = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/demos/${id}/live`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/demos", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/demos"] });
      toast({ title: "Demonstration is now live!" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const endDemo = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/demos/${id}/end`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/demos", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/demos"] });
      toast({ title: "Demonstration ended" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const toggleAutoRotate = useMutation({
    mutationFn: async (enabled: boolean) => {
      await apiRequest("POST", `/api/demos/${id}/auto-rotate`, {
        autoRotate: enabled,
        rotationInterval,
        cycleDelay,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/demos", id] });
      toast({ title: autoRotate ? "Auto-rotation paused" : "Auto-rotation started" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateRotationInterval = useMutation({
    mutationFn: async (interval: number) => {
      await apiRequest("POST", `/api/demos/${id}/auto-rotate`, {
        autoRotate,
        rotationInterval: interval,
        cycleDelay,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/demos", id] });
      toast({ title: "Rotation interval updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateCycleDelay = useMutation({
    mutationFn: async (delay: number) => {
      await apiRequest("POST", `/api/demos/${id}/auto-rotate`, {
        autoRotate,
        rotationInterval,
        cycleDelay: delay,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/demos", id] });
      toast({ title: "Cycle delay updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateEventDuration = useMutation({
    mutationFn: async (duration: number) => {
      await apiRequest("POST", `/api/demos/${id}/event-duration`, {
        eventDurationMinutes: duration,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/demos", id] });
      toast({ title: "Event duration updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateTitle = useMutation({
    mutationFn: async (title: string) => {
      await apiRequest("PATCH", `/api/demos/${id}`, { title });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/demos", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/demos"] });
      setEditingTitle(false);
      toast({ title: "Event name updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateSupportLink = useMutation({
    mutationFn: async ({ url, label }: { url: string; label: string }) => {
      await apiRequest("PATCH", `/api/demos/${id}`, {
        supportUrl: url,
        supportLabel: label,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/demos", id] });
      toast({ title: supportUrl.trim() ? "Participant support link saved" : "Participant support link cleared" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateLogistics = useMutation({
    mutationFn: async (payload: { scheduledAt: string; locationName: string; meetingPoint: string; arrivalNote: string }) => {
      await apiRequest("PATCH", `/api/demos/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/demos", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/demos"] });
      toast({ title: "Event logistics saved" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const inviteAdmin = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiRequest("POST", `/api/demos/${id}/admins`, { email });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/demos", id] });
      setInviteEmail("");
      toast({ title: "Admin invited successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const removeAdmin = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("DELETE", `/api/demos/${id}/admins/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/demos", id] });
      toast({ title: "Admin removed" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const exportDemo = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/demos/${id}/export`, {
        credentials: "include",
      });

      if (!res.ok) {
        const text = (await res.text()) || "Failed to export demonstration";
        throw new Error(text);
      }

      return {
        blob: await res.blob(),
        disposition: res.headers.get("content-disposition"),
      };
    },
    onSuccess: ({ blob, disposition }) => {
      const filenameMatch = disposition?.match(/filename="([^"]+)"/i);
      const filename = filenameMatch?.[1] || `${demo?.title || "demonstration"}.chantlive.json`;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast({ title: "Demonstration exported" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const loadQr = useCallback(async () => {
    if (!demo) return;
    try {
      const res = await fetch(`/api/demos/${id}/qrcode`);
      const data = await res.json();
      setQrDataUrl(data.qrDataUrl);
    } catch (e) {}
  }, [demo, id]);

  useEffect(() => {
    if (qrDialogOpen) loadQr();
  }, [qrDialogOpen, loadQr]);

  const openEditDialog = (chant: Chant) => {
    setEditingChant(chant);
    setEditCallText(chant.callText);
    setEditResponseText(chant.responseText);
    setEditChantCycles(chant.cycles ?? 1);
    setEditChantLeaderDuration(chant.leaderDuration ?? 4);
    setEditChantPeopleDuration(chant.peopleDuration ?? 3);
    setEditDialogOpen(true);
  };

  const applyChantStarter = (starter: (typeof chantStarters)[number]) => {
    setNewCallText(starter.call);
    setNewResponseText(starter.response);
  };

  const publicUrl = demo ? `${window.location.origin}/d/${demo.publicId}` : "";

  const copyUrl = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareParticipantLink = async () => {
    if (!publicUrl) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: demo?.title ?? "ChantLive demonstration",
          text: "Join the live ChantLive participant page.",
          url: publicUrl,
        });
        return;
      } catch {
        // Fall back to copying if sharing is canceled or unavailable.
      }
    }

    copyUrl();
  };

  const printQrHandout = () => {
    document.body.classList.add("printing-qr-handout");
    window.print();
    setTimeout(() => document.body.classList.remove("printing-qr-handout"), 500);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 py-3">
            <Skeleton className="h-8 w-48" />
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-8 space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </main>
      </div>
    );
  }

  if (!demo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-sm">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">Demonstration not found</p>
            <Button variant="outline" onClick={() => navigate("/admin")}>Back to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")} data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                {editingTitle ? (
                  <div className="flex items-center gap-1">
                    <Input
                      value={titleValue}
                      onChange={(e) => setTitleValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && titleValue.trim()) {
                          updateTitle.mutate(titleValue.trim());
                        }
                        if (e.key === "Escape") setEditingTitle(false);
                      }}
                      className="text-lg font-semibold w-64"
                      autoFocus
                      data-testid="input-edit-title"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (titleValue.trim()) updateTitle.mutate(titleValue.trim());
                      }}
                      disabled={!titleValue.trim() || updateTitle.isPending}
                      data-testid="button-save-title"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingTitle(false)}
                      data-testid="button-cancel-title"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <button
                    className="flex items-center gap-1.5 group cursor-pointer bg-transparent border-0 p-0"
                    onClick={() => {
                      if (!isEnded) {
                        setTitleValue(demo.title);
                        setEditingTitle(true);
                      }
                    }}
                    data-testid="button-edit-title"
                  >
                    <h1 className="font-semibold text-lg" data-testid="text-demo-title">{demo.title}</h1>
                    {!isEnded && <Pencil className="w-3.5 h-3.5 text-muted-foreground invisible group-hover:visible" />}
                  </button>
                )}
                <Badge variant={demo.status === "live" ? "default" : demo.status === "draft" ? "secondary" : "outline"}>
                  {isLive && <Radio className="w-3 h-3 mr-1" />}
                  {demo.status}
                </Badge>
              </div>
              {isLive && (
                <p className="text-xs text-muted-foreground">Viewers: {viewerCount}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportDemo.mutate()}
              disabled={exportDemo.isPending}
              data-testid="button-export-demo"
            >
              <Download className="w-4 h-4 mr-1" />
              {exportDemo.isPending ? "Exporting..." : "Export"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={copyUrl}
              disabled={!publicUrl}
              data-testid="button-copy-participant-link"
            >
              {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
              {copied ? "Copied" : "Copy Link"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={shareParticipantLink}
              disabled={!publicUrl}
              data-testid="button-share-participant-link"
            >
              <Share2 className="w-4 h-4 mr-1" />
              Share Link
            </Button>
            <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-qr">
                  <QrCode className="w-4 h-4 mr-1" />
                  QR Code
                </Button>
              </DialogTrigger>
              <DialogContent className="gap-3 p-4 sm:max-w-md sm:p-5" data-testid="dialog-qr-code">
                <DialogHeader className="pr-6">
                  <DialogTitle>Participant QR Code</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center gap-3 py-1">
                  <div className="qr-print-handout flex w-full flex-col items-center gap-2 rounded-xl border bg-background p-3 text-center">
                    <p className="text-base font-semibold text-foreground">{demo.title}</p>
                    <p className="text-xs text-muted-foreground">Scan or open the link to follow the live chants.</p>
                    {qrDataUrl ? (
                      <img src={qrDataUrl} alt={`QR code for joining ${demo.title}`} className="h-48 w-48 sm:h-56 sm:w-56" data-testid="img-qr" />
                    ) : (
                      <Skeleton className="h-48 w-48 sm:h-56 sm:w-56" />
                    )}
                    <p className="break-all text-xs text-muted-foreground">{publicUrl}</p>
                    <p className="text-xs text-muted-foreground">Keep this page open during the event.</p>
                  </div>
                  <div className="w-full rounded-lg border bg-muted/40 p-2.5 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">Participant instructions</p>
                    <p>Open your camera, scan the QR code, then keep the chant page open during the event.</p>
                  </div>
                  <div className="w-full rounded-lg border border-orange-200 bg-orange-50 p-2.5 text-xs text-orange-900">
                    <p className="font-medium mb-1">Accessible joining fallback</p>
                    <p>
                      Announce the participant link out loud and share it by message or print. This helps people who
                      cannot scan the QR code, have older cameras, or need a screen-reader-friendly path.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 w-full">
                    <Input value={publicUrl} readOnly className="text-xs" data-testid="input-public-url" />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={copyUrl}
                      aria-label={copied ? "Participant link copied" : "Copy participant link"}
                      data-testid="button-copy-url"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground" role="status" aria-live="polite" data-testid="text-copy-status">
                    {copied ? "Participant link copied." : "Copy the participant link if people cannot scan the QR code."}
                  </p>
                  <p className="text-xs text-muted-foreground text-center max-w-sm">
                    If the QR code is hard to scan in the crowd, copy this participant link and share it by message,
                    projector, or printed fallback.
                  </p>
                  <div className="w-full rounded-lg border bg-card p-2.5 text-xs text-muted-foreground" data-testid="text-qr-handout-preview">
                    <p className="font-medium text-foreground mb-1">Handout checklist</p>
                    <p>Print the QR code with the event name, participant link, and one sentence: scan or open the link, then keep the page open.</p>
                  </div>
                  <div className="grid w-full gap-2 sm:grid-cols-3">
                    <Button variant="outline" size="sm" asChild>
                      <a href={publicUrl} target="_blank" rel="noopener noreferrer" data-testid="link-open-public">
                        <ExternalLink className="w-4 h-4 mr-1" />
                        Open
                      </a>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={printQrHandout}
                      data-testid="button-print-participant-handout"
                    >
                      <Printer className="w-4 h-4 mr-1" />
                      Print
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/admin/demos/${id}/handout`)} data-testid="button-open-full-handout">
                      <ExternalLink className="w-4 h-4 mr-1" />
                      Handout
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {(isDraft || isEnded) && (
              <Button onClick={() => goLive.mutate()} disabled={goLive.isPending || chantsList.length === 0} data-testid="button-go-live">
                <Radio className="w-4 h-4 mr-1" />
                {goLive.isPending ? "Going live..." : isEnded ? "Reactivate" : "Go Live"}
              </Button>
            )}
            {isLive && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" data-testid="button-end-demo">
                    <Square className="w-4 h-4 mr-1" />
                    End Demo
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>End this demonstration?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will stop the live feed for all participants. You can reactivate it later if needed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => endDemo.mutate()} data-testid="button-confirm-end">
                      End Demonstration
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {!isLive && (
          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardContent className="py-4">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Before you go live</p>
                  <p className="text-xs text-muted-foreground">
                    Complete the essentials that make a live event easier to run under pressure.
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {readinessItems.map((item) => (
                      <div
                        key={item.label}
                        className="rounded-md border bg-background/80 p-3"
                        data-testid={`text-readiness-${item.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                      >
                        <p className="flex items-center gap-2 text-xs font-medium">
                          <CheckCircle2 className={`h-3.5 w-3.5 ${item.ready ? "text-emerald-600" : "text-muted-foreground"}`} />
                          {item.label}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">{item.help}</p>
                      </div>
                    ))}
                  </div>
                  {publicUrl && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => navigate(`/admin/demos/${id}/command`)} data-testid="button-open-command-readiness">
                        <Megaphone className="w-3.5 h-3.5 mr-1" />
                        Command center
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <a href={publicUrl} target="_blank" rel="noopener noreferrer" data-testid="link-test-participant-page">
                          <ExternalLink className="w-3.5 h-3.5 mr-1" />
                          Test participant page
                        </a>
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => navigate(`/admin/demos/${id}/handout`)} data-testid="button-open-handout-page">
                        <Printer className="w-3.5 h-3.5 mr-1" />
                        Open handout page
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => navigate(`/admin/demos/${id}/plan`)} data-testid="button-open-event-plan">
                        <ClipboardList className="w-3.5 h-3.5 mr-1" />
                        Event-day plan
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => navigate(`/admin/demos/${id}/share-kit`)} data-testid="button-open-share-kit-readiness">
                        <MessageSquare className="w-3.5 h-3.5 mr-1" />
                        Share kit
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => navigate(`/admin/demos/${id}/recovery`)} data-testid="button-open-recovery-readiness">
                        <LifeBuoy className="w-3.5 h-3.5 mr-1" />
                        Recovery
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => navigate(`/admin/demos/${id}/briefing`)} data-testid="button-open-briefing-readiness">
                        <Users className="w-3.5 h-3.5 mr-1" />
                        Brief volunteers
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => navigate(`/admin/demos/${id}/run-of-show`)} data-testid="button-open-run-of-show-readiness">
                        <Route className="w-3.5 h-3.5 mr-1" />
                        Run of show
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => navigate(`/admin/demos/${id}/safety`)} data-testid="button-open-safety-readiness">
                        <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                        Safety board
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setQrDialogOpen(true)} data-testid="button-readiness-open-qr">
                        <QrCode className="w-3.5 h-3.5 mr-1" />
                        Show QR instructions
                      </Button>
                    </div>
                  )}
                </div>
                <Badge variant={readyCount >= 3 ? "secondary" : "outline"} data-testid="badge-live-readiness">
                  {readyCount}/{readinessItems.length} ready
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {(isLive || isDraft || isEnded) && (
          <Card className="mb-6">
            <CardContent className="py-4">
              <div className="space-y-4">
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3" data-testid="card-command-center-summary">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="flex items-center gap-2 text-sm font-medium">
                        <Megaphone className="h-4 w-4 text-primary" />
                        Command center
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        One page for live status, readiness, participant links, recovery, sharing, briefing, reporting, and event controls.
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/admin/demos/${id}/command`)} data-testid="button-open-command-summary">
                      Open command center
                    </Button>
                  </div>
                </div>
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3" data-testid="card-event-day-plan-summary">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="flex items-center gap-2 text-sm font-medium">
                        <ClipboardList className="h-4 w-4 text-primary" />
                        Event-day plan
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Generated runbook for permits, accessibility, safety, participant joining, admins, and live controls.
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground" data-testid="text-chant-runtime-summary">
                        Current chant runtime estimate: {chantsList.length > 0 ? formattedChantRuntime : "add chants to calculate runtime"}.
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/admin/demos/${id}/plan`)} data-testid="button-open-plan-summary">
                      <ClipboardList className="w-3.5 h-3.5 mr-1" />
                      Open runbook
                    </Button>
                  </div>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3" data-testid="card-share-kit-summary">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="flex items-center gap-2 text-sm font-medium">
                        <MessageSquare className="h-4 w-4 text-primary" />
                        Share kit
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Copy-ready participant invites, backup-admin handoffs, accessibility fallback text, and day-of announcement scripts.
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/admin/demos/${id}/share-kit`)} data-testid="button-open-share-kit-summary">
                      <Share2 className="w-3.5 h-3.5 mr-1" />
                      Open share kit
                    </Button>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border bg-background p-3" data-testid="card-recovery-console-summary">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <LifeBuoy className="h-4 w-4 text-primary" />
                      Recovery console
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Live fallback scripts, participant reconnect instructions, backup-admin handoff, and current status.
                    </p>
                    <Button className="mt-3" variant="outline" size="sm" onClick={() => navigate(`/admin/demos/${id}/recovery`)} data-testid="button-open-recovery-summary">
                      Open recovery
                    </Button>
                  </div>
                  <div className="rounded-lg border bg-background p-3" data-testid="card-event-report-summary">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <FileText className="h-4 w-4 text-primary" />
                      Post-event report
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Copyable debrief summary with chant review, runtime estimate, admin follow-up, and reuse checklist.
                    </p>
                    <Button className="mt-3" variant="outline" size="sm" onClick={() => navigate(`/admin/demos/${id}/report`)} data-testid="button-open-report-summary">
                      Open report
                    </Button>
                  </div>
                </div>
                <div className="rounded-lg border bg-background p-3" data-testid="card-volunteer-briefing-summary">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="flex items-center gap-2 text-sm font-medium">
                        <Users className="h-4 w-4 text-primary" />
                        Volunteer briefing
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Print or copy role cards for speakers, marshals, accessibility helpers, and backup admins.
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/admin/demos/${id}/briefing`)} data-testid="button-open-briefing-summary">
                      Open briefing
                    </Button>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border bg-background p-3" data-testid="card-run-of-show-summary">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <Route className="h-4 w-4 text-primary" />
                      Run of show
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Generate a timed event-day sequence for arrival, safety, chanting, recovery, and debrief.
                    </p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate(`/admin/demos/${id}/run-of-show`)} data-testid="button-open-run-of-show-summary">
                      Open run of show
                    </Button>
                  </div>
                  <div className="rounded-lg border bg-background p-3" data-testid="card-safety-board-summary">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      Safety board
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Print or copy organiser safety guidance for marshals, accessibility helpers, and participants.
                    </p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate(`/admin/demos/${id}/safety`)} data-testid="button-open-safety-summary">
                      Open safety board
                    </Button>
                  </div>
                </div>
                {isLive && (
                  <div className="rounded-lg border bg-muted/30 p-3" data-testid="text-live-control-summary">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="flex items-center gap-2 text-sm font-medium">
                          <ClipboardCheck className="h-4 w-4 text-primary" />
                          Live control status
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {currentChant
                            ? `${currentPhase === "leader" ? "Leader call" : "Everyone response"} is active on chant ${chantsList.findIndex((chant) => chant.id === currentChant.id) + 1} of ${chantsList.length}.`
                            : "No chant is currently pushed live."}
                        </p>
                        {currentChant && (
                          <p className="mt-1 text-xs text-muted-foreground" data-testid="text-live-next-up">
                            Next up: {currentPhase === "leader" ? currentChant.responseText || "everyone response" : "next leader call"}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1">
                          <Users className="h-3.5 w-3.5" />
                          {viewerCount} viewing
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1">
                          <Smartphone className="h-3.5 w-3.5" />
                          Keep QR/link visible
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Timer className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <Input
                        type="number"
                        min={1}
                        max={300}
                        value={eventDuration}
                        onChange={(e) => setEventDuration(Number(e.target.value))}
                        onBlur={() => {
                          const val = Math.max(1, Math.min(300, eventDuration));
                          setEventDuration(val);
                          if (val !== state?.eventDurationMinutes && !isLive) {
                            updateEventDuration.mutate(val);
                          }
                        }}
                        disabled={isLive}
                        className="w-24 text-sm"
                        data-testid="input-event-duration"
                      />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">min</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Event duration (up to 5 hours)</p>
                  </div>
                  {isLive && remainingTime !== null && (
                    <div className="md:text-right">
                      <p className="text-sm font-medium">
                        {Math.floor(remainingTime / 60)}:{String(remainingTime % 60).padStart(2, "0")}
                      </p>
                      <p className="text-xs text-muted-foreground">Remaining</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Timer className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <Input
                        type="number"
                        min={0}
                        max={5000}
                        step={100}
                        value={cycleDelay}
                        onChange={(e) => setCycleDelay(Number(e.target.value))}
                        onBlur={() => {
                          const val = Math.max(0, Math.min(5000, cycleDelay));
                          setCycleDelay(val);
                          if (val !== state?.cycleDelay) {
                            updateCycleDelay.mutate(val);
                          }
                        }}
                        className="w-24 text-sm"
                        data-testid="input-cycle-delay"
                      />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">ms</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Delay between cycles and chants (0–5000 ms)</p>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <RotateCw className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm font-medium">Auto-rotation</span>
                  </div>
                  <Button
                    variant={autoRotate ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleAutoRotate.mutate(!autoRotate)}
                    disabled={toggleAutoRotate.isPending}
                    className="w-full md:w-auto"
                    data-testid="button-toggle-auto-rotate"
                  >
                    {autoRotate ? (
                      <>
                        <Pause className="w-3.5 h-3.5 mr-1" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 mr-1" />
                        Start
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="mb-6" data-testid="card-event-logistics">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-5 w-5 text-primary" />
              Event logistics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Add the core details participants need before they arrive. These details appear on the live page, participant handout, share kit, and event-day plan.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="scheduled-at">Date and time</Label>
                <Input
                  id="scheduled-at"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(event) => setScheduledAt(event.target.value)}
                  data-testid="input-event-scheduled-at"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="location-name">Location or venue</Label>
                <Input
                  id="location-name"
                  value={locationName}
                  onChange={(event) => setLocationName(event.target.value)}
                  maxLength={160}
                  placeholder="State Library steps, north lawn, main hall..."
                  data-testid="input-event-location"
                />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="meeting-point">Meeting point</Label>
                <Input
                  id="meeting-point"
                  value={meetingPoint}
                  onChange={(event) => setMeetingPoint(event.target.value)}
                  maxLength={240}
                  placeholder="Meet near the orange banner at the east entrance"
                  data-testid="input-event-meeting-point"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="arrival-note">Arrival note</Label>
                <Textarea
                  id="arrival-note"
                  value={arrivalNote}
                  onChange={(event) => setArrivalNote(event.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="Arrive 15 minutes early, bring water, and ask marshals for accessibility help."
                  data-testid="input-event-arrival-note"
                />
              </div>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
              <p className="flex items-center gap-2 font-medium text-foreground">
                <MapPin className="h-4 w-4 text-primary" />
                Participant preview
              </p>
              <p className="mt-1">{formatEventSchedule(scheduledAt)}</p>
              {scheduledAt && (
                <p className="mt-1 text-xs">Local timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
              )}
              <p className="mt-1">{locationName || "No location set yet"}</p>
              {meetingPoint && <p className="mt-1">Meet: {meetingPoint}</p>}
            </div>
            <div
              className={`rounded-lg border px-3 py-2 text-sm ${logisticsDirty ? "border-amber-300 bg-amber-50 text-amber-950" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}
              role="status"
              aria-live="polite"
              data-testid="status-event-logistics"
            >
              {logisticsDirty
                ? "Unsaved logistics changes — save before leaving this event."
                : "Logistics match the saved participant details."}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => updateLogistics.mutate({
                  scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : "",
                  locationName: locationName.trim(),
                  meetingPoint: meetingPoint.trim(),
                  arrivalNote: arrivalNote.trim(),
                })}
                disabled={updateLogistics.isPending || !logisticsDirty}
                data-testid="button-save-event-logistics"
              >
                {updateLogistics.isPending ? "Saving..." : "Save logistics"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setScheduledAt("");
                  setLocationName("");
                  setMeetingPoint("");
                  setArrivalNote("");
                  updateLogistics.mutate({ scheduledAt: "", locationName: "", meetingPoint: "", arrivalNote: "" });
                }}
                disabled={updateLogistics.isPending || (!demo.scheduledAt && !demo.locationName && !demo.meetingPoint && !demo.arrivalNote)}
                data-testid="button-clear-event-logistics"
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6" data-testid="card-participant-support-link">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Share2 className="h-5 w-5 text-primary" />
              Participant support action
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Add one organizer-approved link participants can open from the live view, handout, and command workflow. Use it for donations, volunteer signup, petitions, permits information, or a campaign page.
            </p>
            <div className="grid gap-3 md:grid-cols-[0.8fr_1.4fr]">
              <div className="space-y-1.5">
                <Label htmlFor="support-label">Button label</Label>
                <Input
                  id="support-label"
                  value={supportLabel}
                  onChange={(event) => setSupportLabel(event.target.value)}
                  maxLength={80}
                  placeholder="Support this event"
                  data-testid="input-support-label"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="support-url">Support link</Label>
                <Input
                  id="support-url"
                  value={supportUrl}
                  onChange={(event) => setSupportUrl(event.target.value)}
                  placeholder="https://example.org/donate-volunteer-or-sign"
                  data-testid="input-support-url"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                onClick={() => updateSupportLink.mutate({ url: supportUrl.trim(), label: supportLabel.trim() })}
                disabled={updateSupportLink.isPending || !supportUrl.trim()}
                data-testid="button-save-support-link"
              >
                Save support link
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSupportUrl("");
                  setSupportLabel("");
                  updateSupportLink.mutate({ url: "", label: "" });
                }}
                disabled={updateSupportLink.isPending || (!demo.supportUrl && !demo.supportLabel)}
                data-testid="button-clear-support-link"
              >
                Clear
              </Button>
              {demo.supportUrl && (
                <Button variant="outline" size="sm" asChild>
                  <a href={demo.supportUrl} target="_blank" rel="noopener noreferrer" data-testid="link-test-support-link">
                    <ExternalLink className="mr-1 h-3.5 w-3.5" />
                    Test link
                  </a>
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              The link must start with http:// or https://. Leave it empty if the event should only show chant controls.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Event Admins ({admins.length})</p>
                  <p className="text-xs text-muted-foreground">People who can manage this event</p>
                </div>
              </div>
              {(demo.createdBy === currentUser?.id || currentUser?.role === "super_admin") && !isEnded && (
                <Dialog open={adminDialogOpen} onOpenChange={setAdminDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" data-testid="button-manage-admins">
                      <UserPlus className="w-3.5 h-3.5 mr-1" />
                      Invite Admin
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Invite Admin</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                      <p className="text-sm text-muted-foreground">
                        Enter the email address of a registered user to give them admin access to this event.
                      </p>
                      <div className="flex items-center gap-2">
                        <Input
                          type="email"
                          placeholder="admin@example.com"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && inviteEmail.trim()) {
                              inviteAdmin.mutate(inviteEmail.trim());
                            }
                          }}
                          data-testid="input-invite-email"
                        />
                        <Button
                          onClick={() => inviteAdmin.mutate(inviteEmail.trim())}
                          disabled={!inviteEmail.trim() || inviteAdmin.isPending}
                          data-testid="button-send-invite"
                        >
                          {inviteAdmin.isPending ? "Inviting..." : "Invite"}
                        </Button>
                      </div>
                    </div>
                    {admins.length > 0 && (
                      <div className="pt-2">
                        <Separator className="mb-3" />
                        <p className="text-xs text-muted-foreground mb-2">Current admins</p>
                        <div className="space-y-2">
                          {admins.map((admin) => (
                            <div key={admin.id} className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <Avatar className="h-7 w-7">
                                  <AvatarImage src={admin.avatarUrl || undefined} />
                                  <AvatarFallback className="text-xs">{admin.name.charAt(0).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{admin.name}</p>
                                  <p className="text-xs text-muted-foreground truncate">{admin.email}</p>
                                </div>
                              </div>
                              {admin.id === demo.createdBy ? (
                                <Badge variant="secondary" className="text-xs shrink-0">Creator</Badge>
                              ) : (
                                (demo.createdBy === currentUser?.id || currentUser?.role === "super_admin") && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeAdmin.mutate(admin.id)}
                                    disabled={removeAdmin.isPending}
                                    data-testid={`button-remove-admin-${admin.id}`}
                                  >
                                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                                  </Button>
                                )
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {admins.map((admin) => (
                <div key={admin.id} className="flex items-center gap-1.5">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={admin.avatarUrl || undefined} />
                    <AvatarFallback className="text-xs">{admin.name.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground">{admin.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
          <h2 className="text-lg font-semibold">Chants ({chantsList.length})</h2>
          {!isLive && (
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={chantsList.length >= 30} data-testid="button-add-chant">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Chant
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Chant</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Starter examples</p>
                    <div className="flex flex-wrap gap-2">
                      {chantStarters.map((starter) => (
                        <Button
                          key={starter.label}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => applyChantStarter(starter)}
                          data-testid={`button-chant-starter-${starter.label.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          {starter.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="call-text" className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#f97316" }} />
                      Leader says (Call)
                    </Label>
                    <Textarea
                      id="call-text"
                      placeholder="What the leader calls out..."
                      value={newCallText}
                      onChange={(e) => setNewCallText(e.target.value)}
                      className="resize-none"
                      rows={2}
                      data-testid="input-call-text"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="response-text" className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#38bdf8" }} />
                      Crowd responds (Response)
                    </Label>
                    <Textarea
                      id="response-text"
                      placeholder="What the crowd responds..."
                      value={newResponseText}
                      onChange={(e) => setNewResponseText(e.target.value)}
                      className="resize-none"
                      rows={2}
                      data-testid="input-response-text"
                    />
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3" data-testid="text-new-chant-preview">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Participant preview</p>
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-orange-600">
                        Leader: {newCallText.trim() || "Your call text appears here"}
                      </p>
                      <p className="text-sm font-semibold text-sky-600">
                        Everyone: {newResponseText.trim() || "Your response text appears here"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {newChantCycles} cycle{newChantCycles === 1 ? "" : "s"} - leader {newChantLeaderDuration}s, people {newChantPeopleDuration}s
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3 md:grid md:grid-cols-3 md:gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="new-cycles">Cycles</Label>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-10 w-10 p-0"
                          onClick={() => setNewChantCycles(Math.max(1, newChantCycles - 1))}
                          disabled={newChantCycles <= 1}
                          data-testid="button-cycles-minus"
                        >
                          −
                        </Button>
                        <Input
                          id="new-cycles"
                          type="number"
                          min={1}
                          max={10}
                          value={newChantCycles}
                          onChange={(e) => setNewChantCycles(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                          className="w-full text-center"
                          data-testid="input-new-cycles"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-10 w-10 p-0"
                          onClick={() => setNewChantCycles(Math.min(10, newChantCycles + 1))}
                          disabled={newChantCycles >= 10}
                          data-testid="button-cycles-plus"
                        >
                          +
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-leader-duration">Leader sec</Label>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-10 w-10 p-0"
                          onClick={() => setNewChantLeaderDuration(Math.max(1, newChantLeaderDuration - 1))}
                          disabled={newChantLeaderDuration <= 1}
                          data-testid="button-leader-duration-minus"
                        >
                          −
                        </Button>
                        <Input
                          id="new-leader-duration"
                          type="number"
                          min={1}
                          max={30}
                          value={newChantLeaderDuration}
                          onChange={(e) => setNewChantLeaderDuration(Math.min(30, Math.max(1, parseInt(e.target.value) || 1)))}
                          className="w-full text-center"
                          data-testid="input-new-leader-duration"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-10 w-10 p-0"
                          onClick={() => setNewChantLeaderDuration(Math.min(30, newChantLeaderDuration + 1))}
                          disabled={newChantLeaderDuration >= 30}
                          data-testid="button-leader-duration-plus"
                        >
                          +
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-people-duration">People sec</Label>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-10 w-10 p-0"
                          onClick={() => setNewChantPeopleDuration(Math.max(1, newChantPeopleDuration - 1))}
                          disabled={newChantPeopleDuration <= 1}
                          data-testid="button-people-duration-minus"
                        >
                          −
                        </Button>
                        <Input
                          id="new-people-duration"
                          type="number"
                          min={1}
                          max={30}
                          value={newChantPeopleDuration}
                          onChange={(e) => setNewChantPeopleDuration(Math.min(30, Math.max(1, parseInt(e.target.value) || 1)))}
                          className="w-full text-center"
                          data-testid="input-new-people-duration"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-10 w-10 p-0"
                          onClick={() => setNewChantPeopleDuration(Math.min(30, newChantPeopleDuration + 1))}
                          disabled={newChantPeopleDuration >= 30}
                          data-testid="button-people-duration-plus"
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => addChant.mutate({ callText: newCallText.trim(), responseText: newResponseText.trim(), cycles: newChantCycles, leaderDuration: newChantLeaderDuration, peopleDuration: newChantPeopleDuration })}
                    disabled={(!newCallText.trim() && !newResponseText.trim()) || addChant.isPending}
                    data-testid="button-confirm-add-chant"
                  >
                    {addChant.isPending ? "Adding..." : "Add Chant"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Chant</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="edit-call-text" className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#f97316" }} />
                  Leader says (Call)
                </Label>
                <Textarea
                  id="edit-call-text"
                  placeholder="What the leader calls out..."
                  value={editCallText}
                  onChange={(e) => setEditCallText(e.target.value)}
                  className="resize-none"
                  rows={2}
                  data-testid="input-edit-call-text"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-response-text" className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#38bdf8" }} />
                  Crowd responds (Response)
                </Label>
                <Textarea
                  id="edit-response-text"
                  placeholder="What the crowd responds..."
                  value={editResponseText}
                  onChange={(e) => setEditResponseText(e.target.value)}
                  className="resize-none"
                  rows={2}
                  data-testid="input-edit-response-text"
                />
              </div>
              <div className="space-y-3 md:grid md:grid-cols-3 md:gap-3">
                <div className="space-y-2">
                  <Label htmlFor="edit-cycles">Cycles</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 w-10 p-0"
                      onClick={() => setEditChantCycles(Math.max(1, editChantCycles - 1))}
                      disabled={editChantCycles <= 1}
                      data-testid="button-edit-cycles-minus"
                    >
                      −
                    </Button>
                    <Input
                      id="edit-cycles"
                      type="number"
                      min={1}
                      max={10}
                      value={editChantCycles}
                      onChange={(e) => setEditChantCycles(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                      className="w-full text-center"
                      data-testid="input-edit-cycles"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 w-10 p-0"
                      onClick={() => setEditChantCycles(Math.min(10, editChantCycles + 1))}
                      disabled={editChantCycles >= 10}
                      data-testid="button-edit-cycles-plus"
                    >
                      +
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-leader-duration">Leader sec</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 w-10 p-0"
                      onClick={() => setEditChantLeaderDuration(Math.max(1, editChantLeaderDuration - 1))}
                      disabled={editChantLeaderDuration <= 1}
                      data-testid="button-edit-leader-duration-minus"
                    >
                      −
                    </Button>
                    <Input
                      id="edit-leader-duration"
                      type="number"
                      min={1}
                      max={30}
                      value={editChantLeaderDuration}
                      onChange={(e) => setEditChantLeaderDuration(Math.min(30, Math.max(1, parseInt(e.target.value) || 1)))}
                      className="w-full text-center"
                      data-testid="input-edit-leader-duration"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 w-10 p-0"
                      onClick={() => setEditChantLeaderDuration(Math.min(30, editChantLeaderDuration + 1))}
                      disabled={editChantLeaderDuration >= 30}
                      data-testid="button-edit-leader-duration-plus"
                    >
                      +
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-people-duration">People sec</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 w-10 p-0"
                      onClick={() => setEditChantPeopleDuration(Math.max(1, editChantPeopleDuration - 1))}
                      disabled={editChantPeopleDuration <= 1}
                      data-testid="button-edit-people-duration-minus"
                    >
                      −
                    </Button>
                    <Input
                      id="edit-people-duration"
                      type="number"
                      min={1}
                      max={30}
                      value={editChantPeopleDuration}
                      onChange={(e) => setEditChantPeopleDuration(Math.min(30, Math.max(1, parseInt(e.target.value) || 1)))}
                      className="w-full text-center"
                      data-testid="input-edit-people-duration"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 w-10 p-0"
                      onClick={() => setEditChantPeopleDuration(Math.min(30, editChantPeopleDuration + 1))}
                      disabled={editChantPeopleDuration >= 30}
                      data-testid="button-edit-people-duration-plus"
                    >
                      +
                    </Button>
                  </div>
                </div>
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  if (editingChant) {
                    editChant.mutate({
                      chantId: editingChant.id,
                      callText: editCallText.trim(),
                      responseText: editResponseText.trim(),
                      cycles: editChantCycles,
                      leaderDuration: editChantLeaderDuration,
                      peopleDuration: editChantPeopleDuration,
                    });
                  }
                }}
                disabled={(!editCallText.trim() && !editResponseText.trim()) || editChant.isPending}
                data-testid="button-confirm-edit-chant"
              >
                {editChant.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {chantsList.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Megaphone className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">No chants added yet. Add your first chant to get started.</p>
              {!isEnded && (
                <div className="mb-4 flex flex-wrap justify-center gap-2">
                  {chantStarters.map((starter) => (
                    <Button
                      key={starter.label}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        applyChantStarter(starter);
                        setAddDialogOpen(true);
                      }}
                      data-testid={`button-empty-chant-starter-${starter.label.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      Use {starter.label.toLowerCase()}
                    </Button>
                  ))}
                </div>
              )}
              {!isEnded && (
                <Button variant="outline" onClick={() => setAddDialogOpen(true)} data-testid="button-empty-add-chant">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Chant
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {chantsList.map((chant, index) => {
              const isCurrent = state?.currentChantId === chant.id;
              return (
                <Card
                  key={chant.id}
                  className={isCurrent ? "ring-2 ring-primary" : ""}
                  data-testid={`card-chant-${chant.id}`}
                >
                  <CardContent className="py-4 flex items-center gap-3">
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={index === 0 || isEnded}
                        onClick={() => reorderChant.mutate({ chantId: chant.id, direction: "up" })}
                        data-testid={`button-move-up-${chant.id}`}
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={index === chantsList.length - 1 || isEnded}
                        onClick={() => reorderChant.mutate({ chantId: chant.id, direction: "down" })}
                        data-testid={`button-move-down-${chant.id}`}
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-muted-foreground font-mono">#{index + 1}</span>
                        {isCurrent && (
                          <Badge variant="default" className="text-xs">
                            <Radio className="w-2.5 h-2.5 mr-1" />
                            LIVE
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-1" data-testid={`text-chant-${chant.id}`}>
                        {chant.callText && (
                          <p className="text-sm font-medium break-words flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: "#f97316" }} />
                            <span>{chant.callText}</span>
                          </p>
                        )}
                        {chant.responseText && (
                          <p className="text-sm font-medium break-words flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: "#38bdf8" }} />
                            <span>{chant.responseText}</span>
                          </p>
                        )}
                      </div>
                      {isCurrent && isLive && (
                        <div className="mt-3" data-testid={`progress-current-chant-${chant.id}`}>
                          <div className="mb-1.5 flex items-center justify-between gap-3">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                              {currentPhase === "leader" ? "Leader" : "Everyone"} timing
                            </span>
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {Math.round(phaseProgress)}%
                            </span>
                          </div>
                          <div
                            className="h-2.5 w-full overflow-hidden rounded-full bg-muted"
                            role="progressbar"
                            aria-label="Current chant timing progress"
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={Math.round(phaseProgress)}
                          >
                            <div
                              className={`h-full rounded-full ${
                                currentPhase === "leader" ? "bg-emerald-500" : "bg-fuchsia-500"
                              }`}
                              style={{
                                transform: `scaleX(${phaseProgress / 100})`,
                                transformOrigin: "left center",
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {isLive && !isCurrent && (
                        <Button
                          size="sm"
                          onClick={() => setCurrentChant.mutate(chant.id)}
                          disabled={setCurrentChant.isPending}
                          data-testid={`button-push-live-${chant.id}`}
                        >
                          <Radio className="w-3.5 h-3.5 mr-1" />
                          Push Live
                        </Button>
                      )}
                      {!isLive && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(chant)}
                            data-testid={`button-edit-chant-${chant.id}`}
                          >
                            <Pencil className="w-4 h-4 text-muted-foreground" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={deleteChant.isPending}
                                data-testid={`button-delete-chant-${chant.id}`}
                              >
                                <Trash2 className="w-4 h-4 text-muted-foreground" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Chant</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this chant? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteChant.mutate(chant.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
