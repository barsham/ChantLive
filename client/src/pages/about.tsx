import { AppVersion } from "@/components/app-version";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Github, HeartHandshake, Megaphone, ShieldCheck, Users } from "lucide-react";
import { Link } from "wouter";

const linkTargets = [
  {
    title: "Civic technology projects",
    description: "A lightweight open-source tool for coordinated public expression and event communication.",
  },
  {
    title: "Accessibility reviewers",
    description: "A mobile participant view, QR fallback guidance, and live update announcements ready for critique.",
  },
  {
    title: "Community organisers",
    description: "A practical way to share chant prompts without printed sheets or participant accounts.",
  },
];

export default function About() {
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
            <Button variant="ghost" asChild data-testid="link-for-organizers">
              <Link href="/for-organizers">For organizers</Link>
            </Button>
            <Button variant="ghost" asChild data-testid="link-changelog">
              <Link href="/changelog">Changelog</Link>
            </Button>
            <Button asChild data-testid="button-register">
              <Link href="/register">Create account</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="px-4 py-16 md:py-20">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-6">
              <HeartHandshake className="h-4 w-4" />
              Free and open-source community event software
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-5">
              ChantLive helps groups coordinate live chants from any phone
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              The project supports organisers running demonstrations, prayer circles, vigils, marches, campus actions, and community gatherings where people need the same words at the same time.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Button size="lg" asChild data-testid="button-organizer-page">
                <Link href="/for-organizers">
                  See organiser workflow
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild data-testid="button-github">
                <a href="https://github.com/barsham/ChantLive" target="_blank" rel="noopener noreferrer">
                  <Github className="h-4 w-4 mr-1" />
                  GitHub repository
                </a>
              </Button>
            </div>
          </div>
        </section>

        <section className="border-t px-4 py-14">
          <div className="max-w-5xl mx-auto grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <Users className="h-8 w-8 text-primary mb-4" />
                <h2 className="font-semibold mb-2">For organisers</h2>
                <p className="text-sm text-muted-foreground">
                  Create events, prepare chant lists, invite admins, share QR codes, and control live prompts from the dashboard.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <Megaphone className="h-8 w-8 text-primary mb-4" />
                <h2 className="font-semibold mb-2">For participants</h2>
                <p className="text-sm text-muted-foreground">
                  Open a public link, keep the page visible, and receive large call-and-response text with no account required.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <ShieldCheck className="h-8 w-8 text-primary mb-4" />
                <h2 className="font-semibold mb-2">For contributors</h2>
                <p className="text-sm text-muted-foreground">
                  Review the code, suggest accessibility improvements, and help make live event coordination more reliable.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="border-t px-4 py-14">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-semibold text-center mb-8">Good pages to link to</h2>
            <div className="grid gap-3">
              {linkTargets.map((target) => (
                <div key={target.title} className="rounded-lg border bg-card p-5">
                  <h3 className="font-semibold mb-1">{target.title}</h3>
                  <p className="text-sm text-muted-foreground">{target.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
