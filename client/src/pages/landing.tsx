import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Zap, Users, ArrowRight, Megaphone } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Link } from "wouter";
import { AppVersion } from "@/components/app-version";

export default function Landing() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-2 text-xl font-bold" data-testid="text-brand"><Megaphone className="w-6 h-6 text-orange-500" />ChantLive</span>
            <AppVersion />
          </div>
          {isAuthenticated ? (
            <Button asChild data-testid="button-go-dashboard">
              <Link href="/admin">
                Dashboard
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" asChild data-testid="button-sign-in">
                <Link href="/login">Sign In</Link>
              </Button>
              <Button asChild data-testid="button-register">
                <Link href="/register">Register</Link>
              </Button>
            </div>
          )}
        </div>
      </header>

      <main>
        <section className="py-20 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-primary/10 text-primary text-sm font-medium mb-6">
              <Zap className="w-3.5 h-3.5" />
              Real-time demonstration management
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Lead your crowd with
              <span className="text-primary"> live chants</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
              Create demonstrations, manage chants, and push them live to every participant's phone instantly. Hosted at <a href="https://chantlive.online/" target="_blank" rel="noreferrer" className="underline underline-offset-4">chantlive.online</a> and free to use by anyone.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              {isAuthenticated ? (
                <Button size="lg" asChild data-testid="button-get-started">
                  <Link href="/admin">
                    Go to Dashboard
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
              ) : (
                <>
                  <Button size="lg" asChild data-testid="button-get-started">
                    <Link href="/register">
                      Get Started
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild data-testid="button-hero-sign-in">
                    <Link href="/login">Sign In</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </section>

        <section className="py-16 px-4 border-t">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-semibold text-center mb-10">How it works</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                    <Megaphone className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">Create a demonstration</h3>
                  <p className="text-sm text-muted-foreground">Set up your event and add the chants you want participants to follow along with.</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                    <Zap className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">Go live & control</h3>
                  <p className="text-sm text-muted-foreground">Push chants live in real-time. Switch between chants with a single click as your event progresses.</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">Participants join via QR</h3>
                  <p className="text-sm text-muted-foreground">Share a QR code. Participants see the live chant full-screen on their phones, no download needed.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-16 px-4 border-t">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-xl font-semibold mb-2">Free and open-source for free speech</h2>
            <p className="text-sm text-muted-foreground">
              ChantLive is a free open-source project. Our mission is to help people organize peaceful demonstrations and express themselves safely,
              openly, and without paywalls.
            </p>
          </div>
          <div className="max-w-3xl mx-auto text-center">
            <Shield className="w-8 h-8 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Secure admin access</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Only authorized admins can create and control demonstrations. Participants join anonymously with no sign-up required.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t py-6 px-4">
        <div className="max-w-6xl mx-auto text-center text-sm text-muted-foreground space-y-2">
          <p>ChantLive - Real-time demonstration management, hosted at <a href="https://chantlive.online/" target="_blank" rel="noreferrer" className="underline underline-offset-4">chantlive.online</a> and free for anyone</p>
          <p>
            Open-source project for free speech worldwide. <a href="https://github.com/barsham/ChantLive" target="_blank" rel="noreferrer" className="underline underline-offset-4">Source code on GitHub</a>. <AppVersion className="inline" />
          </p>
        </div>
      </footer>
    </div>
  );
}
