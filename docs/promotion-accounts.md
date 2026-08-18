# ChantLive Promotion Accounts

Record public account metadata only. Never store passwords, one-time codes,
recovery codes, cookies, session tokens, or private contact details here.

| Date | Platform | Username | Public URL | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| 2026-08-04 | DEV Community | `barsham` | https://dev.to/barsham | Active | Personal maintainer account created through GitHub sign-in. Published the first ChantLive break-test post at https://dev.to/barsham/can-you-break-this-open-source-real-time-coordination-tool-in-seven-minutes-18f. No credential was stored in the repository. |
| 2026-08-04 | Hacker News | `chantlive`, `chantliveapp`, and `chantlive2026` attempted | https://news.ycombinator.com/ | Not created | The site reported the branded usernames as unavailable even though public profile lookups returned no user. Direct registration was stopped rather than guessing more names. No credential was retained. |
| 2026-08-11 | ChantLive live app | `info+demo@chantlive.online` | https://chantlive.online/d/lR4WSuUS | Active | Dedicated maintainer-operated test account and auto-running fictional participant demo. The generated credential is stored outside the repository in a Windows user-bound DPAPI-protected local store. |
| 2026-08-18 | Usability Testing Exchange | `ChantLive` | https://site-2186a6215e.talkyard.io/ | Active, email verified | Clearly branded maintainer account created for a reciprocal usability-test listing. Credential is stored outside the repository in a Windows user-bound DPAPI-protected local store. No listing was published because the site's submission endpoint returned its own `not UTX` platform error on the live Talkyard host. |

## Rules

- Accounts must clearly represent ChantLive or Barsham as its maintainer.
- Use `info@chantlive.online` only when a public project email is required.
- Store credentials in Windows Credential Manager or an equivalent secure
  local store, never in this repository.
- Do not create replacement accounts after moderation, suspension, or a ban.
- Record every published post URL and moderation outcome in
  `docs/promotion-experiments.md`.
