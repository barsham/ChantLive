export type BlogSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt?: string;
  category: string;
  readingMinutes: number;
  tags: string[];
  sections: BlogSection[];
  disclaimer?: string;
};

export const blogPosts: BlogPost[] = [
  {
    slug: "accessible-qr-code-joining-for-peaceful-events",
    title: "How to Make QR-Code Joining More Accessible at a Peaceful Event",
    description:
      "A practical checklist for making QR-code participant joining easier, more accessible, and more reliable for peaceful demonstrations and community events.",
    publishedAt: "2026-06-21",
    category: "Accessibility",
    readingMinutes: 6,
    tags: ["accessibility", "qr-code", "joining", "community-events"],
    sections: [
      {
        heading: "Start With Two Clear Joining Paths",
        paragraphs: [
          "A QR code can speed up participant joining, but it should never be the only path. Some people cannot scan easily, some use older devices, and some prefer a typed link they can open later.",
          "Give participants one visible QR code and one short written link that leads to the same place. This reduces stress at busy arrivals and makes the event easier to join without singling anyone out.",
        ],
        bullets: [
          "Put the QR code and short link side by side on signs and handouts.",
          "Use the same destination for both paths so volunteers only explain one flow.",
          "Repeat the short link in digital posts, printed materials, and spoken instructions.",
        ],
      },
      {
        heading: "Make The QR Code Easy To Scan In Real Conditions",
        paragraphs: [
          "A QR code that works on a laptop screen at a desk may fail outdoors, in glare, or when people are moving. Size, contrast, and placement matter more than decorative styling.",
          "Keep the code large, high contrast, and positioned where people can approach it safely without blocking others.",
        ],
        bullets: [
          "Use a large black-on-light code with quiet space around it.",
          "Place the code at a reachable height and avoid awkward scanning angles.",
          "Do not rely on a crowded poster with too much nearby text or graphics.",
        ],
      },
      {
        heading: "Write Instructions People Can Follow Quickly",
        paragraphs: [
          "Not everyone uses QR codes the same way. Short, literal instructions reduce confusion, especially when people are arriving under time pressure or with limited screen-reader support.",
          "Instructions should explain what the code does and what happens after scanning.",
        ],
        bullets: [
          "Label the code with a plain action such as 'Scan to join the live chant page'.",
          "Add one sentence that explains the fallback option: 'If scanning does not work, open this short link instead.'",
          "Keep the destination page simple enough to understand on a first visit.",
        ],
      },
      {
        heading: "Support People Who Cannot Or Prefer Not To Scan",
        paragraphs: [
          "Accessible joining means planning for participants who use assistive technology, have limited mobility, share devices, or simply do not want to scan from a sign in a crowd.",
          "Offer the same information in more than one format so no one has to ask for special treatment just to participate.",
        ],
        bullets: [
          "Have one volunteer ready to read out the short link when needed.",
          "Keep a printed handout with the link in large, plain text.",
          "Check that paths to the sign-in area stay clear and do not depend on narrow access points.",
        ],
      },
      {
        heading: "Brief Volunteers Before Participants Arrive",
        paragraphs: [
          "Joining help works better when volunteers know exactly what to say. A one-minute briefing prevents inconsistent instructions and avoids long troubleshooting conversations at the entrance.",
          "Give volunteers a short script, the fallback link, and one escalation path if something is not working.",
        ],
        bullets: [
          "Use one simple explanation for everyone: scan, or type the short link.",
          "Assign one person to watch for joining barriers and update signage if needed.",
          "Ask volunteers to keep walkways clear while helping late arrivals.",
        ],
      },
      {
        heading: "Test The Full Flow And Keep A Backup Ready",
        paragraphs: [
          "Before the event begins, test the QR code, the written link, and the participant page from more than one phone. A quick live test is easier than fixing the flow once a crowd has formed.",
          "If you use ChantLive, this is also the right time to confirm the participant page, print or share the handout, and make sure a backup admin can help if the primary organizer is busy.",
        ],
        bullets: [
          "Test from at least one iPhone and one Android device if available.",
          "Confirm the short link is easy to read aloud and easy to type.",
          "Keep the participant handout or join link ready in case the first sign is hard to reach.",
        ],
      },
    ],
  },
  {
    slug: "first-time-demonstration-organizer-checklist",
    title: "A First-Time Organizer's Checklist for a Peaceful Demonstration",
    description:
      "A practical planning checklist for peaceful demonstrations, covering participation, roles, permits, safety, accessibility, and live communication.",
    publishedAt: "2026-06-14",
    category: "Organizing",
    readingMinutes: 6,
    tags: ["organizing", "safety", "accessibility", "permits"],
    disclaimer:
      "Permit and public-assembly rules vary by location. This article is general planning information, not legal advice. Check your local authority or a qualified advisor before relying on permit guidance.",
    sections: [
      {
        heading: "Start With The Purpose",
        paragraphs: [
          "A demonstration is easier to support when people understand the goal, the message, and the role they can play. Write the purpose in one plain sentence before you create signs, chants, routes, or social posts.",
          "Clear purpose also helps volunteers make consistent decisions when the event gets busy.",
        ],
        bullets: [
          "What are we asking for?",
          "Who needs to hear it?",
          "How can participants act safely and respectfully?",
        ],
      },
      {
        heading: "Make Participation Simple",
        paragraphs: [
          "People are more likely to join when the instructions are specific. Tell them where to arrive, when to arrive, what to bring, and how they will receive updates.",
          "For live chants, use a QR code and a fallback link. Some participants cannot scan QR codes, have older devices, or need the link shared in a screen-reader-friendly format.",
        ],
        bullets: [
          "Publish arrival time, start time, and expected finish time.",
          "Share a short participant link as well as a QR code.",
          "Prepare one sentence volunteers can repeat to late arrivals.",
        ],
      },
      {
        heading: "Check Permits And Local Rules Early",
        paragraphs: [
          "Permit requirements can depend on the city, venue, route, expected crowd size, amplified sound, road use, and whether the event is static or moving.",
          "Do this early because approval timelines can be longer than expected. Keep a copy of any permit or written confirmation available to the event lead.",
        ],
        bullets: [
          "Search the local council, city, campus, or venue public-assembly rules.",
          "Confirm rules for amplified sound, signs, stages, road crossings, and march routes.",
          "Assign one person to hold permit details and contact information on the day.",
        ],
      },
      {
        heading: "Plan Safety Roles",
        paragraphs: [
          "Safety is usually better when roles are explicit. You do not need a large team, but you should know who is watching crowd flow, who can answer participant questions, and who can coordinate if plans change.",
        ],
        bullets: [
          "Event lead: makes final decisions.",
          "Volunteer coordinator: helps people find roles.",
          "Accessibility lead: watches for barriers and fallback needs.",
          "Communication lead: sends updates and controls live prompts.",
        ],
      },
      {
        heading: "Prepare For Weak Signal",
        paragraphs: [
          "Crowds can overload mobile networks. Test the participant page before the event, keep the QR code visible, and have a backup way to share the same link.",
          "If you use ChantLive, invite a backup admin so another trusted person can keep the session running if one device loses connection.",
        ],
        bullets: [
          "Test the QR code from at least one phone.",
          "Copy the participant link into a message thread or volunteer notes.",
          "Invite at least one backup admin before going live.",
        ],
      },
      {
        heading: "Close The Loop Afterward",
        paragraphs: [
          "After the event, write down what worked, what confused participants, and what should change next time. This turns one gathering into reusable community knowledge.",
        ],
        bullets: [
          "Save chant lists that worked well.",
          "Note accessibility or safety gaps.",
          "Thank volunteers and ask for specific improvements.",
        ],
      },
    ],
  },
];

export function getBlogPost(slug: string) {
  return blogPosts.find((post) => post.slug === slug);
}
