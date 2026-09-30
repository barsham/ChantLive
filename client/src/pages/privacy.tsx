import { AppVersion } from "@/components/app-version";
import { TrustLinks } from "@/components/trust-links";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Database, ExternalLink, KeyRound, Megaphone, ShieldCheck, Trash2 } from "lucide-react";
import { Link } from "wouter";

const sections = [
  {
    id: "accounts", icon: KeyRound, title: "Organiser accounts",
    body: <><p>Organisers provide a name and email address. ChantLive stores those details, a securely hashed password, verification and recovery records, and sign-in sessions. Authentication sessions can include an IP address and browser user-agent for account security and expire after 30 days.</p><p>Verification and password-reset emails are delivered by our email provider. Participants do not need an account, and organisers do not see participant account details because there are none.</p></>,
  },
  {
    id: "participants", icon: ShieldCheck, title: "Participant data",
    body: <><p>Your browser creates random private identifiers. ChantLive sends them only when a feature needs a same-device receipt, then combines each identifier with the event ID and stores a one-way SHA-256 hash. The raw identifier stays in your browser.</p><p>Depending on what you choose to use, an event can store attendance times, an anonymous reservation, poll or safety responses, accessibility signals, questions, help requests, feedback, and private conduct reports. Text you submit is stored when the feature requires organisers to read or answer it. Do not enter identifying information unless it is necessary.</p><p>Organisers see aggregate activity and the content needed to run their event. They do not receive your IP address, device details, location, raw browser identifier, name, email, or phone number from participant features. A voluntary event check-in name is the exception: it is shown to organisers for that live session.</p></>,
  },
  {
    id: "attendance", icon: Trash2, title: "Attendance controls",
    body: <><p>Attendance uses a separate random identifier for each event. Selecting <strong>Forget this event&apos;s attendance</strong> deletes attendance rows for that identifier, opts the browser out, and discards the identifier. Sharing attendance again creates a new, unrelated identifier.</p><p>Forgetting attendance does not delete a reservation, vote, question, safety response, help request, report, or other feature receipt. Those use a separate browser identifier so that an attendance choice does not unexpectedly remove actions you may need to recover. Cancel or withdraw those items with their own controls where available.</p></>,
  },
  {
    id: "storage", icon: Database, title: "Storage and retention",
    body: <><p>Your browser stores interface preferences, recent and offline event shortcuts, private receipt identifiers, and selected recovery state in local or session storage. You can clear this through the controls in ChantLive or your browser settings.</p><p>Event records remain with the event until an authorised organiser deletes it; deleting an event removes its related participant records. Account and organiser-owned records remain while the account is active or until an authorised administrator removes them. Backups may retain deleted records temporarily for service recovery.</p><p>ChantLive does not use advertising, tracking pixels, or behavioural analytics. The hosted service receives ordinary web-server connection information needed to deliver and protect the service.</p></>,
  },
  {
    id: "third-parties", icon: ExternalLink, title: "Third-party services and links",
    body: <><p>ChantLive uses no remotely hosted web fonts: pages use fonts already available on your device. The app is hosted on ChantLive infrastructure and uses an email delivery provider for organiser verification and recovery messages.</p><p>Google Maps, Google Calendar, Outlook Calendar, support links, and other external destinations are opened only when you choose those links. Their own privacy terms apply after you leave ChantLive.</p></>,
  },
] as const;

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/90">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold"><Megaphone className="h-5 w-5 text-orange-500" aria-hidden="true" /> ChantLive <AppVersion /></Link>
          <Button variant="ghost" asChild><Link href="/"><ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />Back to ChantLive</Link></Button>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-10" id="main-content">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Privacy and data use</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">What ChantLive stores — and what it does not</h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">This policy describes the hosted service at chantlive.online. It was last updated on 30 September 2026. Self-hosted operators are responsible for explaining their own hosting, email, logs, and retention choices.</p>
        </div>
        <nav className="mt-8 rounded-xl border bg-muted/30 p-4" aria-label="Privacy policy sections">
          <p className="font-semibold">On this page</p>
          <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">{sections.map((section) => <li key={section.id}><a className="underline underline-offset-4" href={`#${section.id}`}>{section.title}</a></li>)}</ul>
        </nav>
        <div className="mt-8 space-y-5">
          {sections.map(({ id, icon: Icon, title, body }) => <Card key={id} id={id} className="scroll-mt-20"><CardHeader><CardTitle><h2 className="flex items-center gap-3 text-xl"><Icon className="h-5 w-5 text-primary" aria-hidden="true" />{title}</h2></CardTitle></CardHeader><CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">{body}</CardContent></Card>)}
        </div>
        <Card className="mt-5 border-primary/30" id="questions">
          <CardHeader><CardTitle><h2 className="text-xl">Questions or deletion requests</h2></CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground"><p>Contact <a className="font-medium text-foreground underline underline-offset-4" href="mailto:info@chantlive.online">info@chantlive.online</a> about organiser account data, hosted event data, or this policy. Include the event link or account email only when needed to identify the record.</p><p>Because participant identifiers are deliberately pseudonymous, ChantLive may be unable to locate a participant record without the private receipt held by that browser.</p></CardContent>
        </Card>
      </main>
      <footer className="border-t px-4 py-6"><TrustLinks className="mx-auto flex max-w-4xl flex-wrap items-center gap-4 text-sm text-muted-foreground" /></footer>
    </div>
  );
}
