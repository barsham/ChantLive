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

## Success Requirements

Only report "ready to deploy" when all of these are true:

- `git rev-parse HEAD` differs from `$START_HEAD`.
- `package.json` version is greater than `$START_VERSION`.
- `shared/changelog.json` contains a release entry for `$RUN_DATE`.
- `npm run changelog:generate -- --version <new-version>` passed.
- `npm run check` passed.
- `npm run build` passed.
- `git status --short` is clean after pushing to `main`.

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
