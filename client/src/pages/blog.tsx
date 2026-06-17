import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AppVersion } from "@/components/app-version";
import { blogPosts } from "@shared/blog";
import { ArrowRight, CalendarDays, Clock, Megaphone } from "lucide-react";
import { Link } from "wouter";

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "long",
  }).format(new Date(value));
}

const upcomingTopics = [
  "Getting people to participate without confusion",
  "Permit questions to ask before choosing a route",
  "QR-code accessibility and link fallback planning",
  "Safety roles for peaceful live events",
];

export default function Blog() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold" data-testid="link-blog-brand">
            <Megaphone className="w-6 h-6 text-orange-500" />
            ChantLive
            <AppVersion />
          </Link>
          <nav className="flex items-center gap-2 flex-wrap text-sm">
            <Button variant="ghost" asChild>
              <Link href="/for-organizers">For Organizers</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/about">About</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/register">Start Organizing</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12">
        <section className="max-w-3xl mb-10">
          <Badge variant="secondary" className="mb-4">Community guides</Badge>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4" data-testid="text-blog-title">
            Practical guides for peaceful demonstrations and live community events
          </h1>
          <p className="text-muted-foreground text-lg">
            Weekly articles about participation, safety, permits, accessibility, communication, and using ChantLive
            during real gatherings.
          </p>
        </section>

        <section className="mb-8 rounded-xl border bg-muted/30 p-5" aria-labelledby="upcoming-blog-topics">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 id="upcoming-blog-topics" className="text-lg font-semibold mb-2">Upcoming weekly topics</h2>
              <p className="text-sm text-muted-foreground">
                The blog backlog focuses on practical organizer questions, not generic product updates.
              </p>
              <Button variant="outline" size="sm" className="mt-4" asChild data-testid="link-suggest-blog-topic">
                <a
                  href="https://github.com/barsham/ChantLive/issues/new?title=Blog%20topic%20suggestion%3A%20&labels=blog"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Suggest a topic
                </a>
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 md:max-w-xl">
              {upcomingTopics.map((topic) => (
                <span key={topic} className="rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
                  {topic}
                </span>
              ))}
            </div>
          </div>
        </section>

        <div className="grid gap-4">
          {blogPosts.map((post) => (
            <Card key={post.slug} className="hover-elevate">
              <CardContent className="p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-3">
                      <Badge variant="outline">{post.category}</Badge>
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {formatDate(post.publishedAt)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {post.readingMinutes} min read
                      </span>
                    </div>
                    <h2 className="text-xl font-semibold mb-2">
                      <Link href={`/blog/${post.slug}`} className="hover:underline" data-testid={`link-blog-post-${post.slug}`}>
                        {post.title}
                      </Link>
                    </h2>
                    <p className="text-sm text-muted-foreground">{post.description}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {post.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Button asChild className="shrink-0">
                    <Link href={`/blog/${post.slug}`}>
                      Read guide
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
