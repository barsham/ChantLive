import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AppVersion } from "@/components/app-version";
import { getBlogPost } from "@shared/blog";
import { ArrowLeft, CalendarDays, Clock, Megaphone } from "lucide-react";
import { Link, useParams } from "wouter";
import NotFound from "@/pages/not-found";

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "long",
  }).format(new Date(value));
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const post = getBlogPost(slug);

  if (!post) {
    return <NotFound />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold" data-testid="link-blog-post-brand">
            <Megaphone className="w-6 h-6 text-orange-500" />
            ChantLive
            <AppVersion />
          </Link>
          <Button variant="outline" size="sm" asChild>
            <Link href="/blog">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Blog
            </Link>
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        <article>
          <div className="mb-8">
            <Badge variant="secondary" className="mb-4">{post.category}</Badge>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4" data-testid="text-blog-post-title">
              {post.title}
            </h1>
            <p className="text-lg text-muted-foreground mb-4">{post.description}</p>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" />
                {formatDate(post.publishedAt)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {post.readingMinutes} min read
              </span>
            </div>
          </div>

          {post.disclaimer && (
            <Card className="mb-8 border-orange-200 bg-orange-50">
              <CardContent className="p-4">
                <p className="text-sm font-medium text-orange-950 mb-1">Important note</p>
                <p className="text-sm text-orange-900">{post.disclaimer}</p>
              </CardContent>
            </Card>
          )}

          <div className="space-y-8">
            {post.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-2xl font-semibold tracking-tight mb-3">{section.heading}</h2>
                <div className="space-y-3 text-muted-foreground">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
                {section.bullets && (
                  <ul className="mt-4 space-y-2">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-2 text-sm text-muted-foreground">
                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary shrink-0" aria-hidden="true" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>

          <Card className="mt-10">
            <CardContent className="p-5">
              <h2 className="text-lg font-semibold mb-2">Use ChantLive at your next event</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Create chant lists, share a QR code, invite backup admins, and keep participants synced from their phones.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button asChild>
                  <Link href="/register">Create an admin account</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/for-organizers">Read organizer guide</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </article>
      </main>
    </div>
  );
}
