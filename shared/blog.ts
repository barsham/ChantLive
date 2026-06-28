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
    slug: "backup-communication-plan-for-peaceful-events",
    title: "How to Build a Backup Communication Plan for a Peaceful Event",
    description:
      "A practical backup communication checklist for peaceful demonstrations and community events when mobile signal, noise, or crowd movement disrupts the main plan.",
    publishedAt: "2026-06-28",
    category: "Communication",
    readingMinutes: 7,
    tags: ["communication", "backup-plan", "live-events", "organizing"],
    disclaimer:
      "This article is general event-planning information only. It is not legal, medical, or emergency-response advice. Follow local authority requirements, venue rules, and emergency services instructions for your event.",
    sections: [
      {
        heading: "Decide What Must Still Work If The Main Channel Fails",
        paragraphs: [
          "Backup communication starts by choosing the few messages that matter most when the event gets loud, crowded, or temporarily loses mobile signal. If everything feels equally important, people will not know what to repeat first.",
          "For most peaceful events, the essential messages are usually where to gather, who participants should listen to, how schedule changes will be shared, and how people can get help without confusion.",
        ],
        bullets: [
          "Write the event location and fallback meeting point in one plain sentence.",
          "Name the people or roles allowed to give live instructions.",
          "Decide how you will tell participants that the plan has changed.",
        ],
      },
      {
        heading: "Use One Primary Channel And One Simple Fallback",
        paragraphs: [
          "A backup plan works best when it is deliberately small. Choose one primary communication path for normal conditions and one fallback that people can understand without a long briefing.",
          "Examples include a live mobile page plus printed short links, or a lead volunteer announcement plus visible handout instructions. The fallback should not require participants to remember several steps.",
        ],
        bullets: [
          "Keep one primary joining path such as a QR code or short link.",
          "Add one fallback path such as a printed handout, sign, or pre-briefed volunteer script.",
          "Use the same wording across signs, volunteer notes, and digital posts.",
        ],
      },
      {
        heading: "Assign Relay Roles Before The Event Starts",
        paragraphs: [
          "Backup communication usually fails because everyone assumes someone else will repeat the message. Clear relay roles reduce that gap and help people stay calm when the environment gets noisy or distracted.",
          "You do not need a large command structure. You need a small number of trusted people who know who speaks first, who repeats instructions, and who watches for people who missed the update.",
        ],
        bullets: [
          "Event lead: approves message changes.",
          "Volunteer relay: repeats short instructions to nearby participants.",
          "Accessibility helper: checks whether instructions are reaching people who need a repeated or alternate format.",
        ],
      },
      {
        heading: "Prepare Short Printed And Spoken Messages",
        paragraphs: [
          "When conditions change quickly, short messages travel farther than detailed explanations. Write them in advance so volunteers are not improvising under pressure.",
          "A good message says what changed, what participants should do next, and where they can check the current update.",
        ],
        bullets: [
          "Example arrival message: 'If scanning is difficult, use this short link and stay near the welcome sign for updates.'",
          "Example delay message: 'We are starting later than planned. Stay with your group lead and watch the participant page or signs for the new start time.'",
          "Example regroup message: 'Please move to the fallback meeting point shown on the handout and wait for the next instruction there.'",
        ],
      },
      {
        heading: "Test The Plan In Five Minutes",
        paragraphs: [
          "A brief live test reveals unclear wording, missing handouts, and volunteer confusion before participants arrive. The goal is not a perfect drill. The goal is to find the one weak point that will slow everyone down later.",
          "Run the test with the people who will actually be helping on the day, using the same phones, signs, and printed materials you expect to use live.",
        ],
        bullets: [
          "Ask one person to join using the primary path and another to use the fallback path.",
          "Have a volunteer repeat one prepared change message out loud.",
          "Check that the fallback meeting point and support contact are written the same way everywhere.",
        ],
      },
      {
        heading: "Use ChantLive As Part Of A Layered Plan",
        paragraphs: [
          "ChantLive can help when you want one live page, a QR code, and a copyable participant link that volunteers can share quickly. It is most useful when organizers treat it as one layer in a broader communication plan rather than the only layer.",
          "If you use ChantLive, prepare the participant page early, keep the short link ready in volunteer notes, and invite a backup admin so another trusted person can assist if the main organizer is busy.",
        ],
        bullets: [
          "Print the participant handout as a fallback to the main QR sign.",
          "Share the join link with volunteers before the event starts.",
          "Confirm at least one backup admin can help manage live updates if needed.",
        ],
      },
    ],
  },
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
