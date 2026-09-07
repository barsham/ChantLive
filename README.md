# ChantLive

ChantLive is a real-time chant management platform for demonstrations and events, hosted at https://chantlive.online/.

Admins create demonstrations, manage chant lists, and push the current chant live. Participants join through a public URL (or QR code) and receive live updates without signing in. ChantLive is free to use for everyone.

## Features

- Real-time chant updates via Socket.IO
- Admin authentication (email/password)
- Public participant view with no login required
- Live viewer count tracking
- PostgreSQL + Drizzle ORM backend

## Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL, Drizzle ORM
- **Realtime:** Socket.IO

## Getting Started

### 1) Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL

### 2) Install

```bash
npm install
```

### 3) Configure environment

Copy `.env.example` to `.env` and fill in values:

```bash
cp .env.example .env
```

Required variables:

- `DATABASE_URL`
- `SESSION_SECRET`

Optional variables:

- `PORT`

Email delivery requires `SENDGRID_API_KEY` and a `SENDGRID_FROM_EMAIL` address on a
domain authenticated in SendGrid. Set `PUBLIC_BASE_URL` to the public app origin
(`https://chantlive.online` in production). See [email setup](docs/email-setup.md). Configure
these in the deployment environment as well as locally when testing delivery.
Missing credentials and rejected sends now fail registration with a retry message;
they never count as a verification email being sent. An unverified user can retry
the registration form to request a new link after delivery is restored.

For local development without email, explicitly set
`DEV_SKIP_EMAIL_VERIFICATION=true` with `NODE_ENV=development`. The account is
then ready to sign in and the screen says “Account created.” This bypass is
ignored in production. Accounts previously auto-verified by the old bypass can
already sign in; deploying this fix does not change those existing accounts.

### 4) Prepare database

```bash
npm run db:push
```

### 5) Run in development

```bash
npm run dev
```

App runs on `http://localhost:5000` by default.

## Production

```bash
npm run build
npm start
```

Before deploying, review [docs/release-checklist.md](./docs/release-checklist.md).
For participant link sharing, review [docs/qr-accessibility.md](./docs/qr-accessibility.md).

The app exposes a lightweight health endpoint at `/healthz` for uptime checks.

## Security and Sensitive Data

Before publishing, verify that:

- No `.env` files are committed.
- No API keys, tokens, private keys, or secrets are committed.
- `SESSION_SECRET` is set in deployment environments.

The project includes:

- `.gitignore` rules to avoid committing secrets/artifacts
- `.env.example` with placeholder values only
- `SECURITY.md` for responsible disclosure

## Project Structure

```text
client/   # React frontend
server/   # Express backend + auth + sockets
shared/   # Shared schema/types
script/   # Build scripts
```

## Contributing

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a pull request.

## Community Feedback

ChantLive is free and open source. Feedback from organizers, participants, accessibility reviewers, and civic-tech contributors is welcome through [GitHub Issues](https://github.com/barsham/ChantLive/issues). Outreach copy and community feedback prompts are available in [docs/community-outreach.md](./docs/community-outreach.md).

## Changelog

Community-facing changes and deployment notes are tracked in [CHANGELOG.md](./CHANGELOG.md).

## Code of Conduct

This project follows the [Contributor Covenant](./CODE_OF_CONDUCT.md).

## License

MIT - see [LICENSE](./LICENSE).
