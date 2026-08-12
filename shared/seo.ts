import { blogPosts, getBlogPost } from "./blog";

export type SeoConfig = {
  title: string;
  description: string;
  canonicalPath: string;
  robots: string;
  ogType: "website" | "article";
  jsonLd: Record<string, unknown> | null;
};

const SITE_NAME = "ChantLive";
const DEFAULT_DESCRIPTION =
  "ChantLive is a real-time chant and demonstration management platform for organizers who need to create chants, share QR codes, and push live updates to every participant's phone.";

function buildHomeJsonLd(origin: string) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: SITE_NAME,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: origin,
        description: DEFAULT_DESCRIPTION,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        publisher: {
          "@type": "Organization",
          name: SITE_NAME,
          url: origin,
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "Do participants need to install anything?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "No. Participants scan a QR code or open a link and immediately see the current chant in their mobile browser.",
            },
          },
          {
            "@type": "Question",
            name: "Can multiple admins manage one demonstration?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. Event admins can collaborate on setup and manage live chant changes together during a demonstration.",
            },
          },
          {
            "@type": "Question",
            name: "Is ChantLive free to use?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. ChantLive is a free open-source project built to support peaceful public expression without paywalls.",
            },
          },
        ],
      },
    ],
  };
}

function buildNoIndexJsonLd(origin: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: SITE_NAME,
    url: origin,
  };
}

function buildChangelogJsonLd(origin: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "ChantLive Changelog",
    url: new URL("/changelog", origin).toString(),
    description:
      "Public ChantLive release notes covering new features, improvements, fixes, and documentation updates.",
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: origin,
    },
  };
}

function buildAboutJsonLd(origin: string) {
  return {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "About ChantLive",
    url: new URL("/about", origin).toString(),
    description:
      "ChantLive is a free open-source live chant coordination tool for demonstrations, prayer circles, vigils, marches, and community gatherings.",
    mainEntity: {
      "@type": "SoftwareApplication",
      name: SITE_NAME,
      applicationCategory: "CommunicationApplication",
      operatingSystem: "Web",
      url: origin,
      isAccessibleForFree: true,
      codeRepository: "https://github.com/barsham/ChantLive",
      description: DEFAULT_DESCRIPTION,
    },
  };
}

function buildOrganizerJsonLd(origin: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "ChantLive for Organizers",
    url: new URL("/for-organizers", origin).toString(),
    description:
      "A practical guide to using ChantLive for live chant coordination, QR code sharing, and mobile participant prompts at public and community events.",
    about: {
      "@type": "SoftwareApplication",
      name: SITE_NAME,
      applicationCategory: "CommunicationApplication",
      operatingSystem: "Web",
      url: origin,
      isAccessibleForFree: true,
    },
  };
}

function buildBlogJsonLd(origin: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "ChantLive Blog",
    url: new URL("/blog", origin).toString(),
    description:
      "Weekly practical guides for peaceful demonstrations, live community events, accessibility, safety, permits, and participant communication.",
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: origin,
    },
    blogPost: blogPosts.map((post) => ({
      "@type": "BlogPosting",
      headline: post.title,
      description: post.description,
      datePublished: post.publishedAt,
      dateModified: post.updatedAt ?? post.publishedAt,
      url: new URL(`/blog/${post.slug}`, origin).toString(),
    })),
  };
}

function buildBlogPostJsonLd(origin: string, slug: string) {
  const post = getBlogPost(slug);

  if (!post) return buildNoIndexJsonLd(origin);

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt ?? post.publishedAt,
    url: new URL(`/blog/${post.slug}`, origin).toString(),
    author: {
      "@type": "Organization",
      name: SITE_NAME,
      url: origin,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: origin,
    },
    isAccessibleForFree: true,
    keywords: post.tags.join(", "),
  };
}

export function getSeoForPath(pathname: string, origin: string): SeoConfig {
  const normalizedPath = pathname === "" ? "/" : pathname;

  if (normalizedPath === "/") {
    return {
      title: "ChantLive | Real-Time Chant Management for Demonstrations",
      description:
        "Create demonstrations, manage chants, share QR codes, and push live call-and-response updates to every participant instantly with ChantLive.",
      canonicalPath: "/",
      robots: "index,follow",
      ogType: "website",
      jsonLd: buildHomeJsonLd(origin),
    };
  }

  if (normalizedPath === "/about") {
    return {
      title: "About ChantLive | Open-Source Live Chant Coordination",
      description:
        "Learn about ChantLive, a free open-source live chant coordination app for demonstrations, prayer circles, vigils, marches, and community gatherings.",
      canonicalPath: "/about",
      robots: "index,follow",
      ogType: "website",
      jsonLd: buildAboutJsonLd(origin),
    };
  }

  if (normalizedPath === "/for-organizers") {
    return {
      title: "For Organizers | QR Code Live Chant App for Events",
      description:
        "Use ChantLive to prepare chants, share a QR code, invite admins, and push live call-and-response prompts to participant phones during events.",
      canonicalPath: "/for-organizers",
      robots: "index,follow",
      ogType: "website",
      jsonLd: buildOrganizerJsonLd(origin),
    };
  }

  if (normalizedPath === "/login") {
    return {
      title: "Sign In to ChantLive Admin for Live Demo Control",
      description:
        "Sign in to your ChantLive admin account to manage demonstrations, update chants in real time, share QR codes, and control live participant screens.",
      canonicalPath: "/login",
      robots: "noindex,nofollow",
      ogType: "website",
      jsonLd: buildNoIndexJsonLd(origin),
    };
  }

  if (normalizedPath === "/changelog") {
    return {
      title: "Changelog | ChantLive",
      description:
        "Review public ChantLive release notes, including new features, improvements, fixes, and documentation updates.",
      canonicalPath: "/changelog",
      robots: "index,follow",
      ogType: "article",
      jsonLd: buildChangelogJsonLd(origin),
    };
  }

  if (normalizedPath === "/status") {
    return {
      title: "Service Status | ChantLive",
      description: "Check whether ChantLive's public web service and live event data service are ready for organiser and participant use.",
      canonicalPath: "/status",
      robots: "noindex,follow",
      ogType: "website",
      jsonLd: buildNoIndexJsonLd(origin),
    };
  }

  if (normalizedPath === "/blog") {
    return {
      title: "Blog | Peaceful Demonstration Guides | ChantLive",
      description:
        "Read weekly ChantLive guides about peaceful demonstrations, participation, permits, safety, accessibility, and live event communication.",
      canonicalPath: "/blog",
      robots: "index,follow",
      ogType: "website",
      jsonLd: buildBlogJsonLd(origin),
    };
  }

  if (normalizedPath.startsWith("/blog/")) {
    const slug = normalizedPath.replace("/blog/", "");
    const post = getBlogPost(slug);

    if (post) {
      return {
        title: `${post.title} | ChantLive Blog`,
        description: post.description,
        canonicalPath: `/blog/${post.slug}`,
        robots: "index,follow",
        ogType: "article",
        jsonLd: buildBlogPostJsonLd(origin, post.slug),
      };
    }

    return {
      title: "Blog Post Not Found | ChantLive",
      description: DEFAULT_DESCRIPTION,
      canonicalPath: normalizedPath,
      robots: "noindex,nofollow",
      ogType: "website",
      jsonLd: buildNoIndexJsonLd(origin),
    };
  }

  if (normalizedPath === "/register") {
    return {
      title: "Create a ChantLive Admin Account for Live Chant Management",
      description:
        "Create a ChantLive admin account to organize demonstrations, build chant lists, share QR codes, and manage live call-and-response screens.",
      canonicalPath: "/register",
      robots: "noindex,nofollow",
      ogType: "website",
      jsonLd: buildNoIndexJsonLd(origin),
    };
  }

  if (normalizedPath === "/forgot-password") {
    return {
      title: "Reset Your ChantLive Password and Restore Admin Access",
      description:
        "Request a secure ChantLive password reset link to restore admin access and get back to managing demonstrations, chants, and live participant updates.",
      canonicalPath: "/forgot-password",
      robots: "noindex,nofollow",
      ogType: "website",
      jsonLd: buildNoIndexJsonLd(origin),
    };
  }

  if (normalizedPath.startsWith("/reset-password")) {
    return {
      title: "Choose a New ChantLive Password for Your Admin Account",
      description:
        "Choose a new password for your ChantLive admin account so you can securely return to your dashboard and continue managing live demonstrations.",
      canonicalPath: "/reset-password",
      robots: "noindex,nofollow",
      ogType: "website",
      jsonLd: buildNoIndexJsonLd(origin),
    };
  }

  if (normalizedPath.startsWith("/admin")) {
    return {
      title: "Admin Dashboard | ChantLive",
      description: "Private ChantLive administration area.",
      canonicalPath: normalizedPath,
      robots: "noindex,nofollow",
      ogType: "website",
      jsonLd: buildNoIndexJsonLd(origin),
    };
  }

  if (normalizedPath.startsWith("/d/")) {
    return {
      title: "Live Demonstration | ChantLive",
      description: "Live participant view for a ChantLive demonstration.",
      canonicalPath: normalizedPath,
      robots: "noindex,nofollow",
      ogType: "website",
      jsonLd: buildNoIndexJsonLd(origin),
    };
  }

  return {
    title: "Page Not Found | ChantLive",
    description: DEFAULT_DESCRIPTION,
    canonicalPath: normalizedPath,
    robots: "noindex,nofollow",
    ogType: "website",
    jsonLd: buildNoIndexJsonLd(origin),
  };
}
