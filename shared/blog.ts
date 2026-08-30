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
    slug: "invite-backup-admins-peaceful-events",
    title: "How to Invite Backup Admins Before a Peaceful Event Goes Live",
    description:
      "A practical guide to choosing, briefing, and testing backup admins so peaceful event communication can continue if the main organizer is busy, offline, or handling another responsibility.",
    publishedAt: "2026-08-30",
    category: "Organizing",
    readingMinutes: 7,
    tags: ["backup-admins", "organizing", "communication", "reliability"],
    disclaimer:
      "This article is general event-planning information only. It is not legal, medical, emergency-response, or security advice. Follow local authority requirements, venue rules, and emergency services instructions for your event.",
    sections: [
      {
        heading: "Decide Why You Need A Backup Admin",
        paragraphs: [
          "A backup admin is not just an extra person with access. The role exists because live events create practical interruptions: the main organizer may lose signal, answer a participant question, speak to venue staff, or need to step away from the device.",
          "Define the backup admin's purpose before sending an invite. That keeps the role useful and prevents avoidable conflicts during a live moment.",
        ],
        bullets: [
          "Keep live updates moving if the primary organizer is unavailable.",
          "Help manage chants, announcements, questions, or participant support workflows.",
          "Provide continuity if a device battery, browser session, or connection fails.",
        ],
      },
      {
        heading: "Choose Someone Who Understands The Plan",
        paragraphs: [
          "The best backup admin is usually a trusted person who already understands the event purpose, timing, communication style, and safety boundaries. Technical confidence helps, but judgment matters more than speed.",
          "Do not add every enthusiastic volunteer as an admin. Keep editing access limited to people who need it and can follow the agreed live plan.",
        ],
        bullets: [
          "They know the event schedule, meeting point, and fallback plan.",
          "They can use short, neutral participant-facing language.",
          "They know when to escalate rather than improvise a major decision.",
        ],
      },
      {
        heading: "Brief The Role In Plain Language",
        paragraphs: [
          "A backup admin should know exactly what they can do, what they should avoid changing, and who makes the final call if the plan changes. A short written brief is enough for most events.",
          "Keep the brief operational. The person should be able to open the admin view and understand what action is expected under normal conditions and under a handoff.",
        ],
        bullets: [
          "What they may update: chants, status messages, participant guidance, or approved announcements.",
          "What they should not update without confirmation: route, timing, venue, or sensitive incident information.",
          "Who confirms changes: the event lead, communication lead, or another named role.",
        ],
      },
      {
        heading: "Test Access Before Participants Arrive",
        paragraphs: [
          "Backup access should never be tested for the first time during a live event. Ask the backup admin to sign in, open the event, confirm they can see the right controls, and complete one harmless test action before the event starts.",
          "This catches expired invites, wrong accounts, permission gaps, and device issues while there is still time to fix them.",
        ],
        bullets: [
          "Confirm the backup admin can open the event from their own device.",
          "Check that they can find the participant link and live controls.",
          "Run one test handoff or status update before the event is public.",
        ],
      },
      {
        heading: "Agree On Handoff Signals",
        paragraphs: [
          "The most common backup-admin problem is not missing access; it is unclear control. If two people both think they are leading live updates, participants may receive inconsistent messages.",
          "Before going live, decide how the primary organizer will ask for help, how the backup admin will confirm control, and how control returns afterward.",
        ],
        bullets: [
          "Use one phrase for temporary help, such as 'please take live updates for five minutes'.",
          "Use one phrase for return of control, such as 'I have the live page again'.",
          "If the main device fails, define who is allowed to take over and when.",
        ],
      },
      {
        heading: "Keep Participant Communication Consistent",
        paragraphs: [
          "Backup admins should use the same participant language as the main organizer. This matters most when the event is delayed, moved, paused, or handling a support issue.",
          "Prepare short message templates in advance. Consistent wording reduces confusion and makes handoffs easier for volunteers who repeat updates aloud or point people to a written version.",
        ],
        bullets: [
          "Delay message: what changed, what participants should do now, and where to watch for updates.",
          "Movement message: where to go, how to get help, and what landmark or sign to look for.",
          "Support message: who can answer access, joining, or participant-support questions.",
        ],
      },
      {
        heading: "Use ChantLive To Make The Handoff Concrete",
        paragraphs: [
          "ChantLive supports this workflow when organizers invite trusted admins before the event, keep participant access details in one place, and use live controls as the shared source of truth.",
          "Treat backup-admin setup as part of readiness, not a last-minute fix. The result should be simple: if the primary organizer loses access, another prepared person can continue the live flow without guessing.",
        ],
        bullets: [
          "Invite at least one backup admin before the event goes live.",
          "Give them the participant link, fallback instructions, and event role brief.",
          "Confirm they can operate from their own device before participants arrive.",
        ],
      },
    ],
  },
  {
    slug: "post-event-review-questions-peaceful-events",
    title: "Post-Event Review Questions for Peaceful Events",
    description:
      "A practical post-event review checklist for peaceful demonstrations and community events, covering communication, accessibility, safety planning, volunteer roles, and participant feedback.",
    publishedAt: "2026-08-23",
    category: "Review",
    readingMinutes: 7,
    tags: ["post-event-review", "debrief", "accessibility", "organizing"],
    disclaimer:
      "This article is general event-planning information only. It is not legal, medical, emergency-response, or security advice. Follow local authority requirements, venue rules, and emergency services instructions when reviewing incidents or future safety changes.",
    sections: [
      {
        heading: "Review While The Details Are Fresh",
        paragraphs: [
          "A useful review happens soon enough that people remember what actually happened, but not so quickly that the team only reacts to stress. Aim for a short first debrief within a day or two, then capture any deeper follow-up after participants and volunteers have had time to respond.",
          "Keep the tone practical. The goal is to improve the next event, not to assign blame or rewrite decisions with hindsight.",
        ],
        bullets: [
          "What was supposed to happen?",
          "What actually happened?",
          "What should we repeat, change, or stop doing next time?",
        ],
      },
      {
        heading: "Compare The Plan With The Real Arrival Flow",
        paragraphs: [
          "Arrival is where many event plans first meet reality. Review whether people found the right place, understood the first instruction, could join the live page, and knew who could answer basic questions.",
          "Look for specific friction rather than general impressions. A vague note such as 'arrival was confusing' is less useful than naming the sign, link, meeting point, or volunteer handoff that caused the confusion.",
        ],
        bullets: [
          "Did participants find the meeting point without extra messages?",
          "Did QR codes, short links, and printed instructions work for late arrivals?",
          "Were accessibility notes visible before people needed them?",
        ],
      },
      {
        heading: "Ask Whether Communication Stayed Consistent",
        paragraphs: [
          "Peaceful events depend on consistent updates. Review what participants heard, what volunteers repeated, and where messages diverged from the plan.",
          "If the team used several communication channels, identify which one was treated as the source of truth and whether participants knew to check it.",
        ],
        bullets: [
          "Which updates were clear the first time?",
          "Which updates had to be repeated or corrected?",
          "Did volunteers use the same wording for timing, route, meeting-point, or fallback changes?",
        ],
      },
      {
        heading: "Include Accessibility And Participation Signals",
        paragraphs: [
          "A review should include people who experienced the event differently from the core organizing team. Accessibility, language, mobility, confidence, device access, and late arrival can all change whether someone felt able to participate.",
          "Treat these signals as design input. If several people needed the same workaround, the workaround should become part of the next plan.",
        ],
        bullets: [
          "Who could not scan, hear, see, move, or follow updates as expected?",
          "Which formats helped most: spoken instructions, printed text, signs, QR codes, or live pages?",
          "What would make quiet participation or late joining easier next time?",
        ],
      },
      {
        heading: "Review Volunteer Roles And Handoffs",
        paragraphs: [
          "Volunteer problems often come from unclear ownership, not unwillingness. Review whether each role had a clear purpose, whether helpers knew when to escalate, and whether the event lead or communication lead was overloaded.",
          "Keep the result concrete. Update the role list, the briefing script, or the handoff point before the next event rather than relying on people to remember the lesson.",
        ],
        bullets: [
          "Which roles were essential?",
          "Which roles were unclear, duplicated, or missing?",
          "Where did a volunteer need authority, information, or a backup person earlier?",
        ],
      },
      {
        heading: "Turn Feedback Into A Short Action List",
        paragraphs: [
          "A long debrief document can become another artifact nobody uses. Convert the review into a short action list with owners, dates, and one test for each change.",
          "Separate urgent fixes from useful improvements. Urgent items affect safety, access, legality, or participant trust. Useful improvements make the next event smoother but should not bury the urgent work.",
        ],
        bullets: [
          "Fix before next event: the highest-risk or highest-friction issue.",
          "Test before next event: the joining, communication, or fallback flow that failed.",
          "Document for volunteers: the one role or script change everyone needs to know.",
        ],
      },
      {
        heading: "Use ChantLive To Preserve Practical Evidence",
        paragraphs: [
          "ChantLive can help organizers review the practical flow of an event: which chants were used, which live updates mattered, how participants joined, and what questions, reports, or poll outcomes were captured without creating participant rosters.",
          "Use that record to improve the next run. The most useful review output is not a perfect narrative; it is a clearer participant path, a better volunteer brief, and fewer avoidable surprises next time.",
        ],
        bullets: [
          "Save chant lists and live update patterns that worked.",
          "Review participant access and fallback points without collecting unnecessary identities.",
          "Use post-event notes to update the next event template before planning starts again.",
        ],
      },
    ],
  },
  {
    slug: "backup-communication-weak-mobile-signal",
    title: "How to Plan Backup Communication When Mobile Signal Is Weak",
    description:
      "A practical guide for peaceful event organizers preparing backup communication when crowds, weak mobile signal, noise, or device failures make the main channel unreliable.",
    publishedAt: "2026-08-16",
    category: "Communication",
    readingMinutes: 7,
    tags: ["communication", "backup-plan", "mobile-signal", "accessibility"],
    disclaimer:
      "This article is general event-planning information only. It is not emergency-response, legal, medical, or security advice. Follow local authority requirements, venue rules, and emergency services instructions for your event.",
    sections: [
      {
        heading: "Assume The Main Channel May Slow Down",
        paragraphs: [
          "Mobile signal can degrade when a crowd gathers, when nearby networks are busy, or when participants are moving between buildings, streets, or transit areas. A backup communication plan starts from the assumption that the main channel may become delayed rather than completely unavailable.",
          "Plan for partial failure: some people can load updates, some cannot, some receive them late, and some need the same message repeated in a different format.",
        ],
        bullets: [
          "Identify the messages that must still reach people if mobile data slows down.",
          "Decide which updates can wait until signal improves.",
          "Prepare one fallback method before participants arrive.",
        ],
      },
      {
        heading: "Define The Essential Messages",
        paragraphs: [
          "A backup plan is strongest when it protects a short list of essential messages. If every detail is treated as urgent, volunteers will not know what to repeat first.",
          "For most peaceful events, the essential messages are location, start status, route or meeting-point changes, accessibility updates, and where participants can ask for help.",
        ],
        bullets: [
          "Where should participants gather right now?",
          "Has the start time, route, or meeting point changed?",
          "Who can answer access, joining, or participant-support questions?",
        ],
      },
      {
        heading: "Use One Digital Path And One Physical Fallback",
        paragraphs: [
          "Multiple apps, chat threads, and social feeds can fragment the group. Choose one digital source of truth, then pair it with one physical or human fallback that works when phones are slow.",
          "The fallback should be simple enough that a volunteer can explain it in one sentence. Examples include a printed handout, a visible sign, a pre-briefed welcome point, or a runner who relays approved updates between fixed locations.",
        ],
        bullets: [
          "Digital path: the live page, participant link, or official event update.",
          "Physical fallback: printed short link, sign, handout, or volunteer script.",
          "Shared wording: use the same phrases across both paths.",
        ],
      },
      {
        heading: "Prepare Volunteers To Relay, Not Improvise",
        paragraphs: [
          "Weak signal creates a high risk of inconsistent instructions. Volunteers should know who approves changes, which exact words to repeat, and which questions should be escalated instead of answered from memory.",
          "A short briefing is enough if the roles are concrete. The aim is not to create a command structure; it is to prevent five well-meaning people from giving five different directions.",
        ],
        bullets: [
          "Event lead: approves schedule, route, and meeting-point changes.",
          "Communication lead: writes the current participant update.",
          "Relay volunteers: repeat only the approved short message.",
        ],
      },
      {
        heading: "Make The Backup Accessible",
        paragraphs: [
          "A backup channel is not useful if only some participants can use it. Printed text, spoken announcements, signs, QR codes, and live pages all have different access strengths and weaknesses.",
          "Use more than one format for the same essential message. This helps people who cannot scan a QR code, cannot hear a spoken update clearly, need larger text, arrive late, or prefer to follow quietly on their own device.",
        ],
        bullets: [
          "Print the short link in large, plain text beside the QR code.",
          "Keep walkways clear around signs and support points.",
          "Ask volunteers to repeat updates calmly and point to the written version.",
        ],
      },
      {
        heading: "Run A Five-Minute Signal Test",
        paragraphs: [
          "The best test is practical and short. Before the event starts, have one person load the digital path, one person use the fallback, and one person ask a late-arrival question.",
          "This reveals problems in wording, signage, volunteer handoff, and device readiness before the crowd is depending on the plan.",
        ],
        bullets: [
          "Test the participant page from more than one phone if possible.",
          "Confirm the short link can be read aloud and typed accurately.",
          "Ask a volunteer to relay one approved change message without rewriting it.",
        ],
      },
      {
        heading: "Use ChantLive As One Layer",
        paragraphs: [
          "ChantLive can help by giving organizers one live page, a QR code, a short participant link, and backup-admin access for trusted helpers. That makes it easier to keep digital updates consistent when signal is uneven.",
          "It should still be paired with offline-ready fallbacks. Print the link, brief volunteers, and prepare a simple message for delay, route change, or moved meeting point before the event goes live.",
        ],
        bullets: [
          "Add the participant link to volunteer notes before arrival.",
          "Print or display the same link beside the QR code.",
          "Invite a backup admin so live updates can continue from another device.",
        ],
      },
    ],
  },
  {
    slug: "write-easy-to-follow-chants",
    title: "How to Write Chants That Are Easy to Follow",
    description:
      "A practical guide to writing short, clear, accessible chants for peaceful demonstrations and community events, with call-and-response structure, pacing, testing, and live delivery tips.",
    publishedAt: "2026-08-09",
    category: "Communication",
    readingMinutes: 7,
    tags: ["chants", "communication", "accessibility", "live-events"],
    sections: [
      {
        heading: "Start With One Message",
        paragraphs: [
          "A chant is easier to follow when it carries one idea at a time. If a line tries to explain the full campaign, the crowd has to read, remember, and repeat too much while standing, moving, listening, or watching for updates.",
          "Write the message in plain speech first, then trim it until it can be understood after hearing it once.",
        ],
        bullets: [
          "Use one main verb or action in each chant.",
          "Avoid long clauses, abbreviations, and insider language.",
          "Read the chant aloud before deciding it works on a page.",
        ],
      },
      {
        heading: "Use Call And Response On Purpose",
        paragraphs: [
          "Call and response works because participants only need to learn the next small piece. A leader gives the cue, the crowd answers, and the rhythm teaches the pattern through repetition.",
          "Keep the response shorter than the call when possible. The crowd should feel confident joining by the second or third round, not after a long explanation.",
        ],
        bullets: [
          "Leader line: introduces the idea or question.",
          "Crowd line: repeats the clearest phrase or answer.",
          "Repeat the same structure enough times for late joiners to catch up.",
        ],
      },
      {
        heading: "Choose Words That Travel Through Noise",
        paragraphs: [
          "Crowds, traffic, wind, masks, and distance can blur speech. Strong chant words are usually short, concrete, and easy to distinguish when heard imperfectly.",
          "If two key words sound similar, participants may lose confidence and go quiet. Test the chant from several steps away, not only beside the person leading it.",
        ],
        bullets: [
          "Prefer short words with clear consonants.",
          "Avoid tongue-twisters and repeated similar sounds.",
          "Keep the most important phrase at the end of the line where people naturally listen for the response.",
        ],
      },
      {
        heading: "Make The Rhythm Forgiving",
        paragraphs: [
          "A chant does not need to be musically complex to be powerful. In real event conditions, a steady pulse and predictable pause matter more than clever wording.",
          "Leave room to breathe. If the leader has to rush, the crowd will rush too, and anyone reading from a phone or using assistive technology may fall behind.",
        ],
        bullets: [
          "Keep lines close to the same length.",
          "Add a pause between call and response.",
          "Test whether people can join while walking slowly or looking up from a phone.",
        ],
      },
      {
        heading: "Design For Accessibility",
        paragraphs: [
          "Accessible chanting means people can participate in more than one way. Some participants may not speak loudly, may need written prompts, may join late, or may prefer to follow quietly while still being part of the event.",
          "Give the chant a visual path as well as a spoken path. A live page, printed sheet, large sign, or volunteer cue can help people join without needing to catch every word by ear.",
        ],
        bullets: [
          "Write chants in large, plain text on participant materials.",
          "Avoid making volume the only sign of participation.",
          "Offer a short link or QR fallback for people who want the words on their own device.",
        ],
      },
      {
        heading: "Test With Real People Before Going Live",
        paragraphs: [
          "The fastest chant test is simple: ask two or three people who did not write it to follow the leader once, then explain what they think the chant means.",
          "If they stumble over the same word, miss the response cue, or interpret the message differently, revise the chant before the event starts.",
        ],
        bullets: [
          "Test one quiet read, one spoken call-and-response round, and one louder round.",
          "Ask whether the response is obvious without looking at the text.",
          "Keep the best version and remove weaker alternatives from the live list.",
        ],
      },
      {
        heading: "Use ChantLive To Keep Everyone Together",
        paragraphs: [
          "ChantLive can help organizers publish a simple live chant list, show which line the leader is on, and give participants a phone-friendly way to follow when sound or sightlines are difficult.",
          "It works best when the chant itself is already clear. Use the tool to reduce timing confusion, support late joiners, and give backup admins a shared source of truth.",
        ],
        bullets: [
          "Add only polished chants to the live event before participants arrive.",
          "Use short titles so volunteers can find the right chant quickly.",
          "Invite a backup admin who can keep the chant flow moving if the main leader is busy.",
        ],
      },
    ],
  },
  {
    slug: "permit-preparation-questions-peaceful-demonstration",
    title: "Permit Preparation Questions to Ask Before a Peaceful Demonstration",
    description:
      "A practical, non-legal checklist of permit preparation questions for peaceful demonstrations, covering location, timing, sound, routes, accessibility, and day-of communication.",
    publishedAt: "2026-07-26",
    category: "Planning",
    readingMinutes: 7,
    tags: ["permits", "planning", "accessibility", "communication"],
    disclaimer:
      "Permit and public-assembly rules vary by location, venue, event type, crowd size, sound use, and route. This article is general planning information only, not legal advice. Check current official local requirements or a qualified advisor before relying on permit guidance.",
    sections: [
      {
        heading: "Start With The Event Shape",
        paragraphs: [
          "Permit research becomes easier when organizers can describe the event in plain operational terms. Before looking at forms, write down whether the gathering is stationary or moving, public or private, small or large, silent or amplified, and indoors or outdoors.",
          "This helps you ask the right questions instead of searching for one universal rule that may not exist.",
        ],
        bullets: [
          "Where will people gather, enter, move, and leave?",
          "What date, start time, end time, and backup timing are you planning?",
          "Will the event use signs, chants, speeches, music, tables, stages, vehicles, or amplified sound?",
        ],
      },
      {
        heading: "Ask Which Authority Owns The Space",
        paragraphs: [
          "A demonstration in a park, plaza, street, campus, private venue, or council-managed space may point to different rules and contacts. The first practical question is not only whether a permit is needed, but who has authority over the location.",
          "If more than one authority is involved, organizers may need to coordinate information across venue staff, local government, transport, parks, or public-safety offices.",
        ],
        bullets: [
          "Who manages the exact location and nearby paths?",
          "Does the event affect roads, footpaths, parks, transit stops, or building entrances?",
          "Is there a venue policy separate from any public permit process?",
        ],
      },
      {
        heading: "Check Timing And Submission Windows Early",
        paragraphs: [
          "Many official event processes ask for advance notice, especially when services, route review, road impacts, sound, sanitation, or accessibility planning are involved. Waiting until the final week can remove options even when the event itself is simple.",
          "Treat deadlines as planning inputs. If the event is a rapid response to current events, record that context and check whether the authority explains any urgent or late-request process.",
        ],
        bullets: [
          "What is the earliest date applications can be submitted?",
          "What is the normal deadline, and is there a different process for short-notice events?",
          "Which supporting materials are required before review can begin?",
        ],
      },
      {
        heading: "Separate Sound, Route, And Service Questions",
        paragraphs: [
          "Permit needs often depend on details that organizers think of as logistics: amplified sound, movement routes, road crossings, tables, power, waste, toilets, first aid, and other services. Put each detail in its own question so one missing item does not delay the whole plan.",
          "This also helps volunteers understand which parts of the event are confirmed and which are still waiting on approval or coordination.",
        ],
        bullets: [
          "Is amplified sound allowed, and are there time, location, or equipment limits?",
          "Does any march route, crossing, or crowd movement require review?",
          "Are maps, site plans, vendor details, sanitation plans, or service requests needed?",
        ],
      },
      {
        heading: "Include Accessibility In The First Draft",
        paragraphs: [
          "Accessibility should not be a late addition after the permit questions are answered. Official and institutional event guidance commonly asks organizers to plan for accessible locations, routes, communication, seating or rest areas, and accommodation requests.",
          "Even when a form does not ask much about access, your participant plan should. People need to know whether they can arrive, navigate, understand updates, and leave without avoidable barriers.",
        ],
        bullets: [
          "What accessible arrival route, entrance, and meeting point can you describe clearly?",
          "How will participants request access information or accommodations before the event?",
          "Will printed signs, QR codes, spoken updates, and live pages work for different access needs?",
        ],
      },
      {
        heading: "Prepare A Day-Of Information Pack",
        paragraphs: [
          "Once permit or venue information is gathered, turn it into a short day-of pack. The goal is not to make every volunteer read a long application. The goal is to give trusted helpers the details they need to keep instructions consistent.",
          "Keep the pack practical: approved location, timing, contacts, route notes, sound limits, accessibility notes, and what to do if plans change.",
        ],
        bullets: [
          "Save permit confirmations or venue emails where the event lead can access them.",
          "Give volunteers the same wording for meeting point, timing, route, and fallback updates.",
          "Mark any conditions that affect signs, sound, movement, tables, or participant support.",
        ],
      },
      {
        heading: "Connect The Permit Plan To Live Communication",
        paragraphs: [
          "Permit preparation only helps participants if the final details reach them clearly. Before publishing invitations, convert the confirmed plan into a short arrival note, a fallback update, and a volunteer script.",
          "ChantLive can support this by giving organizers one participant page, a QR code, a short link, and live prompts that reflect the confirmed schedule or location. It works best alongside printed or spoken fallbacks for people who cannot scan or lose signal.",
        ],
        bullets: [
          "Put the confirmed meeting point and arrival guidance on participant-facing materials.",
          "Prepare one short message for a delayed start, route change, or moved meeting point.",
          "Invite a backup admin before the event so live updates can continue if the main organizer is busy.",
        ],
      },
    ],
  },
  {
    slug: "low-friction-participation-peaceful-events",
    title: "How to Make Participation Feel Easy at a Peaceful Event",
    description:
      "A practical guide to helping more people join peaceful demonstrations and community events without overwhelming them before, during, or after arrival.",
    publishedAt: "2026-07-19",
    category: "Participation",
    readingMinutes: 7,
    tags: ["participation", "organizing", "communication", "accessibility"],
    disclaimer:
      "This article is general event-planning information only. It is not legal, medical, security, or emergency-response advice. Follow local authority requirements, venue rules, and emergency services instructions for your event.",
    sections: [
      {
        heading: "Reduce The First Step",
        paragraphs: [
          "People often want to support a community event but hesitate when the first step feels too large. A helpful invitation does not ask them to understand every detail immediately. It gives them one clear action they can take now.",
          "Before you publish the event, write the participant path as a simple sentence: where to arrive, when to arrive, what to do first, and how to get updates if something changes.",
        ],
        bullets: [
          "Use one main call to action such as 'arrive at the north entrance by 4:45'.",
          "Keep optional background reading separate from arrival instructions.",
          "Repeat the same first step in posts, messages, handouts, and volunteer scripts.",
        ],
      },
      {
        heading: "Offer Small Roles Before Big Commitments",
        paragraphs: [
          "Not everyone is ready to lead, speak, marshal, or stay for the whole event. Low-pressure roles make participation possible for people with limited time, confidence, mobility, or energy.",
          "Small roles also help organizers learn who is reliable before asking for larger responsibilities later.",
        ],
        bullets: [
          "Invite people to share the event link with three trusted contacts.",
          "Ask for short, time-boxed help such as greeting arrivals for 15 minutes.",
          "Create quiet roles like checking printed links, bringing spare signs, or noting post-event feedback.",
        ],
      },
      {
        heading: "Make The Event Understandable Before Arrival",
        paragraphs: [
          "A participant should not have to ask a private question to understand the basics. Publish the schedule, location, joining method, accessibility notes, and expected finish time in plain language.",
          "This is especially important for people deciding whether the event is realistic for their transport, care responsibilities, disability access needs, or comfort level.",
        ],
        bullets: [
          "Name the meeting point and any step-free route or entrance details you know.",
          "Say what participants should bring and what they do not need to bring.",
          "Share whether chants, signs, speeches, movement, or quiet presence are expected.",
        ],
      },
      {
        heading: "Use Reminders That Help Instead Of Pressure",
        paragraphs: [
          "Useful reminders make attendance easier. Pressure-heavy messages can make people feel guilty, crowded, or unsure whether they still belong if they arrive late.",
          "Send reminders that answer practical questions: when to leave, where to gather, how to join the live page, and what to do if plans change.",
        ],
        bullets: [
          "One week before: share purpose, time, location, and basic access notes.",
          "One day before: repeat arrival details and the participant link.",
          "On the day: send the simplest version of the plan and the fallback joining option.",
        ],
      },
      {
        heading: "Design For People Joining Late",
        paragraphs: [
          "Late arrivals are normal. Transport delays, work, care duties, and crowd movement all affect real events. If late joining feels awkward, people may give up before they participate.",
          "Prepare one visible place or digital page where late arrivals can quickly find the current chant, next instruction, and support contact.",
        ],
        bullets: [
          "Keep the QR code and short link visible after the event starts.",
          "Assign one volunteer to help late arrivals without interrupting the main flow.",
          "Use clear live status language such as waiting, live, paused, moved, or ended.",
        ],
      },
      {
        heading: "Keep The Live Experience Predictable",
        paragraphs: [
          "Participants stay engaged when they can understand the rhythm of the event. For chants, that means knowing who speaks first, when the crowd responds, and where to look if they miss a line.",
          "ChantLive can support this by giving organizers one participant page, a QR code, a short link fallback, and live prompts that reduce guesswork during call-and-response moments.",
        ],
        bullets: [
          "Use short chant lines that can be read at a glance.",
          "Explain turn-taking before the first chant starts.",
          "Invite a backup admin so live prompts can continue if the main organizer gets busy.",
        ],
      },
      {
        heading: "Invite Feedback While The Details Are Fresh",
        paragraphs: [
          "Participation improves when organizers ask what made joining easier or harder. Do this soon after the event, while people still remember the small barriers.",
          "Look for patterns rather than defending the plan. If several people struggled with the same instruction, sign, meeting point, or joining path, that is useful design feedback for the next gathering.",
        ],
        bullets: [
          "Ask what made the event easy to join.",
          "Ask what almost stopped someone from participating.",
          "Turn the answers into one improvement for the next invitation, arrival flow, or live communication plan.",
        ],
      },
    ],
  },
  {
    slug: "volunteer-roles-for-peaceful-events",
    title: "Volunteer Roles Every Peaceful Event Should Assign Before It Starts",
    description:
      "A practical checklist for assigning volunteer roles at peaceful demonstrations and community events so communication, accessibility, and participant support stay clear from the start.",
    publishedAt: "2026-07-05",
    category: "Organizing",
    readingMinutes: 7,
    tags: ["volunteers", "organizing", "accessibility", "communication"],
    disclaimer:
      "This article is general event-planning information only. It is not legal, medical, or security advice. Follow local authority requirements, venue rules, and emergency services instructions for your event.",
    sections: [
      {
        heading: "Assign Roles Before You Recruit Specific People",
        paragraphs: [
          "Volunteer coordination gets easier when organizers define the jobs first and then match people to those jobs. If everyone arrives as a general helper, important tasks can be missed while several people crowd around the same problem.",
          "Start with a short role list that reflects the real needs of the event: who welcomes people, who relays updates, who watches for accessibility barriers, and who keeps the day moving calmly.",
        ],
        bullets: [
          "Write each role in one sentence with a clear handoff point.",
          "Keep the first version small enough that one volunteer can explain it quickly.",
          "Share the same role list in volunteer notes, briefing messages, and printed checklists.",
        ],
      },
      {
        heading: "Name One Event Lead And One Communication Lead",
        paragraphs: [
          "Peaceful events usually need fewer decision-makers than organizers expect. One event lead should own the final call on schedule or location changes, while one communication lead should turn those decisions into short messages participants can actually follow.",
          "Separating those responsibilities reduces mixed instructions. It also makes it easier for volunteers to know whose message should be repeated when the crowd gets noisy or arrivals are still joining.",
        ],
        bullets: [
          "Event lead: approves the plan and any major changes.",
          "Communication lead: writes and repeats the current participant update.",
          "Backup contact: can step in if one of those people becomes unavailable.",
        ],
      },
      {
        heading: "Assign Arrival, QR-Join, And Accessibility Support",
        paragraphs: [
          "The busiest point of confusion is often the first five minutes after people arrive. A welcome volunteer can direct people to the right place, a joining helper can assist with QR codes or short links, and an accessibility helper can watch for barriers that slow participation before the event has properly started.",
          "These roles work best when they are visible and easy to approach. Participants should not need to guess who can answer a basic joining or access question.",
        ],
        bullets: [
          "Welcome volunteer: confirms where people should gather.",
          "Join helper: supports QR scanning and offers the short link fallback.",
          "Accessibility helper: checks whether signs, spoken instructions, and joining paths are working for different participants.",
        ],
      },
      {
        heading: "Use Marshals Or Stewards For Flow, Not For Improvisation",
        paragraphs: [
          "If your event uses marshals or stewards, keep their role focused on calm crowd flow, visible guidance, and relaying agreed instructions. They should know the route or layout, the fallback meeting point, and who to contact when something needs escalation.",
          "A short written brief is better than relying on memory. Volunteers make steadier decisions when they know what they are responsible for and what should be passed back to the event lead.",
        ],
        bullets: [
          "Give marshals one simple map or movement plan if the event includes movement.",
          "Tell them which issues they should report instead of trying to solve alone.",
          "Use the same wording for regroup points, timing changes, and support contacts.",
        ],
      },
      {
        heading: "Create A Small Participant Support Team",
        paragraphs: [
          "Not every useful volunteer role needs to be high visibility. A small participant support team can answer routine questions, help people find rest points or facilities, and notice when someone needs practical assistance or a quieter explanation.",
          "This role helps the whole event feel more organized because participants know there is a human place to go for non-urgent help instead of interrupting the main speaker or crowd lead.",
        ],
        bullets: [
          "Keep one support point or roaming helper available during arrival and transitions.",
          "Prepare answers for the most common questions: timing, joining, location changes, and who to ask next.",
          "Agree in advance how volunteers should escalate urgent concerns to official services or venue staff when needed.",
        ],
      },
      {
        heading: "Brief Everyone In Ten Minutes And Test The Handoffs",
        paragraphs: [
          "A short live briefing is more useful than a long document. Walk through each role, say who gives the final instruction, and test one realistic scenario such as a delayed start or a participant who cannot scan the main QR code.",
          "ChantLive can help here because organizers can prepare the participant page, share the same short link with volunteers, and invite a backup admin before people arrive. That makes the handoff between welcome, communication, and support roles much cleaner.",
        ],
        bullets: [
          "Ask each volunteer to repeat their role in one sentence.",
          "Run one message test from the event lead to the communication lead to the volunteer team.",
          "Confirm the ChantLive join link, printed fallback, and backup admin are ready before the start time.",
        ],
      },
    ],
  },
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
