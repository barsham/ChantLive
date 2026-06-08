# ChantLive Community Outreach Kit

ChantLive is free and open source. Outreach should invite practical critique from organizers, participants, accessibility reviewers, and civic-tech developers rather than read like an ad.

## Positioning

Use this short description consistently:

> ChantLive is a free, open-source real-time chant coordination tool for demonstrations and events. Organizers control the current chant, and participants join from a public link or QR code with no login.

## Primary Audiences

- Demonstration organizers and event marshals
- Labor, student, climate, faith, mutual-aid, and civic groups
- Accessibility advocates who review public event workflows
- Civic-tech and public-interest technology communities
- Open-source developers interested in realtime React/Node tools

## Links

- Live app: https://chantlive.online/
- Source code: https://github.com/barsham/ChantLive
- Accessibility guidance: https://github.com/barsham/ChantLive/blob/main/docs/qr-accessibility.md
- Issues and feedback: https://github.com/barsham/ChantLive/issues

## Outreach Rules

- Be transparent that you are the maintainer or contributor.
- Ask moderators before posting in communities with strict self-promotion rules.
- Lead with the problem and the request for feedback, not the technology stack.
- Do not imply endorsement from any movement, organization, or community.
- Avoid posting in places where a public organizing tool could put people at risk.
- Ask for specific critique: trust, safety, accessibility, event fit, and missing features.

## Feedback Questions

- Would this help at an actual demonstration, rally, march, vigil, meeting, or public event?
- What would make you trust or not trust this tool?
- What information should participants see before joining?
- What would organizers need during poor mobile signal or high crowd noise?
- Is the QR code and public-link flow accessible enough?
- What privacy or safety concerns should be addressed before broader use?
- Should ChantLive support self-hosting instructions for groups that need tighter control?

## Forum Targets

Always check current rules before posting.

| Audience | Places to try | Angle |
| --- | --- | --- |
| Organizers | Local activist groups, union/student group forums, campaign Discords, Facebook groups, Signal/Matrix communities where invited | Ask whether the workflow matches real event needs |
| Civic tech | Code for local chapters, civic-tech Slack/Discord groups, public-interest tech forums | Ask for product, privacy, and deployment feedback |
| Open source | GitHub Discussions, r/opensource, r/selfhosted, r/webdev, Hacker News Show HN | Ask for code, security, self-hosting, and contribution feedback |
| Product feedback | r/SideProject, Indie Hackers, freeCodeCamp Project Feedback | Ask whether the landing message and first-use flow are clear |
| Accessibility | Accessibility Slack/Discord groups, inclusive design forums, web accessibility communities | Ask for QR, screen reader, reduced-motion, and live-update review |

## Moderator Message

```text
Hi mods,

I maintain ChantLive, a free and open-source real-time chant coordination tool for demonstrations and events:

https://chantlive.online/
https://github.com/barsham/ChantLive

Organizers create a chant list and push the current chant live. Participants join with a public link or QR code and do not need an account.

Would it be appropriate to post here asking for feedback from people who organize or support public events? I would be transparent that I maintain the project, and the post would ask for critique rather than promotion.

Thanks for considering it.
```

## General Forum Post

```text
Hi everyone,

I built ChantLive, a free and open-source real-time chant coordination tool for demonstrations and events.

The problem: printed chant sheets and shouted instructions can fail in large, noisy, fast-moving crowds.

With ChantLive, organizers create a chant list and push the current chant live. Participants join from a public link or QR code, with no login required.

Live app: https://chantlive.online/
Source: https://github.com/barsham/ChantLive

I am looking for practical feedback:

- Would this help at real events?
- What would make you trust or not trust it?
- What is missing before an organizer should rely on it?
- Are there privacy, safety, or accessibility concerns I should address more clearly?

Critical feedback is very welcome.
```

## Organizer-Focused Post

```text
Hi everyone,

I maintain ChantLive, a free open-source tool for coordinating chants at demonstrations and public events:

https://chantlive.online/

The idea is simple: an organizer controls the current chant, and participants open a public link or QR code to see live updates. Participants do not sign in.

I am trying to learn whether this fits real organizing workflows before adding more features.

If you have helped organize a rally, march, vigil, union action, student event, or community gathering:

- Would this be useful in the field?
- What would make it unsafe, confusing, or impractical?
- What fallback would you need if mobile signal is poor?
- What would you want participants to know before joining?

The project is open source here:
https://github.com/barsham/ChantLive
```

## Developer-Focused Post

```text
I built ChantLive, a free/open-source realtime web app for demonstrations and events:

https://chantlive.online/
https://github.com/barsham/ChantLive

Stack: React, TypeScript, Vite, Tailwind, Express, PostgreSQL, Drizzle, Socket.IO.

The core flow is that admins manage chant lists and push one chant live, while participants join a public URL or QR code without logging in.

I would appreciate feedback on:

- Realtime reliability and failure modes
- Security and privacy expectations for public events
- Self-hosting needs
- Accessibility of live updates and QR sharing
- Contribution issues that would make the project easier to join

I am especially interested in criticism from people who have built public-interest tools or realtime event software.
```

## Direct Outreach Email

```text
Subject: Could ChantLive help at your events?

Hi [name],

I maintain ChantLive, a free and open-source tool for coordinating chants at demonstrations and public events:

https://chantlive.online/

Organizers create a chant list and push the current chant live. Participants join from a public link or QR code, with no login required.

I am reaching out because your group appears to organize or support public events. I would value your honest feedback:

- Would this be useful in a real event setting?
- What would stop you from using it?
- Are there safety, privacy, or accessibility concerns I should address?

The source code is public here:
https://github.com/barsham/ChantLive

Thank you,
[your name]
```

## Outreach Tracker

Use this table to track where you have posted or asked for permission.

| Date | Community | Contact/post URL | Status | Feedback summary | Follow-up |
| --- | --- | --- | --- | --- | --- |
|  |  |  | Not started |  |  |

## Suggested First Wave

1. Ask permission from 3 organizer communities where you already have trust.
2. Post in one developer feedback forum.
3. Send direct outreach to 10 local or issue-aligned organizations.
4. Open a GitHub Discussion or Issue for community feedback and link it from posts.
5. Summarize feedback publicly into GitHub issues so people can see it shaping the project.
