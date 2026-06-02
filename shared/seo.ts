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

  if (normalizedPath === "/login") {
    return {
      title: "Sign In | ChantLive",
      description: "Sign in to manage demonstrations and control live chants in ChantLive.",
      canonicalPath: "/login",
      robots: "noindex,nofollow",
      ogType: "website",
      jsonLd: buildNoIndexJsonLd(origin),
    };
  }

  if (normalizedPath === "/register") {
    return {
      title: "Register | ChantLive",
      description: "Create a ChantLive admin account to organize demonstrations and manage live chants.",
      canonicalPath: "/register",
      robots: "noindex,nofollow",
      ogType: "website",
      jsonLd: buildNoIndexJsonLd(origin),
    };
  }

  if (normalizedPath === "/forgot-password") {
    return {
      title: "Forgot Password | ChantLive",
      description: "Reset your ChantLive password.",
      canonicalPath: "/forgot-password",
      robots: "noindex,nofollow",
      ogType: "website",
      jsonLd: buildNoIndexJsonLd(origin),
    };
  }

  if (normalizedPath.startsWith("/reset-password")) {
    return {
      title: "Reset Password | ChantLive",
      description: "Choose a new password for your ChantLive account.",
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
