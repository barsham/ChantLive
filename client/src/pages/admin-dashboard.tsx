import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Megaphone, Radio, Archive, Eye, Trash2, Users, LogOut, Upload, Search, X, ClipboardList, Share2, CalendarClock, MapPin, Copy, Hash } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AppVersion } from "@/components/app-version";
import type { Demonstration } from "@shared/schema";
import type { ChangeEvent } from "react";
import { useRef, useState } from "react";

const eventSetupTemplates = [
  { id: "march", label: "March or rally", title: "Community March", durationMinutes: 120, description: "Two-hour outdoor gathering" },
  { id: "vigil", label: "Vigil", title: "Candlelight Vigil", durationMinutes: 60, description: "One-hour reflective event" },
  { id: "prayer", label: "Prayer circle", title: "Community Prayer Circle", durationMinutes: 60, description: "One-hour shared prayer" },
  { id: "community", label: "Community gathering", title: "Community Gathering", durationMinutes: 90, description: "Ninety-minute local event" },
] as const;

const statusFilters = ["all", "live", "draft", "ended"] as const;
type StatusFilter = (typeof statusFilters)[number];
const sortOptions = ["newest", "oldest", "title"] as const;
type SortOption = (typeof sortOptions)[number];
type DashboardDemonstration = Demonstration & {
  creator?: {
    id: string;
    name: string;
    email: string;
  } | null;
};

function statusVariant(status: string) {
  switch (status) {
    case "live":
      return "default";
    case "draft":
      return "secondary";
    case "ended":
      return "outline";
    default:
      return "secondary";
  }
}

function statusIcon(status: string) {
  switch (status) {
    case "live":
      return <Radio className="w-3 h-3" />;
    case "draft":
      return <Archive className="w-3 h-3" />;
    case "ended":
      return null;
    default:
      return null;
  }
}

function formatDashboardSchedule(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatCreationSchedule(value: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return `${new Intl.DateTimeFormat(undefined, {
    dateStyle: "full",
    timeStyle: "short",
  }).format(date)} (${timeZone})`;
}

export default function AdminDashboard() {
  const { user, isSuperAdmin } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [newTitle, setNewTitle] = useState("");
  const [newScheduledAt, setNewScheduledAt] = useState("");
  const [newLocationName, setNewLocationName] = useState("");
  const [newMeetingPoint, setNewMeetingPoint] = useState("");
  const [newArrivalNote, setNewArrivalNote] = useState("");
  const [newDurationMinutes, setNewDurationMinutes] = useState(120);
  const [selectedSetupTemplate, setSelectedSetupTemplate] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Demonstration | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const { data: demos, isLoading } = useQuery<DashboardDemonstration[]>({
    queryKey: ["/api/demos"],
  });

  const createDemo = useMutation({
    mutationFn: async (payload: { title: string; scheduledAt: string; locationName: string; meetingPoint: string; arrivalNote: string; eventDurationMinutes: number }) => {
      const res = await apiRequest("POST", "/api/demos", payload);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/demos"] });
      setDialogOpen(false);
      setNewTitle("");
      setNewScheduledAt("");
      setNewLocationName("");
      setNewMeetingPoint("");
      setNewArrivalNote("");
      setNewDurationMinutes(120);
      setSelectedSetupTemplate(null);
      navigate(`/admin/demos/${data.id}`);
    },
    onError: (err: Error) => {
      toast({ title: "Error creating demonstration", description: err.message, variant: "destructive" });
    },
  });

  const deleteDemo = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/demos/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/demos"] });
      setDeleteTarget(null);
      toast({ title: "Demonstration deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error deleting demonstration", description: err.message, variant: "destructive" });
    },
  });

  const importDemo = useMutation({
    mutationFn: async (payload: unknown) => {
      const res = await apiRequest("POST", "/api/demos/import", payload);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/demos"] });

      const skippedAdmins = Array.isArray(data.skippedAdminEmails) ? data.skippedAdminEmails.length : 0;
      const importedAdmins = Array.isArray(data.importedAdminEmails) ? data.importedAdminEmails.length : 0;
      const importedChants = typeof data.importedChants === "number" ? data.importedChants : 0;

      toast({
        title: "Demonstration imported",
        description: skippedAdmins > 0
          ? `${importedChants} chants restored. ${importedAdmins} admins matched in this portal, ${skippedAdmins} could not be added.`
          : `${importedChants} chants restored${importedAdmins > 0 ? ` and ${importedAdmins} admins matched in this portal.` : "."}`,
      });

      if (data.demo?.id) {
        navigate(`/admin/demos/${data.demo.id}`);
      }
    },
    onError: (err: Error) => {
      toast({ title: "Error importing demonstration", description: err.message, variant: "destructive" });
    },
  });

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    createDemo.mutate({
      title: newTitle.trim(),
      scheduledAt: newScheduledAt ? new Date(newScheduledAt).toISOString() : "",
      locationName: newLocationName.trim(),
      meetingPoint: newMeetingPoint.trim(),
      arrivalNote: newArrivalNote.trim(),
      eventDurationMinutes: newDurationMinutes,
    });
  };

  const applyEventSetupTemplate = (template: (typeof eventSetupTemplates)[number]) => {
    setNewTitle(template.title);
    setNewDurationMinutes(template.durationMinutes);
    setSelectedSetupTemplate(template.id);
  };

  const copyParticipantAccess = async (demo: DashboardDemonstration, kind: "link" | "code") => {
    const value = kind === "link" ? `${window.location.origin}/d/${demo.publicId}` : demo.publicId;
    try {
      await navigator.clipboard.writeText(value);
      toast({
        title: kind === "link" ? "Participant link copied" : "Join code copied",
        description: kind === "link"
          ? "Ready to paste into a message or accessibility fallback."
          : `Share ${demo.publicId} with participants who cannot scan the QR code.`,
      });
    } catch {
      toast({
        title: "Could not copy participant access",
        description: "Open the event and copy the participant link from its sharing panel.",
        variant: "destructive",
      });
    }
  };

  const demoStats = {
    total: demos?.length ?? 0,
    live: demos?.filter((demo) => demo.status === "live").length ?? 0,
    draft: demos?.filter((demo) => demo.status === "draft").length ?? 0,
    ended: demos?.filter((demo) => demo.status === "ended").length ?? 0,
  };
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredDemos = (demos ?? [])
    .filter((demo) => {
      const matchesStatus = statusFilter === "all" || demo.status === statusFilter;
      const creatorName = demo.creator?.name.toLowerCase() ?? "";
      const creatorEmail = demo.creator?.email.toLowerCase() ?? "";
      const matchesSearch = !normalizedSearch ||
        demo.title.toLowerCase().includes(normalizedSearch) ||
        demo.createdBy.toLowerCase().includes(normalizedSearch) ||
        creatorName.includes(normalizedSearch) ||
        creatorEmail.includes(normalizedSearch);
      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => {
      if (sortOption === "title") {
        return a.title.localeCompare(b.title);
      }

      const aCreatedAt = new Date(a.createdAt).getTime();
      const bCreatedAt = new Date(b.createdAt).getTime();
      return sortOption === "oldest" ? aCreatedAt - bCreatedAt : bCreatedAt - aCreatedAt;
    });
  const hasActiveFilters = normalizedSearch.length > 0 || statusFilter !== "all";
  const sortLabel = sortOption === "newest"
    ? "Newest first"
    : sortOption === "oldest"
      ? "Oldest first"
      : "Title A-Z";

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
  };

  const handleImportClick = () => {
    importInputRef.current?.click();
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    try {
      const contents = await file.text();
      importDemo.mutate(JSON.parse(contents));
    } catch {
      toast({
        title: "Invalid import file",
        description: "Please choose a valid ChantLive demonstration export JSON file.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-2 text-xl font-bold"><Megaphone className="w-6 h-6 text-orange-500" />ChantLive</span>
            <Badge variant="secondary" className="text-xs">Admin</Badge>
            <AppVersion />
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {isSuperAdmin && (
              <Button variant="outline" size="sm" onClick={() => navigate("/admin/users")} data-testid="button-manage-admins">
                <Users className="w-4 h-4 mr-1" />
                Manage Admins
              </Button>
            )}
            <span className="text-sm text-muted-foreground hidden sm:inline">{user?.name}</span>
            <Button variant="ghost" size="icon" asChild data-testid="button-logout">
              <a href="/auth/logout">
                <LogOut className="w-4 h-4" />
              </a>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-dashboard-title">Demonstrations</h1>
            <p className="text-sm text-muted-foreground mt-1">Create and manage your live chant demonstrations</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleImportFile}
            />
            <Button
              variant="outline"
              onClick={handleImportClick}
              disabled={importDemo.isPending}
              data-testid="button-import-demo"
            >
              <Upload className="w-4 h-4 mr-1" />
              {importDemo.isPending ? "Importing..." : "Import Demonstration"}
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-demo">
                  <Plus className="w-4 h-4 mr-1" />
                  New Demonstration
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Demonstration</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="demo-title">Title</Label>
                    <Input
                      id="demo-title"
                      placeholder="e.g., Climate March 2026"
                      value={newTitle}
                      onChange={(e) => {
                        setNewTitle(e.target.value);
                        setSelectedSetupTemplate(null);
                      }}
                      onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                      data-testid="input-demo-title"
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="new-demo-scheduled-at" className="flex items-center gap-1.5">
                        <CalendarClock className="h-3.5 w-3.5" />
                        Date and time <span className="font-normal text-muted-foreground">(optional)</span>
                      </Label>
                      <Input
                        id="new-demo-scheduled-at"
                        type="datetime-local"
                        value={newScheduledAt}
                        onChange={(event) => setNewScheduledAt(event.target.value)}
                        data-testid="input-new-demo-scheduled-at"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-demo-location" className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        Venue <span className="font-normal text-muted-foreground">(optional)</span>
                      </Label>
                      <Input
                        id="new-demo-location"
                        value={newLocationName}
                        onChange={(event) => setNewLocationName(event.target.value)}
                        maxLength={160}
                        placeholder="Main hall, north lawn..."
                        data-testid="input-new-demo-location"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-demo-duration" className="flex items-center gap-1.5">
                        <CalendarClock className="h-3.5 w-3.5" />
                        Duration
                      </Label>
                      <Input
                        id="new-demo-duration"
                        type="number"
                        min={15}
                        max={300}
                        step={15}
                        value={newDurationMinutes}
                        onChange={(event) => {
                          setNewDurationMinutes(Math.min(300, Math.max(15, Number(event.target.value) || 15)));
                          setSelectedSetupTemplate(null);
                        }}
                        aria-describedby="new-demo-duration-help"
                        data-testid="input-new-demo-duration"
                      />
                      <p id="new-demo-duration-help" className="text-xs text-muted-foreground">Minutes, 15 to 300</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-demo-meeting-point">Meeting point <span className="font-normal text-muted-foreground">(optional)</span></Label>
                      <Input
                        id="new-demo-meeting-point"
                        value={newMeetingPoint}
                        onChange={(event) => setNewMeetingPoint(event.target.value)}
                        maxLength={240}
                        placeholder="East entrance, information desk..."
                        data-testid="input-new-demo-meeting-point"
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="new-demo-arrival-note">Arrival guidance <span className="font-normal text-muted-foreground">(optional)</span></Label>
                      <Textarea
                        id="new-demo-arrival-note"
                        value={newArrivalNote}
                        onChange={(event) => setNewArrivalNote(event.target.value)}
                        maxLength={500}
                        rows={2}
                        placeholder="Arrive 15 minutes early; step-free access is beside the main gate..."
                        data-testid="input-new-demo-arrival-note"
                      />
                    </div>
                  </div>
                  {newScheduledAt && formatCreationSchedule(newScheduledAt) && (
                    <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950" role="status" data-testid="preview-new-demo-schedule">
                      <p className="font-medium">Schedule check</p>
                      <p className="mt-1">{formatCreationSchedule(newScheduledAt)}</p>
                      <p className="mt-1 text-xs text-sky-800">Calendar invites will reserve {newDurationMinutes} minutes. Times are saved from your current timezone.</p>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Adding logistics now makes calendar invites, handouts, and participant arrival details ready sooner.
                  </p>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Start from an event type</p>
                    <div className="grid gap-2 sm:grid-cols-2" aria-label="Event setup starters">
                      {eventSetupTemplates.map((template) => (
                        <Button
                          key={template.id}
                          type="button"
                          variant={selectedSetupTemplate === template.id ? "secondary" : "outline"}
                          className="h-auto items-start justify-start px-3 py-2 text-left"
                          onClick={() => applyEventSetupTemplate(template)}
                          aria-pressed={selectedSetupTemplate === template.id}
                          data-testid={`button-event-template-${template.id}`}
                        >
                          <span>
                            <span className="block text-sm font-medium">{template.label}</span>
                            <span className="block text-xs font-normal text-muted-foreground">{template.description}</span>
                          </span>
                        </Button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground" role="status" aria-live="polite" data-testid="text-selected-event-template">
                      {selectedSetupTemplate
                        ? "Starter applied. You can adjust the title, duration, date, or venue before creating."
                        : "Choose a starter to fill a practical title and duration, or enter your own details."}
                    </p>
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleCreate}
                    disabled={!newTitle.trim() || createDemo.isPending}
                    data-testid="button-confirm-create"
                  >
                    {createDemo.isPending ? "Creating..." : "Create Demonstration"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card className="mb-6 border-primary/20 bg-primary/5" data-testid="card-dashboard-quick-start">
          <CardContent className="py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-medium">Quick start for a live event</p>
                <p className="text-xs text-muted-foreground">
                  Create a demonstration, add chants, test the participant page on a phone, then share the QR code before going live.
                </p>
              </div>
              <Button size="sm" onClick={() => setDialogOpen(true)} data-testid="button-quick-start-create">
                <Plus className="w-3.5 h-3.5 mr-1" />
                Start a demonstration
              </Button>
            </div>
          </CardContent>
        </Card>

        {!isLoading && demos && demos.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6" aria-label="Demonstration status summary">
            <Card>
              <CardContent className="py-4">
                <p className="text-xs text-muted-foreground">Total events</p>
                <p className="text-2xl font-semibold" data-testid="stat-total-demos">{demoStats.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <p className="text-xs text-muted-foreground">Live now</p>
                <p className="text-2xl font-semibold text-primary" data-testid="stat-live-demos">{demoStats.live}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <p className="text-xs text-muted-foreground">Drafts</p>
                <p className="text-2xl font-semibold" data-testid="stat-draft-demos">{demoStats.draft}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <p className="text-xs text-muted-foreground">Ended</p>
                <p className="text-2xl font-semibold" data-testid="stat-ended-demos">{demoStats.ended}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {!isLoading && demos && demos.length > 0 && (
          <Card className="mb-6">
            <CardContent className="py-4 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search demonstrations by title, creator, or email..."
                  className="pl-9 pr-9"
                  aria-label="Search demonstrations by title, creator, or email"
                  data-testid="input-search-demos"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                    onClick={() => setSearchTerm("")}
                    aria-label="Clear search"
                    data-testid="button-clear-search"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2" aria-label="Filter demonstrations by status">
                  {statusFilters.map((status) => (
                    <Button
                      key={status}
                      variant={statusFilter === status ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStatusFilter(status)}
                      data-testid={`button-filter-${status}`}
                    >
                      {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
                    </Button>
                  ))}
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} data-testid="button-clear-filters">
                      Clear filters
                    </Button>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" data-testid="button-sort-demos">
                      Sort: {sortLabel}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setSortOption("newest")}>Newest first</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortOption("oldest")}>Oldest first</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortOption("title")}>Title A-Z</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <p className="text-xs text-muted-foreground" role="status" aria-live="polite" data-testid="text-demo-result-count">
                Showing {filteredDemos.length} of {demoStats.total} demonstrations
              </p>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-3">
                  <Skeleton className="h-5 w-3/4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-1/2 mb-2" />
                  <Skeleton className="h-8 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : demos && demos.length > 0 ? (
          filteredDemos.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDemos.map((demo) => (
              <Card key={demo.id} className="hover-elevate cursor-pointer" onClick={() => navigate(`/admin/demos/${demo.id}`)} data-testid={`card-demo-${demo.id}`}>
                <CardHeader className="pb-3 flex flex-row items-start justify-between gap-2">
                  <CardTitle className="text-base font-semibold leading-snug">{demo.title}</CardTitle>
                  <Badge variant={statusVariant(demo.status)} className="shrink-0">
                    {statusIcon(demo.status)}
                    <span className="ml-1">{demo.status}</span>
                  </Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Created {new Date(demo.createdAt).toLocaleDateString()}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground" data-testid={`text-demo-created-by-${demo.id}`}>
                    Created by: <span className="font-medium text-foreground">{demo.creator?.name ?? "Unknown user"}</span>
                    {demo.creator?.email ? <span> ({demo.creator.email})</span> : null}
                  </p>
                  {(demo.scheduledAt || demo.locationName) && (
                    <div className="mt-3 space-y-1 rounded-lg border bg-muted/30 p-2 text-xs text-muted-foreground" data-testid={`text-demo-logistics-${demo.id}`}>
                      {demo.scheduledAt && (
                        <p className="flex items-center gap-1.5">
                          <CalendarClock className="h-3.5 w-3.5" />
                          <span>{formatDashboardSchedule(demo.scheduledAt)}</span>
                        </p>
                      )}
                      {demo.locationName && (
                        <p className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" />
                          <span>{demo.locationName}</span>
                        </p>
                      )}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <Button className="w-full justify-center" variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/admin/demos/${demo.id}/command`); }} data-testid={`button-command-demo-${demo.id}`}>
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      Command
                    </Button>
                    <Button className="w-full justify-center" variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/admin/demos/${demo.id}/plan`); }} data-testid={`button-plan-demo-${demo.id}`}>
                      <ClipboardList className="w-3.5 h-3.5 mr-1" />
                      Plan
                    </Button>
                    <Button className="w-full justify-center" variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/admin/demos/${demo.id}/share-kit`); }} data-testid={`button-share-kit-demo-${demo.id}`}>
                      <Share2 className="w-3.5 h-3.5 mr-1" />
                      Share
                    </Button>
                    <Button className="w-full justify-center" variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); void copyParticipantAccess(demo, "link"); }} data-testid={`button-copy-link-demo-${demo.id}`}>
                      <Copy className="w-3.5 h-3.5 mr-1" />
                      Copy link
                    </Button>
                    <Button className="w-full justify-center" variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); void copyParticipantAccess(demo, "code"); }} data-testid={`button-copy-code-demo-${demo.id}`}>
                      <Hash className="w-3.5 h-3.5 mr-1" />
                      Copy code
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-center text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700" onClick={(e) => { e.stopPropagation(); setDeleteTarget(demo); }} data-testid={`button-delete-demo-${demo.id}`}>
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Search className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-1">No demonstrations match your filters</h3>
                <p className="text-sm text-muted-foreground mb-4">Try a different title search or status filter.</p>
                <Button variant="outline" onClick={clearFilters} data-testid="button-empty-clear-filters">
                  Clear filters
                </Button>
              </CardContent>
            </Card>
          )
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Megaphone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-1">No demonstrations yet</h3>
              <p className="text-sm text-muted-foreground mb-4">Create your first demonstration to get started.</p>
              <Button onClick={() => setDialogOpen(true)} data-testid="button-empty-create">
                <Plus className="w-4 h-4 mr-1" />
                Create Demonstration
              </Button>
            </CardContent>
          </Card>
        )}
      </main>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Demonstration</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>"{deleteTarget?.title}"</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteTarget && deleteDemo.mutate(deleteTarget.id)}
              disabled={deleteDemo.isPending}
            >
              {deleteDemo.isPending ? "Deleting..." : "Yes"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
