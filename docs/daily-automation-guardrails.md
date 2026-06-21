# Daily Automation Guardrails

Use these checks for the external `daily-chantlive-oss-improvements` scheduler before reporting a deploy-ready result.

## Start-of-Run Snapshot

Record these values before making any changes:

```powershell
$START_HEAD = git rev-parse HEAD
$START_VERSION = node -p "require('./package.json').version"
$RUN_DATE = Get-Date -Format "yyyy-MM-dd"
git status --short
```

If `git status --short` is not clean after syncing `main`, stop and report the dirty tree instead of editing.

## GitHub Triage Gate

Before choosing product improvements, check GitHub for repository health issues in `barsham/ChantLive`.

Required daily triage:

- Review open GitHub Issues, prioritizing labels or titles that indicate `bug`, `regression`, `security`, `accessibility`, `deploy`, `build`, or `production`.
- Review recent GitHub Actions workflow runs for failures. If a run failed, inspect the failing job logs before selecting feature work.
- Treat production bugs, failing CI, deployment blockers, security issues, and data-loss risks as higher priority than new product features.
- If a bug or failed workflow can be fixed safely in the daily run, fix it first, run verification, update release notes if user-facing, and push only if checks pass.
- If a bug or failed workflow is unclear or risky, do not guess. Report the issue number or workflow run, the observed failure, and the recommended next step.

Use the GitHub connector for issue and repository metadata when available. Use local `gh` commands only for gaps the connector does not cover well, especially GitHub Actions run discovery and detailed log inspection.

## Success Requirements

Only report "ready to deploy" when all of these are true:

- `git rev-parse HEAD` differs from `$START_HEAD`.
- GitHub open issues and recent workflow failures were reviewed before feature selection.
- `package.json` version is greater than `$START_VERSION`.
- `shared/changelog.json` contains a release entry for `$RUN_DATE`.
- The run includes 5 customer-facing improvements, not just maintenance.
- At least 2 of those 5 improvements are substantial product features that could materially change how organizers or participants use ChantLive.
- The combined release impact is scored at least 8.0 out of 10 before implementation and again after verification.
- At least 1 substantial feature improves the organizer/admin workflow.
- At least 1 substantial feature improves participant experience, reliability, accessibility, or onboarding.
- The remaining improvements may be smaller polish, but they must support the larger customer value of the run.
- `npm run changelog:generate -- --version <new-version>` passed.
- `npm run check` passed.
- `npm run build` passed.
- `git status --short` is clean after pushing to `main`.

## Product Innovation Floor

The scheduler should not treat a run as successful if it only adds small labels, helper text, extra buttons, tiny copy changes, or documentation. Those can be useful, but they are not enough for the daily improvement goal.

Each successful run must include at least 2 substantial product features. A substantial feature should meet most of these criteria:

- It creates a new workflow or meaningfully shortens an existing workflow.
- It gives organizers or participants a capability they did not have before.
- It is visible in the app UI and understandable without reading release notes.
- It could plausibly be described to the community as a real product improvement, not housekeeping.
- It has enough completeness that a real user can benefit from it immediately after deployment.

Examples that count as substantial features:

- A participant handout/print route with QR code, fallback link, and event instructions.
- A reusable chant/template library that can seed a new demonstration.
- A guided event setup wizard or readiness flow that changes what organizers do before going live.
- A participant accessibility mode such as high-contrast, large-text, or low-bandwidth display.
- A live-event recovery panel that shows connection state, last update, and safe recovery actions.
- A share/invite workflow that sends or prepares complete participant/admin instructions, not just a copied URL.

Examples that do not count as substantial features by themselves:

- Adding one more tooltip, badge, or label.
- Adding one more example title.
- Rewording existing copy.
- Adding documentation without a shipped in-app workflow.
- Refactoring code without visible customer value.

If 2 substantial features cannot be implemented safely in one run, do not pad the run with small changes. Instead, report that the run was intentionally not pushed and list the larger feature candidates that need more design or implementation time.

## Impact Score Gate

Every run must score the planned release from 1 to 10 before coding. If the planned release is below 8.0, choose a more meaningful feature set or stop without pushing. Re-score the completed release after checks pass and before committing. If the completed release is below 8.0, do not push it to `main`.

Use this rubric:

- `10`: Breakthrough product capability that could anchor a launch announcement or materially reposition ChantLive.
- `9`: Major workflow innovation that changes how organizers or participants run a real event.
- `8`: Strong release with at least 2 complete, visible, high-value features and clear real-world event-day value.
- `6-7`: Useful workflow improvements, but not enough for a scheduled daily push under the current standard.
- `1-5`: Polish, maintenance, copy, refactoring, documentation, or narrow helper features.

An 8+ release should usually include at least one feature that creates a new end-to-end workflow, such as event planning, live-event recovery, multilingual participation, safety coordination, role handoff, template-driven setup, participant feedback, or post-event reporting. If the run cannot safely reach 8+, report the best candidate ideas and ask Barsham to prioritize rather than shipping filler.

## No-Commit Reporting

If the final commit equals `$START_HEAD`, do not reuse an older commit as evidence. Report one of these outcomes:

- `No new commit was produced because the improvement was unsafe or unclear.`
- `No new commit was produced because verification failed.`
- `No new commit was produced because the working tree was not clean.`

## Notification Wording

Use commit-specific wording only after a new commit is pushed:

```text
Pushed ChantLive vX.Y.Z commit <hash> to main. Deploy main when ready.
```

If no commit was pushed:

```text
No new ChantLive commit was produced today. Reason: <specific reason>.
```

The scheduler firing at 6 PM only proves the run was invoked. It does not prove that a deployable commit was created.
