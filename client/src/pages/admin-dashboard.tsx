import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, Megaphone, Radio, Archive, Eye, Trash2, Users, LogOut, Upload } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AppVersion } from "@/components/app-version";
import type { Demonstration } from "@shared/schema";
import type { ChangeEvent } from "react";
import { useRef, useState } from "react";

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

export default function AdminDashboard() {
  const { user, isSuperAdmin } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [newTitle, setNewTitle] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Demonstration | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const { data: demos, isLoading } = useQuery<Demonstration[]>({
    queryKey: ["/api/demos"],
  });

  const createDemo = useMutation({
    mutationFn: async (title: string) => {
      const res = await apiRequest("POST", "/api/demos", { title });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/demos"] });
      setDialogOpen(false);
      setNewTitle("");
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
    createDemo.mutate(newTitle.trim());
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
              <DialogContent>
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
                      onChange={(e) => setNewTitle(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                      data-testid="input-demo-title"
                    />
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
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {demos.map((demo) => (
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
                  <div className="flex items-center gap-2 mt-3">
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/admin/demos/${demo.id}`); }} data-testid={`button-edit-demo-${demo.id}`}>
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      {demo.status === "live" ? "Control" : "Edit"}
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700" onClick={(e) => { e.stopPropagation(); setDeleteTarget(demo); }} data-testid={`button-delete-demo-${demo.id}`}>
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
