# Changelog

All notable public changes to ChantLive are generated from `shared/changelog.json`.

Use GitHub Issues and pull requests for implementation details, then add approved user-facing changes to the structured changelog data before a release.

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
