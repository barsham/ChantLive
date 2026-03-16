# Security Policy

## Supported Versions

This project is under active development. Security fixes are applied on the
latest default branch.

## Reporting a Vulnerability

Please do **not** open public issues for undisclosed security vulnerabilities.

Instead:

1. Open a private security advisory on GitHub (preferred), or
2. If unavailable, open an issue containing minimal details and request private
   coordination.

Please include:

- A clear description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested remediation (if known)

We will acknowledge reports as quickly as possible and work on a fix.

## Security Best Practices for Contributors

- Never commit real credentials, API keys, tokens, or private keys.
- Keep `.env` files local-only.
- Use `SESSION_SECRET` and strong environment-managed secrets in deployments.
