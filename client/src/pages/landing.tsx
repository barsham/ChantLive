import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Accessibility, QrCode, Shield, Zap, Users, ArrowRight, Megaphone, Wifi, LogIn, Menu, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Link, useLocation } from "wouter";
import { AppVersion } from "@/components/app-version";
import { blogPosts } from "@shared/blog";
import { useState, type FormEvent } from "react";

function getParticipantCode(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  let candidate = trimmed;
  const participantPath = trimmed.match(/^(?:(?:https?:\/\/)?[^/\s]+\.[^/\s]+)?\/?d\/([^/?#]+)\/?(?:[?#].*)?$/i);
  try {
    if (participantPath) candidate = decodeURIComponent(participantPath[1]);
  } catch {
    return null;
  }

  candidate = candidate.replace(/^d\//i, "");
  return /^[A-Za-z0-9_-]{6,12}$/.test(candidate) ? candidate : null;
}

export default function Landing() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const latestPost = blogPosts[0];
  const [joinValue, setJoinValue] = useState("");
  const [joinError, setJoinError] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleJoin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const participantCode = getParticipantCode(joinValue);
    if (!participantCode) {
      setJoinError("Enter the code from your organiser, or paste the full participant link.");
      return;
    }

    setJoinError("");
    navigate(`/d/${participantCode}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-2 text-xl font-bold" data-testid="text-brand"><Megaphone className="w-6 h-6 text-orange-500" />ChantLive</span>
            <AppVersion />
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileNavOpen((open) => !open)}
            aria-label={mobileNavOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileNavOpen}
            aria-controls="mobile-navigation"
            data-testid="button-mobile-menu"
          >
            {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          {isAuthenticated ? (
            <nav className="hidden items-center gap-2 md:flex" aria-label="Primary navigation">
              <Button variant="ghost" asChild data-testid="link-for-organizers">
                <Link href="/for-organizers">For Organizers</Link>
              </Button>
              <Button variant="ghost" asChild data-testid="link-about">
                <Link href="/about">About</Link>
              </Button>
              <Button variant="ghost" asChild data-testid="link-blog">
                <Link href="/blog">Blog</Link>
              </Button>
              <Button variant="ghost" asChild data-testid="link-changelog">
                <Link href="/changelog">Changelog</Link>
              </Button>
              <Button asChild data-testid="button-go-dashboard">
                <Link href="/admin">
                  Dashboard
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </nav>
          ) : (
            <nav className="hidden items-center gap-2 md:flex" aria-label="Primary navigation">
              <Button variant="ghost" asChild data-testid="link-for-organizers">
                <Link href="/for-organizers">For Organizers</Link>
              </Button>
              <Button variant="ghost" asChild data-testid="link-about">
                <Link href="/about">About</Link>
              </Button>
              <Button variant="ghost" asChild data-testid="link-blog">
                <Link href="/blog">Blog</Link>
              </Button>
              <Button variant="ghost" asChild data-testid="link-changelog">
                <Link href="/changelog">Changelog</Link>
              </Button>
              <Button variant="outline" asChild data-testid="button-sign-in">
                <Link href="/login">Sign In</Link>
              </Button>
              <Button asChild data-testid="button-register">
                <Link href="/register">Register</Link>
              </Button>
            </nav>
          )}
        </div>
        {mobileNavOpen && (
          <nav id="mobile-navigation" className="border-t px-4 py-3 md:hidden" aria-label="Mobile navigation">
            <div className="mx-auto grid max-w-6xl grid-cols-2 gap-2">
              <Button variant="ghost" className="justify-start" asChild>
                <Link href="/for-organizers" onClick={() => setMobileNavOpen(false)}>For organizers</Link>
              </Button>
              <Button variant="ghost" className="justify-start" asChild>
                <Link href="/about" onClick={() => setMobileNavOpen(false)}>About</Link>
              </Button>
              <Button variant="ghost" className="justify-start" asChild>
                <Link href="/blog" onClick={() => setMobileNavOpen(false)}>Blog</Link>
              </Button>
              <Button variant="ghost" className="justify-start" asChild>
                <Link href="/changelog" onClick={() => setMobileNavOpen(false)}>Changelog</Link>
              </Button>
              {isAuthenticated ? (
                <Button className="col-span-2" asChild>
                  <Link href="/admin" onClick={() => setMobileNavOpen(false)}>Go to dashboard</Link>
                </Button>
              ) : (
                <>
                  <Button variant="outline" asChild>
                    <Link href="/login" onClick={() => setMobileNavOpen(false)}>Sign in</Link>
                  </Button>
                  <Button asChild>
                    <Link href="/register" onClick={() => setMobileNavOpen(false)}>Create account</Link>
                  </Button>
                </>
              )}
            </div>
          </nav>
        )}
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
              Create demonstrations, manage chants, share QR codes, and push live call-and-response updates to every participant&apos;s phone instantly. Hosted at <a href="https://chantlive.online/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">chantlive.online</a> and free to use by anyone.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              {isAuthenticated ? (
                <>
                  <Button size="lg" asChild data-testid="button-get-started">
                    <Link href="/admin">
                      Go to Dashboard
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild data-testid="button-hero-join-event">
                    <a href="#join-event">
                      <LogIn className="w-4 h-4 mr-1" />
                      Join an event
                    </a>
                  </Button>
                </>
              ) : (
                <>
                  <Button size="lg" asChild data-testid="button-get-started">
                    <Link href="/register">
                      Get Started
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild data-testid="button-hero-join-event">
                    <a href="#join-event">
                      <LogIn className="w-4 h-4 mr-1" />
                      Join an event
                    </a>
                  </Button>
                  <Button size="lg" variant="ghost" asChild data-testid="button-for-organizers">
                    <Link href="/for-organizers">For organizers</Link>
                  </Button>
                </>
              )}
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
              {["Marches", "Prayer circles", "Campus actions", "Community gatherings"].map((useCase) => (
                <span key={useCase} className="rounded-full border bg-card px-3 py-1" data-testid={`text-use-case-${useCase.toLowerCase().replace(/\s+/g, "-")}`}>
                  {useCase}
                </span>
              ))}
            </div>
            <Card id="join-event" className="mt-8 scroll-mt-24 text-left border-primary/30 bg-primary/5">
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-primary/10 p-2" aria-hidden="true">
                    <LogIn className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-semibold">Joining an event?</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Enter the code shared by your organiser, or paste the full participant link. No account is needed.
                    </p>
                    <form className="mt-4 flex flex-col gap-2 sm:flex-row" onSubmit={handleJoin} noValidate>
                      <div className="min-w-0 flex-1">
                        <label htmlFor="participant-code" className="sr-only">Participant code or link</label>
                        <Input
                          id="participant-code"
                          value={joinValue}
                          onChange={(event) => {
                            setJoinValue(event.target.value);
                            if (joinError) setJoinError("");
                          }}
                          autoCapitalize="none"
                          autoCorrect="off"
                          spellCheck={false}
                          inputMode="text"
                          placeholder="Example: V1StGXR8 or chantlive.online/d/..."
                          aria-invalid={joinError ? true : undefined}
                          aria-describedby={joinError ? "participant-code-help participant-code-error" : "participant-code-help"}
                          data-testid="input-participant-code"
                        />
                      </div>
                      <Button type="submit" className="sm:shrink-0" data-testid="button-join-event">
                        Join event
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </Button>
                    </form>
                    <p id="participant-code-help" className="mt-2 text-xs text-muted-foreground">
                      Your entry is used only to open the event on this device; participants join anonymously.
                    </p>
                    {joinError && (
                      <p id="participant-code-error" className="mt-2 text-sm text-destructive" role="alert" data-testid="text-participant-code-error">
                        {joinError}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            {latestPost && (
              <Card className="mt-8 text-left">
                <CardContent className="p-5">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Latest community guide</p>
                  <h2 className="text-lg font-semibold mb-2">{latestPost.title}</h2>
                  <p className="text-sm text-muted-foreground mb-4">{latestPost.description}</p>
                  <Button variant="outline" asChild data-testid="link-latest-blog-post">
                    <Link href={`/blog/${latestPost.slug}`}>
                      Read the guide
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}
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
            <h2 className="text-xl font-semibold mb-2">Why organizers use ChantLive</h2>
            <p className="text-sm text-muted-foreground">
              ChantLive helps organizers run coordinated demonstrations without printing leaflets, shouting over a crowd, or asking participants to install an app.
              The platform is built for fast updates, anonymous participant access, and clear chant visibility on mobile devices.
            </p>
          </div>
          <div className="max-w-3xl mx-auto text-center">
            <Shield className="w-8 h-8 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Secure admin access</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Only authorized admins can create and control demonstrations. Participants join anonymously with no sign-up required.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3 text-left">
              <div className="rounded-lg border bg-card p-4">
                <p className="text-sm font-medium mb-1">No participant accounts</p>
                <p className="text-xs text-muted-foreground">People can join from a link or QR code without creating a profile.</p>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <p className="text-sm font-medium mb-1">Mobile-first viewing</p>
                <p className="text-xs text-muted-foreground">Large chant text is built for phones in crowds, halls, and outdoor gatherings.</p>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <p className="text-sm font-medium mb-1">Open-source trust</p>
                <p className="text-xs text-muted-foreground">The community can inspect the code, report issues, and suggest improvements.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 px-4 border-t bg-muted/20">
          <div className="max-w-4xl mx-auto">
            <div className="max-w-2xl mx-auto text-center mb-10">
              <h2 className="text-2xl font-semibold mb-2">Built for real crowds, not perfect rooms</h2>
              <p className="text-sm text-muted-foreground">
                Live gatherings happen with noise, weak signal, mixed devices, and people who cannot scan a QR code.
                ChantLive keeps the participant path simple and gives organizers practical fallbacks.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <QrCode className="w-7 h-7 text-primary mb-3" />
                  <h3 className="font-semibold mb-2">QR plus link fallback</h3>
                  <p className="text-sm text-muted-foreground">
                    Share the QR code for speed, then copy the same participant link for messages, projection, or printed backup.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <Accessibility className="w-7 h-7 text-primary mb-3" />
                  <h3 className="font-semibold mb-2">Accessible live prompts</h3>
                  <p className="text-sm text-muted-foreground">
                    Large call-and-response text, clear phase labels, and screen-reader status updates help more people follow along.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <Wifi className="w-7 h-7 text-primary mb-3" />
                  <h3 className="font-semibold mb-2">Connection awareness</h3>
                  <p className="text-sm text-muted-foreground">
                    Participants see reconnecting and offline messages instead of guessing whether the chant feed is still active.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-16 px-4 border-t">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-semibold text-center mb-10">Frequently asked questions</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2">Do participants need to install anything?</h3>
                  <p className="text-sm text-muted-foreground">
                    No. Participants scan a QR code or open a link and immediately see the current chant in their mobile browser.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2">Can multiple admins manage one demonstration?</h3>
                  <p className="text-sm text-muted-foreground">
                    Yes. Event admins can collaborate on setup and manage live chant changes together during a demonstration.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2">Is ChantLive free to use?</h3>
                  <p className="text-sm text-muted-foreground">
                    Yes. ChantLive is a free open-source project built to support peaceful public expression without paywalls.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2">What kinds of events is it for?</h3>
                  <p className="text-sm text-muted-foreground">
                    It works well for rallies, marches, demonstrations, campus actions, and any event where a group needs synchronized live chant prompts.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-6 px-4">
        <div className="max-w-6xl mx-auto text-center text-sm text-muted-foreground space-y-2">
          <p>ChantLive - Real-time demonstration management, hosted at <a href="https://chantlive.online/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">chantlive.online</a> and free for anyone</p>
          <p>
            Proudly sponsored by <a href="https://www.devectus.com.au/" target="_blank" rel="noopener noreferrer" className="font-medium text-foreground underline underline-offset-4">DEVECTUS</a>.
          </p>
          <p>
            Open-source project for free speech worldwide. <a href="https://github.com/barsham/ChantLive" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">Source code on GitHub</a>. <AppVersion className="inline" />
          </p>
          <p>
            Learn more <Link href="/for-organizers" className="underline underline-offset-4">for organizers</Link>, read <Link href="/about" className="underline underline-offset-4">about ChantLive</Link>, explore the <Link href="/blog" className="underline underline-offset-4">community blog</Link>, or see what changed in the <Link href="/changelog" className="underline underline-offset-4">public changelog</Link>.
          </p>
        </div>
      </footer>
    </div>
  );
}
