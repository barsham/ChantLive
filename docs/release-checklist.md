# Release Checklist

Use this checklist before publishing ChantLive to the live system.

## Before Deploying

- Confirm `main` is up to date with `origin/main`.
- Inspect `git status --short` and review all changed and untracked files,
  including documentation. Identify which belong to this release before staging.
- Confirm `package.json` and `package-lock.json` have the intended version.
- Review `shared/changelog.json` for approved public release notes.
- Run `npm run changelog:generate -- --version <version>` and review `CHANGELOG.md`.
- Run `npm run check`.
- Run `npx tsx --test server/auth.test.ts server/email.test.ts` when authentication
  or email delivery is affected, plus any other checks relevant to the changes.
- Run `npm run build`.
- Inspect `git status --short` again after generation and validation. Review and
  stage all files belonging to the release together: code, version files,
  `shared/changelog.json`, `CHANGELOG.md`, release notes, and related documentation.
  Do not leave generated release files for a second commit after deployment.
- Run `git diff --cached --check` and review `git diff --cached --stat` before
  making one release commit and pushing it once. Leave unrelated work untouched
  and explicitly report any remaining uncommitted files.
- Complete [SendGrid email setup](email-setup.md), including sender authentication and production environment values.
- Confirm `/healthz` returns `status: "alive"` and `/readyz` reports `operational` in the target environment.
- Review [qr-accessibility.md](./qr-accessibility.md) before printing or sharing participant QR codes.

## Automated Production Deploys

Pushes to `main` deploy automatically unless every changed file is under `docs/`
or is Markdown (`**/*.md`, including root `README.md` and `CHANGELOG.md`).
Documentation-only pushes skip the build and deploy workflow. Mixed code and
documentation pushes still deploy once. Manual `workflow_dispatch` remains
available when a deployment is explicitly needed.

`shared/changelog.json` remains a deployment trigger because it supplies the
public changelog shown in the app. Include its changes in the release commit.
The server deploys the exact `github.sha` that CI verified, rather than a newer
`origin/main` commit that might arrive while checks are running.

Required repository secrets:

- `HETZNER_HOST`: production server host or IP address.
- `HETZNER_USER`: SSH user for deployment.
- `HETZNER_SSH_PRIVATE_KEY`: private key matching the public key installed on the server.

Optional repository variables:

- `HETZNER_APP_DIR`: defaults to `/opt/chantlive`.
- `HETZNER_SERVICE_NAME`: defaults to `chantlive`.

The deploy job runs checks, authentication tests and builds. It then stops the old
service, creates and checks a mandatory database backup, applies the additive
authentication migration, prunes dev dependencies, updates systemd for the ESM
bundle, and verifies local and public readiness. It never forces a Drizzle schema
sync. The watchdog shares the deployment concurrency group so it cannot restart
old code during a migration. See [authentication migration](authentication.md).

## After Deploying

- Open the live homepage at https://chantlive.online/.
- Open https://chantlive.online/healthz and confirm the version matches the release.
- Confirm the visible app version matches the release version.
- Create or open a test demonstration.
- Confirm QR code access opens the participant view.
- Confirm a chant can be pushed live to the participant view.
- Confirm ending the demonstration shows the ended state.

## If Deployment Fails

- Do not retry with local uncommitted changes.
- Capture the deploy error and current commit hash.
- Inspect `git status` on the deployment checkout for an unfinished rebase or local changes before attempting recovery.
