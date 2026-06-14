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
