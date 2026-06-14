# Weekly ChantLive Blog Automation

Automation id: `weekly-chantlive-blog-post`

Suggested cadence: weekly, Sunday 6:30 PM Australia/Sydney.

## Goal

Publish one practical, safety-focused, community-useful ChantLive blog post each week.

Each post should help peaceful event organizers, participants, or open-source contributors understand one concrete topic such as participation, permits, accessibility, safety planning, backup communication, volunteer roles, QR-code fallback, live chant design, or post-event review.

## Weekly Instructions

Work in `C:\Documents\SourceCodes\barsham\ChantLive` on `main`.

1. Sync `main` from origin and inspect the working tree.
2. Pick one useful topic for organizers or participants.
3. Keep the article practical, neutral, peaceful, and non-partisan.
4. If covering permits, laws, public assembly rules, medical safety, or security risk, include a clear disclaimer and avoid location-specific claims unless verified from current official sources.
5. Add the post to `shared/blog.ts`.
6. Add the post URL to `client/public/sitemap.xml`.
7. Update `shared/changelog.json`, bump the app version, and generate release notes.
8. Run `npm run check`, `git diff --check`, and `npm run build`.
9. Push to `main` only if verification passes and the tree contains only intentional changes.
10. Notify Barsham that a new blog post is ready to deploy.

## Suggested Topic Backlog

- How to get more people to participate without overwhelming them
- Permit preparation questions to ask before a demonstration
- Accessibility checklist for QR-code participant joining
- Safety roles every peaceful event should assign
- How to write chants that are easy to follow
- Backup communication plans for weak mobile signal
- What to review after a demonstration
- How to invite and prepare backup admins in ChantLive

## Content Standard

- One clear title.
- One short SEO description.
- Five to seven useful sections.
- Specific checklists or examples where possible.
- No legal advice, medical advice, or unsafe operational guidance.
- A practical connection back to ChantLive only where it genuinely helps.
