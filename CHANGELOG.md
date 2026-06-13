# Changelog

All notable public changes to ChantLive are generated from `shared/changelog.json`.

Use GitHub Issues and pull requests for implementation details, then add approved user-facing changes to the structured changelog data before a release.

## 1.1.19 - 13 June 2026

Admin list controls and participant live-status clarity improvements.

### Added

- Dashboard sorting: Organizers can sort demonstrations by newest, oldest, or title so busy event lists are easier to scan.
- Admin user search: Super admins can filter admin users by name, email, or role before reviewing activity and demonstration counts.

### Improved

- Dashboard result count: The dashboard now shows how many demonstrations match the current search and status filters.
- Participant phase guidance: Participant screens now show whether the leader is speaking or everyone should respond during a live chant.
- Participant offline status: Participant screens now show an offline warning when the browser loses network connectivity.

## 1.1.18 - 13 June 2026

Readable demonstration creator labels in the admin dashboard.

### Improved

- Readable demonstration creators: Admin demonstration cards now show the creator name and email instead of only a raw user ID.
- Creator search: Dashboard search can now match demonstration creator names, emails, and user IDs.

## 1.1.17 - 12 June 2026

Admin dashboard creator visibility improvement.

### Improved

- Dashboard creator user ID: Admin demonstration cards now show the creator user ID and dashboard search can match creator IDs.

## 1.1.16 - 12 June 2026

SEO landing pages, crawlability, social metadata, and structured data improvements.

### Added

- For organizers SEO page: ChantLive now has a public organizer-focused page that explains the QR code live chant workflow for events.
- About ChantLive page: A new public about page gives civic-tech, accessibility, and community sites a clearer page to link to.

### Improved

- Public internal links: The homepage now links to the organizer and about pages so visitors and crawlers can discover them.
- Sitemap and structured data updates: The sitemap and route-specific JSON-LD now include the new public SEO pages.
- Social preview metadata: Open Graph and Twitter preview metadata now include image dimensions, alt text, and a corrected social card caption.

## 1.1.15 - 11 June 2026

Dashboard filtering, QR copy feedback, and participant retry improvements.

### Added

- Dashboard search: Organizers can search demonstrations by title to find the right event faster.
- Dashboard status filters: Organizers can filter demonstrations by all, live, draft, or ended status before opening an event.

### Improved

- Filtered empty state: When dashboard filters return no results, organizers see a clear message and one-click reset action.
- QR link copy feedback: Admins now get visible and screen-reader-friendly confirmation after copying a participant link.
- Participant retry controls: Participants can retry loading or failed join attempts without being stuck on a dead-end screen.

## 1.1.14 - 10 June 2026

Admin user activity and demonstration visibility improvements.

### Added

- Admin user metrics: Super admins can see when each user joined, when they were last active, and how many demonstrations they can manage.

### Improved

- User activity tracking: Authenticated admin activity is now recorded so super admins can identify recently active users.
- Safer admin user API: The admin user list now returns display-safe user summaries instead of raw account rows.

## 1.1.13 - 10 June 2026

Live-event readiness, QR joining, participant waiting, and trust improvements.

### Added

- Chant starter examples: Organizers can fill the add-chant form from common call-and-response examples instead of starting from a blank dialog.

### Improved

- Live readiness reminder: Admins see a pre-live reminder to add chants, test the participant link, and invite backup admins before an event starts.
- QR join instructions: The QR dialog now gives participants clearer scanning and page-open instructions for crowded live settings.
- Participant waiting guidance: Participants waiting for a draft demonstration now know to keep the page open because chants will appear automatically.
- Landing page trust cards: First-time visitors now see clearer privacy, mobile-use, and open-source trust signals before signing up.

## 1.1.12 - 9 June 2026

Customer-facing onboarding, organiser workflow, participant reliability, and QR sharing improvements.

### Improved

- Clearer event use cases: First-time visitors can quickly see that ChantLive supports marches, prayer circles, campus actions, and community gatherings.
- Dashboard status summary: Organizers can scan total, live, draft, and ended demonstrations before opening an event.
- Participant connection status: Participants can see and hear whether live updates are connected or reconnecting.
- QR fallback guidance: Admins get clear fallback guidance for sharing the participant link when QR scanning is difficult.

### Added

- Quick title starters: Organizers can start new demonstrations faster with common title prompts in the create dialog.

## 1.1.11 - 8 June 2026

Deployment monitoring, QR accessibility, and issue-reporting improvements.

### Improved

- Health check endpoint: Deployments and uptime monitors can check /healthz for status, version, uptime, and timestamp.

### Documentation

- Bug report issue template: Contributors can report reproducible bugs with clear steps, expected behavior, environment, and safety checks.
- QR accessibility checklist: Organizers have practical guidance for sharing participant QR codes with URL fallbacks and scan testing.
- Release health checks: The release checklist now includes health endpoint and QR sharing verification steps.
- Health endpoint documentation: README now documents the /healthz endpoint for uptime and deployment monitoring.

## 1.1.10 - 8 June 2026

Public release notes workflow and changelog visibility improvements.

### Added

- Public changelog page: Community members can review recent ChantLive releases directly on the website.

### Improved

- Structured release notes data: Release notes now have a structured source of truth for website, markdown, and automation output.

### Documentation

- Release note scripts: Maintainers can add, import, and generate changelog entries from npm scripts.
- Release item issue template: Feature requests can capture user impact and proposed public changelog wording.

### Internal

- Release item workflow: Repository automation can record approved release-note items into the structured changelog.

## 1.1.9 - 8 June 2026

Security, accessibility, deployment, and release communication improvements.

### Improved

- Baseline HTTP security headers: API and page responses now include baseline security headers.
- Reduced motion support: Animations now respect users who prefer reduced motion.

### Added

- Screen reader live chant announcements: Participant chant updates are announced to assistive technologies.

### Documentation

- Release checklist: Deployment verification steps and common Replit Git recovery notes are documented.
- Project changelog: Community members can now review project changes before deploying or contributing.
