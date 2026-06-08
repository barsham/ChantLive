# Changelog

All notable public changes to ChantLive are generated from `shared/changelog.json`.

Use GitHub Issues and pull requests for implementation details, then add approved user-facing changes to the structured changelog data before a release.

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
