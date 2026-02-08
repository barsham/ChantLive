# ChantLive

## Overview

ChantLive is a real-time demonstration/protest chant management platform. Admins create "demonstrations," add a list of chants, then push a "current chant" live. Participants scan a QR code on their phones and see a full-screen chant page that updates automatically via WebSockets — no login or app download required.

The app has two audiences:
- **Admins** (authenticated via email/password or Google OAuth) who create demonstrations, manage chant lists, and drive the live chant selection.
- **Participants** (unauthenticated) who join via a short public URL/QR code and see the current chant in real time.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework:** React 18 with TypeScript
- **Build tool:** Vite (dev server with HMR proxied through Express)
- **Routing:** Wouter (lightweight client-side router)
- **State/Data fetching:** TanStack React Query for server state management
- **UI components:** shadcn/ui (new-york style) built on Radix UI primitives with Tailwind CSS
- **Real-time:** Socket.IO client for live chant updates and viewer counts
- **Path aliases:** `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Backend
- **Runtime:** Node.js with Express (TypeScript via tsx)
- **HTTP server:** Node `http.createServer` wrapping Express (needed for Socket.IO)
- **Real-time:** Socket.IO server for pushing chant changes and viewer counts to participants
- **Authentication:** Email/password registration with email verification via Resend, plus Passport.js with Google OAuth 2.0 strategy; sessions stored in PostgreSQL via `connect-pg-simple`
- **Session management:** Express-session with 30-day cookie, stored in a `session` table (auto-created)
- **Password security:** bcryptjs with 12 rounds for hashing; verification tokens hashed with SHA-256 before storage
- **Email service:** Resend integration for sending verification emails
- **QR Code generation:** `qrcode` library for generating participant join QR codes

### Roles & Authorization
- `super_admin` — can create demonstrations, manage all admins, end demos
- `admin` — can control chants for demonstrations they're assigned to
- Participants have no authentication; they connect via a public demo ID

### Data Layer
- **ORM:** Drizzle ORM with PostgreSQL dialect
- **Schema location:** `shared/schema.ts` (shared between client and server)
- **Database:** PostgreSQL (connection via `DATABASE_URL` environment variable)
- **Schema push:** `npm run db:push` (uses drizzle-kit push)
- **Migrations output:** `./migrations` directory

### Database Tables
- **users** — id, email, name, provider, role, googleId, avatarUrl, passwordHash, emailVerified, verificationToken, verificationTokenExpires, createdAt
- **demonstrations** — id, publicId (short unique ID for participant URLs), title, status (draft/live/ended), createdBy, createdAt
- **chants** — id, demonstrationId, orderIndex, text
- **demo_admins** — composite PK (demonstrationId, userId) linking admins to demos
- **demo_state** — demonstrationId (PK), currentChantId, updatedAt (tracks which chant is currently live)
- **view_sessions** — id, demonstrationId, sessionId, firstSeenAt (tracks anonymous viewers)
- **session** — auto-created by connect-pg-simple for Express sessions

### Key Routes
- `/api/auth/me` — get current authenticated user
- `/api/auth/register` — POST email/password registration
- `/api/auth/login` — POST email/password login
- `/api/auth/verify?token=` — GET email verification callback
- `/auth/google` — initiate Google OAuth flow
- `/api/demos` — CRUD for demonstrations
- `/api/admin/users` — user management (super_admin only)
- `/d/:publicId` — participant view (client-side route)
- `/login` — login page (client-side route)
- `/register` — registration page (client-side route)
- Socket.IO events: `join_demo`, `chant_update`, `viewer_count`

### Build & Deploy
- **Dev:** `npm run dev` — runs tsx with Vite dev middleware for HMR
- **Build:** `npm run build` — Vite builds frontend to `dist/public`, esbuild bundles server to `dist/index.cjs`
- **Production:** `npm start` — runs the bundled server which serves static files
- The build script bundles select server dependencies to reduce cold start times

### Project Structure
```
client/              # Frontend React app
  src/
    components/ui/   # shadcn/ui components
    pages/           # Route pages (landing, admin-dashboard, demo-editor, admin-users, participant)
    hooks/           # Custom React hooks
    lib/             # Utilities (auth context, query client, socket, utils)
server/              # Backend Express app
  index.ts           # Entry point, Express + HTTP server setup
  routes.ts          # API routes + Socket.IO setup
  auth.ts            # Passport.js + session configuration
  db.ts              # PostgreSQL pool + Drizzle instance
  storage.ts         # Data access layer (IStorage interface + DatabaseStorage)
  static.ts          # Production static file serving
  vite.ts            # Dev-mode Vite middleware
shared/
  schema.ts          # Drizzle schema + Zod validation (shared between client/server)
script/
  build.ts           # Production build script
```

## External Dependencies

- **PostgreSQL** — Primary database, required via `DATABASE_URL` environment variable
- **Google OAuth 2.0** — Admin authentication, requires `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` environment variables
- **Socket.IO** — WebSocket-based real-time communication between server and participant clients
- **QRCode (npm)** — Server-side QR code generation for participant join links
- **connect-pg-simple** — PostgreSQL session store for Express sessions
- **SESSION_SECRET** — Environment variable for signing session cookies (falls back to a default)