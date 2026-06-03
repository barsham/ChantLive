# Release Checklist

Use this checklist before publishing ChantLive to the live system.

## Before Deploying

- Confirm `main` is up to date with `origin/main`.
- Confirm the working tree is clean.
- Confirm `package.json` and `package-lock.json` have the intended version.
- Review `CHANGELOG.md` for community-facing notes.
- Run `npm run check`.
- Run `npm run build`.

## After Deploying

- Open the live homepage at https://chantlive.online/.
- Confirm the visible app version matches the release version.
- Create or open a test demonstration.
- Confirm QR code access opens the participant view.
- Confirm a chant can be pushed live to the participant view.
- Confirm ending the demonstration shows the ended state.

## If Deployment Fails

- Do not retry with local uncommitted changes.
- Capture the deploy error and current commit hash.
- Verify Replit is not in the middle of a rebase with `git status`.
- If Replit reports an unfinished rebase and no Replit-only changes need to be kept, run `git rebase --abort` before pulling again.
