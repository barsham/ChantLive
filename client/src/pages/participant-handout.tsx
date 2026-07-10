import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Copy, ExternalLink, Printer, QrCode, Share2 } from "lucide-react";
import type { Demonstration } from "@shared/schema";

type DemoDetail = {
  demo: Demonstration;
};

export default function ParticipantHandout() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery<DemoDetail>({
    queryKey: ["/api/demos", id],
  });

  const demo = data?.demo;
  const publicUrl = demo ? `${window.location.origin}/d/${demo.publicId}` : "";
  const supportLabel = demo?.supportLabel || "Support this event";

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    fetch(`/api/demos/${id}/qrcode`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setQrDataUrl(data.qrDataUrl ?? "");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setQrDataUrl("");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const copyLink = async () => {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLink = async () => {
    if (!publicUrl) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: demo?.title ?? "ChantLive participant link",
          text: "Open this ChantLive participant page and keep it open during the event.",
          url: publicUrl,
        });
        return;
      } catch {
        // Fall back to copying if native share is cancelled or unavailable.
      }
    }

    copyLink();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="mx-auto max-w-3xl space-y-4">
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-[620px] w-full" />
        </div>
      </div>
    );
  }

  if (!demo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="mb-4 text-muted-foreground">Demonstration not found.</p>
            <Button variant="outline" onClick={() => navigate("/admin")}>Back to dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="no-print border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/demos/${id}`)} data-testid="button-back-editor">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to event
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={copyLink} data-testid="button-copy-handout-link">
              <Copy className="mr-1 h-4 w-4" />
              {copied ? "Copied" : "Copy link"}
            </Button>
            <Button variant="outline" size="sm" onClick={shareLink} data-testid="button-share-handout-link">
              <Share2 className="mr-1 h-4 w-4" />
              Share
            </Button>
            <Button size="sm" onClick={() => window.print()} data-testid="button-print-handout-page">
              <Printer className="mr-1 h-4 w-4" />
              Print handout
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <Card className="no-print mb-6 border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <p className="text-sm font-medium">Participant handout preview</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Print this page, project it, or share the link. It is designed as a fallback for people who cannot scan the QR code.
            </p>
          </CardContent>
        </Card>

        <section className="mx-auto max-w-2xl rounded-2xl border bg-card p-8 text-center shadow-sm print-handout-page" data-testid="section-participant-handout">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
            <QrCode className="h-3.5 w-3.5" />
            ChantLive participant link
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{demo.title}</h1>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">
            Scan the QR code or open the link below to follow the live chants on your phone.
          </p>

          <div className="my-8 flex justify-center">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt={`QR code for joining ${demo.title}`} className="h-72 w-72" data-testid="img-handout-qr" />
            ) : (
              <Skeleton className="h-72 w-72" />
            )}
          </div>

          <p className="break-all rounded-lg border bg-background p-3 text-sm font-medium" data-testid="text-handout-url">
            {publicUrl}
          </p>

          {demo.supportUrl && (
            <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-left text-emerald-950" data-testid="card-handout-support-action">
              <p className="text-sm font-semibold">Optional organizer action</p>
              <p className="mt-1 text-sm">
                After joining the chant page, participants can also open: <span className="font-semibold">{supportLabel}</span>
              </p>
              <p className="mt-2 break-all rounded-lg border border-emerald-200 bg-white p-3 text-sm font-medium" data-testid="text-handout-support-url">
                {demo.supportUrl}
              </p>
            </div>
          )}

          <div className="mt-6 grid gap-3 text-left text-sm text-muted-foreground sm:grid-cols-3">
            <p className="rounded-lg border bg-background p-3">1. Open your camera and scan.</p>
            <p className="rounded-lg border bg-background p-3">2. Keep the page open during the event.</p>
            <p className="rounded-lg border bg-background p-3">3. If scanning fails, type the link.</p>
          </div>

          <Button variant="outline" className="no-print mt-6" asChild>
            <a href={publicUrl} target="_blank" rel="noopener noreferrer" data-testid="link-open-handout-public">
              <ExternalLink className="mr-1 h-4 w-4" />
              Open participant page
            </a>
          </Button>
        </section>
      </main>
    </div>
  );
}
