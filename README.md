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

## Code of Conduct

This project follows the [Contributor Covenant](./CODE_OF_CONDUCT.md).

## License

MIT — see [LICENSE](./LICENSE).
