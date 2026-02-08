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
import { Separator } from "@/components/ui/separator";
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
  Megaphone,
  ArrowLeft,
  Plus,
  Trash2,
  Radio,
  Square,
  QrCode,
  ExternalLink,
  GripVertical,
  Check,
  Copy,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Demonstration, Chant, DemoState } from "@shared/schema";
import { useState, useEffect, useCallback } from "react";

type DemoDetail = {
  demo: Demonstration;
  chants: Chant[];
  state: DemoState | null;
  viewerCount: number;
};

export default function DemoEditor() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [newChantText, setNewChantText] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const { data, isLoading, refetch } = useQuery<DemoDetail>({
    queryKey: ["/api/demos", id],
    refetchInterval: 5000,
  });

  const demo = data?.demo;
  const chantsList = data?.chants ?? [];
  const state = data?.state;
  const viewerCount = data?.viewerCount ?? 0;

  const addChant = useMutation({
    mutationFn: async (text: string) => {
      await apiRequest("POST", `/api/demos/${id}/chants`, { text });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/demos", id] });
      setAddDialogOpen(false);
      setNewChantText("");
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
                <h1 className="font-semibold text-lg" data-testid="text-demo-title">{demo.title}</h1>
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

            {isDraft && (
              <Button onClick={() => goLive.mutate()} disabled={goLive.isPending || chantsList.length === 0} data-testid="button-go-live">
                <Radio className="w-4 h-4 mr-1" />
                {goLive.isPending ? "Going live..." : "Go Live"}
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
                      This will stop the live feed for all participants. This cannot be undone.
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
                    <Label htmlFor="chant-text">Chant Text</Label>
                    <Textarea
                      id="chant-text"
                      placeholder="Enter the chant text..."
                      value={newChantText}
                      onChange={(e) => setNewChantText(e.target.value)}
                      className="resize-none"
                      rows={3}
                      data-testid="input-chant-text"
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => addChant.mutate(newChantText.trim())}
                    disabled={!newChantText.trim() || addChant.isPending}
                    data-testid="button-confirm-add-chant"
                  >
                    {addChant.isPending ? "Adding..." : "Add Chant"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

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
                      <p className="text-sm font-medium break-words" data-testid={`text-chant-${chant.id}`}>
                        {chant.text}
                      </p>
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
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteChant.mutate(chant.id)}
                          disabled={deleteChant.isPending}
                          data-testid={`button-delete-chant-${chant.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-muted-foreground" />
                        </Button>
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
