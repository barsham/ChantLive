# Release working agreements

- Before committing a release, inspect all changed and untracked files. Review
  related Markdown and release notes alongside the implementation.
- Generate release notes and perform relevant checks before staging the final
  release. Inspect the working tree again after checks and generation.
- Commit all reviewed files belonging to the release together, including code,
  version files, structured changelog, generated Markdown and related docs. Push
  once after validation; do not create a follow-up documentation commit for
  files that should have been included in the release.
- Do not include unrelated work merely to make the working tree clean. Report
  any remaining uncommitted files and why they were left out.
- Markdown-only and `docs/`-only pushes must not trigger production builds.
  Keep runtime data such as `shared/changelog.json` eligible for deployment.
- Follow `docs/release-checklist.md`. Deployment must use the exact commit that
  passed CI. Documentation-only changes do not need a version bump.
