# Contributing to ChantLive

Thanks for your interest in contributing!

## Development Setup

1. Fork and clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
4. Configure required env vars (`DATABASE_URL`, `SESSION_SECRET`).
5. Push database schema:
   ```bash
   npm run db:push
   ```
6. Start development server:
   ```bash
   npm run dev
   ```

## Pull Request Guidelines

- Keep PRs focused and reasonably small.
- Include a clear description of what changed and why.
- Run checks before opening a PR:
  ```bash
  npm run check
  npm run build
  ```
- Update docs when behavior or setup changes.

## Coding Standards

- Use TypeScript.
- Follow existing project structure and naming patterns.
- Prefer clear, maintainable code over clever shortcuts.

## Security

- Never commit secrets, tokens, or private keys.
- Use `.env` for local secrets and keep `.env.example` placeholders only.
- If you discover a vulnerability, follow `SECURITY.md`.

## Questions

Open an issue for bugs, feature requests, or discussion.
