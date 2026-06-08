import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AppVersion } from "@/components/app-version";
import { publicReleases, type ChangelogItemType } from "@shared/changelog";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Megaphone,
  Sparkles,
  Wrench,
} from "lucide-react";
import { Link } from "wouter";

const TYPE_META: Record<
  ChangelogItemType,
  { label: string; className: string; icon: React.ComponentType<{ className?: string }> }
> = {
  feature: {
    label: "New",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    icon: Sparkles,
  },
  improvement: {
    label: "Improved",
    className: "border-blue-200 bg-blue-50 text-blue-700",
    icon: Wrench,
  },
  fix: {
    label: "Fixed",
    className: "border-rose-200 bg-rose-50 text-rose-700",
    icon: CheckCircle2,
  },
  docs: {
    label: "Docs",
    className: "border-amber-200 bg-amber-50 text-amber-800",
    icon: BookOpen,
  },
  breaking: {
    label: "Breaking",
    className: "border-red-200 bg-red-50 text-red-700",
    icon: CircleAlert,
  },
  internal: {
    label: "Internal",
    className: "border-muted bg-muted text-muted-foreground",
    icon: Wrench,
  },
};

function formatDate(date: string | null) {
  if (!date) {
    return "Unreleased";
  }

  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00.000Z`));
}

export default function Changelog() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <Link
            href="/"
            className="flex items-center gap-2 text-xl font-bold"
            data-testid="link-brand-home"
          >
            <Megaphone className="w-6 h-6 text-orange-500" />
            ChantLive
            <AppVersion />
          </Link>
          <Button variant="outline" asChild data-testid="button-back-home">
            <Link href="/">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Home
            </Link>
          </Button>
        </div>
      </header>

      <main className="px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <div className="max-w-2xl mb-10">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
              ChantLive changelog
            </h1>
            <p className="text-muted-foreground">
              Public release notes for new features, improvements, fixes, and documentation updates.
            </p>
          </div>

          <div className="space-y-8">
            {publicReleases.map((release) => (
              <section
                key={release.version}
                className="border-t pt-8"
                aria-labelledby={`release-${release.version}`}
              >
                <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
                  <div>
                    <h2
                      id={`release-${release.version}`}
                      className="text-2xl font-semibold tracking-tight"
                    >
                      {release.version}
                    </h2>
                    <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                      <CalendarDays className="w-4 h-4" />
                      {formatDate(release.releasedAt)}
                    </div>
                  </div>
                  <Badge variant="secondary" className="rounded-md">
                    {release.items.length} changes
                  </Badge>
                </div>

                <p className="text-sm text-muted-foreground mb-5 max-w-3xl">
                  {release.summary}
                </p>

                <div className="grid gap-3">
                  {release.items.map((item) => {
                    const meta = TYPE_META[item.type];
                    const Icon = meta.icon;

                    return (
                      <Card key={item.id} className="rounded-md">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 w-8 h-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <h3 className="font-semibold">{item.title}</h3>
                                <Badge
                                  variant="outline"
                                  className={`rounded-md ${meta.className}`}
                                >
                                  {meta.label}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {item.description}
                              </p>
                              {item.links.length > 0 ? (
                                <div className="mt-3 flex gap-3 flex-wrap text-sm">
                                  {item.links.map((link) => (
                                    <a
                                      key={link.url}
                                      href={link.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="underline underline-offset-4"
                                    >
                                      {link.label}
                                    </a>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
