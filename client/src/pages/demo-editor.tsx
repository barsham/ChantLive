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
  X,
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

export default function DemoEditor() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [newCallText, setNewCallText] = useState("");
  const [newResponseText, setNewResponseText] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingChant, setEditingChant] = useState<Chant | null>(null);
  const [editCallText, setEditCallText] = useState("");
  const [editResponseText, setEditResponseText] = useState("");

  const [rotationInterval, setRotationInterval] = useState(60);
  const [cycleCount, setCycleCount] = useState(1);
  const [leaderDuration, setLeaderDuration] = useState(4);
  const [peopleDuration, setPeopleDuration] = useState(3);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);

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

  useEffect(() => {
    if (!state) return;
    if (state.rotationInterval) setRotationInterval(state.rotationInterval);
    if (state.cycleCount) setCycleCount(state.cycleCount);
    if (state.leaderDuration) setLeaderDuration(state.leaderDuration);
    if (state.peopleDuration) setPeopleDuration(state.peopleDuration);
  }, [state]);

  const addChant = useMutation({
    mutationFn: async ({ callText, responseText }: { callText: string; responseText: string }) => {
      await apiRequest("POST", `/api/demos/${id}/chants`, { callText, responseText });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/demos", id] });
      setAddDialogOpen(false);
      setNewCallText("");
      setNewResponseText("");
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const editChant = useMutation({
    mutationFn: async ({ chantId, callText, responseText }: { chantId: string; callText: string; responseText: string }) => {
      await apiRequest("PATCH", `/api/demos/${id}/chants/${chantId}`, { callText, responseText });
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
        cycleCount,
        leaderDuration,
        peopleDuration,
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
        cycleCount,
        leaderDuration,
        peopleDuration,
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


  const updateCycleSettings = useMutation({
    mutationFn: async ({ cycles, leaderSec, peopleSec }: { cycles: number; leaderSec: number; peopleSec: number }) => {
      await apiRequest("POST", `/api/demos/${id}/auto-rotate`, {
        autoRotate,
        rotationInterval,
        cycleCount: cycles,
        leaderDuration: leaderSec,
        peopleDuration: peopleSec,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/demos", id] });
      toast({ title: "Cycle settings updated" });
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
    setEditDialogOpen(true);
  };

  const publicUrl = demo ? `${window.location.origin}/d/${demo.publicId}` : "";

  const copyUrl = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  const isLive = demo.status === "live";
  const isDraft = demo.status === "draft";
  const isEnded = demo.status === "ended";

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
            <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-qr">
                  <QrCode className="w-4 h-4 mr-1" />
                  QR Code
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Participant QR Code</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center gap-4 py-4">
                  {qrDataUrl ? (
                    <img src={qrDataUrl} alt="QR Code" className="w-64 h-64" data-testid="img-qr" />
                  ) : (
                    <Skeleton className="w-64 h-64" />
                  )}
                  <div className="flex items-center gap-2 w-full">
                    <Input value={publicUrl} readOnly className="text-xs" data-testid="input-public-url" />
                    <Button variant="outline" size="icon" onClick={copyUrl} data-testid="button-copy-url">
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <a href={publicUrl} target="_blank" rel="noopener noreferrer" data-testid="link-open-public">
                      <ExternalLink className="w-4 h-4 mr-1" />
                      Open participant page
                    </a>
                  </Button>
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
        {(isLive || isDraft || isEnded) && (
          <Card className="mb-6">
            <CardContent className="py-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <RotateCw className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Auto-rotation</p>
                    <p className="text-xs text-muted-foreground">
                      {autoRotate ? "Cycling through chants automatically" : "Manually control which chant is shown"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Timer className="w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      type="number"
                      min={5}
                      max={300}
                      value={rotationInterval}
                      onChange={(e) => setRotationInterval(Number(e.target.value))}
                      onBlur={() => {
                        const val = Math.max(5, Math.min(300, rotationInterval));
                        setRotationInterval(val);
                        if (val !== state?.rotationInterval) {
                          updateRotationInterval.mutate(val);
                        }
                      }}
                      className="w-20 text-sm"
                      data-testid="input-rotation-interval"
                    />
                    <span className="text-xs text-muted-foreground">sec</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Cycles</span>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={cycleCount}
                      onChange={(e) => setCycleCount(Number(e.target.value))}
                      onBlur={() => {
                        const nextCycles = Math.max(1, Math.min(10, cycleCount));
                        const nextLeader = Math.max(1, Math.min(30, leaderDuration));
                        const nextPeople = Math.max(1, Math.min(30, peopleDuration));
                        setCycleCount(nextCycles);
                        setLeaderDuration(nextLeader);
                        setPeopleDuration(nextPeople);
                        if (
                          nextCycles !== state?.cycleCount ||
                          nextLeader !== state?.leaderDuration ||
                          nextPeople !== state?.peopleDuration
                        ) {
                          updateCycleSettings.mutate({ cycles: nextCycles, leaderSec: nextLeader, peopleSec: nextPeople });
                        }
                      }}
                      className="w-16 text-sm"
                      data-testid="input-cycle-count"
                    />
                    <span className="text-xs text-muted-foreground">Leader sec</span>
                    <Input type="number" min={1} max={30} value={leaderDuration} onChange={(e) => setLeaderDuration(Number(e.target.value))} onBlur={() => {
                      const nextCycles = Math.max(1, Math.min(10, cycleCount));
                      const nextLeader = Math.max(1, Math.min(30, leaderDuration));
                      const nextPeople = Math.max(1, Math.min(30, peopleDuration));
                      if (nextCycles !== state?.cycleCount || nextLeader !== state?.leaderDuration || nextPeople !== state?.peopleDuration) {
                        updateCycleSettings.mutate({ cycles: nextCycles, leaderSec: nextLeader, peopleSec: nextPeople });
                      }
                    }} className="w-16 text-sm" data-testid="input-leader-duration" />
                    <span className="text-xs text-muted-foreground">People sec</span>
                    <Input type="number" min={1} max={30} value={peopleDuration} onChange={(e) => setPeopleDuration(Number(e.target.value))} onBlur={() => {
                      const nextCycles = Math.max(1, Math.min(10, cycleCount));
                      const nextLeader = Math.max(1, Math.min(30, leaderDuration));
                      const nextPeople = Math.max(1, Math.min(30, peopleDuration));
                      if (nextCycles !== state?.cycleCount || nextLeader !== state?.leaderDuration || nextPeople !== state?.peopleDuration) {
                        updateCycleSettings.mutate({ cycles: nextCycles, leaderSec: nextLeader, peopleSec: nextPeople });
                      }
                    }} className="w-16 text-sm" data-testid="input-people-duration" />
                  </div>
                  <Button
                    variant={autoRotate ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleAutoRotate.mutate(!autoRotate)}
                    disabled={toggleAutoRotate.isPending}
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
          {!isEnded && (
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
                  <Button
                    className="w-full"
                    onClick={() => addChant.mutate({ callText: newCallText.trim(), responseText: newResponseText.trim() })}
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
              <Button
                className="w-full"
                onClick={() => {
                  if (editingChant) {
                    editChant.mutate({
                      chantId: editingChant.id,
                      callText: editCallText.trim(),
                      responseText: editResponseText.trim(),
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
                      {!isEnded && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(chant)}
                            data-testid={`button-edit-chant-${chant.id}`}
                          >
                            <Pencil className="w-4 h-4 text-muted-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteChant.mutate(chant.id)}
                            disabled={deleteChant.isPending}
                            data-testid={`button-delete-chant-${chant.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-muted-foreground" />
                          </Button>
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
