# Release Checklist

Use this checklist before publishing ChantLive to the live system.

## Before Deploying

- Confirm `main` is up to date with `origin/main`.
- Confirm the working tree is clean.
- Confirm `package.json` and `package-lock.json` have the intended version.
- Review `shared/changelog.json` for approved public release notes.
- Run `npm run changelog:generate -- --version <version>` and review `CHANGELOG.md`.
- Run `npm run check`.
- Run `npm run build`.
- Complete [SendGrid email setup](email-setup.md), including sender authentication and production environment values.
- Confirm `/healthz` returns `status: "alive"` and `/readyz` reports `operational` in the target environment.
- Review [qr-accessibility.md](./qr-accessibility.md) before printing or sharing participant QR codes.

## Automated Production Deploys

Pushes to `main` deploy automatically through GitHub Actions.

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
