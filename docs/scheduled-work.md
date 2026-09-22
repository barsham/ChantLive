# ChantLive scheduled work

Consolidated on 7 September 2026; promotion reset on 19 September 2026.
All times are Australia/Sydney local time. The active adoption plan is
[Promotion Strategy V3](promotion-strategy-v3.md); V2 is historical.

| Job | Schedule | Responsibility |
| --- | --- | --- |
| Enhancement | Sunday 18:00 | GitHub issues, meaningful product workflows, quality checks and verified releases |
| Promotion & Content | Monday, Wednesday, Friday 18:00 | Prepared-rehearsal acquisition, distribution and evidence; weekly blog on Monday only |
| Outreach & Feedback | Monday-Friday 10:00 | Inbox and public reply monitoring, interested testers, follow-up drafts and feedback |

The blog is part of Promotion & Content, not a separate competing job. Old daily
improvement runs are history; only the Enhancement conversation receives its
schedule. The former outreach schedule was absent from the saved configuration;
Outreach & Feedback restores that responsibility in the existing outreach chat.

## Shared workflow

- Read the current adoption strategy, experiment ledger, contact ledger and
  account records. Verify current status rather than blindly repeating an old
  next step. One offer/audience hypothesis can use up to two separately tracked,
  permitted public placements. Support for an existing contact runs independently
  and must not freeze acquisition. An access blocker gets two business days before
  that platform is parked and another permitted route is evaluated.
- Promotion defines the audience, offer, permitted channel, prediction, review
  date and stop condition. Outreach monitors replies and helps interested testers.
  Enhancement uses reproducible feedback to improve the product.
  Do not invent feature work or extra content to substitute for adoption evidence.
- Keep direct communication drafts and sent messages clearly distinguished.
  Send or post only when explicit user authorization covers the action. Preserve
  the existing cold-email pause, suppressed contacts and opt-outs.
- Read the complete available conversation before assessing tone or drafting a
  reply. Disclose missing history. Never assume that an old draft was sent.
- Count observed test starts, completed tests and specific findings as adoption
  evidence. Delivery, impressions, accounts, drafts and published posts are
  supporting activity, not successful product use.
- Do not repeat unchanged blocker notifications. Notify on meaningful completed
  work, new qualified interest, a new failure, or required user action.
- Check other project tasks and the working tree before editing shared files.
  Preserve user work; defer conflicting edits. Scheduled jobs must not push
  held or unrelated local commits. Honor explicit commit-only/deployment holds.
- Follow `release-checklist.md`: group all release code, versions, generated notes
  and documentation in one reviewed commit. Report commit, push and actual
  deployment status separately. Documentation-only changes do not require a
  product version bump or application build.

## Continuity notes

- The SendGrid test from `info@chantlive.online` reached the maintainer's Gmail
  mailbox. The separate issue 16 task subsequently reports Better Auth v1.1.92
  deployed and migration/production checks completed. Reverify the live flow
  before claiming an interested tester's registration problem is resolved.
- Vanessa's recovery reply and one follow-up were sent and verified in Zoho.
  Outreach monitors for her response and must not send another follow-up.
- The July 5 volunteer-role post exists in `shared/blog.ts`; its old blocked-run
  conversation should not cause another duplicate article. The interrupted July
  12 blog run had no completed implementation to resume.
- Old one-off and automation-run chats are archived, not deleted. Their history
  is recoverable. Keep the three canonical job chats and the coordination chat.

## Automation identifiers

- Enhancement: `daily-chantlive-oss-improvements` (legacy identifier retained).
- Promotion & Content: `chantlive-weekly-answerthepublic-blog-post`.
- Outreach & Feedback: `chantlive-outreach-feedback`.

Scheduling changes must use the Codex automation tool. This document describes
the schedule; it does not itself create or update scheduled jobs.
