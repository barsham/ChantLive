import { AppVersion } from "@/components/app-version";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, CheckCircle2, Link as LinkIcon, Megaphone, QrCode, Shield, Smartphone, Users, Zap } from "lucide-react";
import { Link } from "wouter";

const useCases = [
  "Demonstrations and rallies",
  "Marches and campus actions",
  "Prayer circles and vigils",
  "Community meetings and gatherings",
];

const organizerBenefits = [
  {
    title: "Prepare chants before the event",
    description: "Build a clear call-and-response list so organisers are not improvising from paper notes in a crowd.",
    icon: Megaphone,
  },
  {
    title: "Share one participant link",
    description: "People join from a QR code or URL in their mobile browser without installing an app or creating an account.",
    icon: QrCode,
  },
  {
    title: "Control the live screen",
    description: "Push the current chant to every participant and change prompts as the event moves.",
    icon: Zap,
  },
  {
    title: "Support backup admins",
    description: "Invite trusted admins so the session can keep running if one organiser loses signal or battery.",
    icon: Users,
  },
];

export default function ForOrganizers() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold" data-testid="link-brand-home">
            <Megaphone className="w-6 h-6 text-orange-500" />
            ChantLive
            <AppVersion />
          </Link>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="ghost" asChild data-testid="link-about">
              <Link href="/about">About</Link>
            </Button>
            <Button variant="ghost" asChild data-testid="link-changelog">
              <Link href="/changelog">Changelog</Link>
            </Button>
            <Button asChild data-testid="button-create-account">
              <Link href="/register">
                Create account
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="px-4 py-16 md:py-20">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-6">
              <Smartphone className="h-4 w-4" />
              Mobile-first chant coordination for real events
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-5">
              Run live chants without printing sheets or shouting instructions
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              ChantLive helps organisers prepare chant lists, share a QR code, and push live call-and-response prompts to participant phones during demonstrations, prayers, vigils, marches, and community gatherings.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Button size="lg" asChild data-testid="button-start-organizing">
                <Link href="/register">
                  Start organising
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild data-testid="button-view-source">
                <a href="https://github.com/barsham/ChantLive" target="_blank" rel="noopener noreferrer">
                  View open-source project
                </a>
              </Button>
            </div>
          </div>
        </section>

        <section className="border-t px-4 py-14">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-semibold text-center mb-8">Built for organisers who need a reliable shared prompt</h2>
            <div className="grid gap-4 md:grid-cols-4">
              {organizerBenefits.map((benefit) => {
                const Icon = benefit.icon;

                return (
                  <Card key={benefit.title}>
                    <CardContent className="pt-6">
                      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="font-semibold mb-2">{benefit.title}</h3>
                      <p className="text-sm text-muted-foreground">{benefit.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-t px-4 py-14">
          <div className="max-w-5xl mx-auto grid gap-8 md:grid-cols-[1fr_1.2fr] md:items-center">
            <div>
              <h2 className="text-2xl font-semibold mb-3">Useful for public, faith, and community events</h2>
              <p className="text-sm text-muted-foreground">
                The product is intentionally simple: organisers control the live chant, participants only need a link, and the page stays readable on mobile screens.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {useCases.map((useCase) => (
                <div key={useCase} className="flex items-center gap-2 rounded-lg border bg-card p-4 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  {useCase}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t px-4 py-14">
          <div className="max-w-4xl mx-auto rounded-2xl border bg-card p-6 md:p-8 text-center">
            <Shield className="h-8 w-8 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-3">Privacy-conscious by default</h2>
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto mb-5">
              Participants do not sign in. Organisers manage events through authenticated admin accounts, while participants join anonymously through the public event link.
            </p>
            <Button variant="outline" asChild data-testid="button-copy-outreach">
              <Link href="/about">
                <LinkIcon className="h-4 w-4 mr-1" />
                Learn about the project
              </Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
