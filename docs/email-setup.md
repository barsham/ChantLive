# Transactional email setup

ChantLive uses SendGrid's v3 Mail Send API for account verification, password
resets, and event invitations. Production runs on Hetzner and loads the app's
environment from `/opt/chantlive/.env` (or the configured application directory).

## Configured account

On 7 September 2026, the local and Hetzner production `.env` files were configured
with the ChantLive key and sender `info@chantlive.online`. The example environment
contains no key. SendGrid confirmed Mail Send permission and domain authentication
ID `32874084` as valid. Cloudflare contains these DNS-only CNAME records:

| Name | Target |
| --- | --- |
| `em3008.chantlive.online` | `u52931640.wl141.sendgrid.net` |
| `s1._domainkey.chantlive.online` | `s1.domainkey.u52931640.wl141.sendgrid.net` |
| `s2._domainkey.chantlive.online` | `s2.domainkey.u52931640.wl141.sendgrid.net` |

Production configuration uses `https://chantlive.online`; local configuration uses
`http://localhost:5000`. Verification bypass is disabled in both. This setup did
not deploy the new application code. A subsequent test email from
`info@chantlive.online` to the maintainer's Gmail mailbox was accepted by SendGrid
and receipt was confirmed by the maintainer. The registration flow still needs
an end-to-end test after deployment.

## Account and DNS

1. In SendGrid, authenticate the `chantlive.online` sending domain. Add exactly
   the DNS records generated for that account, then verify them in SendGrid.
   Keep existing mailbox MX records intact.
2. Create a dedicated ChantLive API key with Mail Send permission. Keep it in
   the server environment, never in Git, frontend configuration, or chat.
3. Choose a sender on the authenticated domain, such as `info@chantlive.online`.

See the official [domain authentication guide](https://www.twilio.com/docs/sendgrid/ui/account-and-settings/how-to-set-up-domain-authentication)
and [API key guide](https://www.twilio.com/docs/sendgrid/ui/account-and-settings/api-keys).

## Production environment

Set these values in the server's `.env` before deploying the email changes:

```dotenv
SENDGRID_API_KEY=<dedicated ChantLive key>
SENDGRID_FROM_EMAIL=info@chantlive.online
SENDGRID_FROM_NAME=ChantLive
PUBLIC_BASE_URL=https://chantlive.online
DEV_SKIP_EMAIL_VERIFICATION=false
NODE_ENV=production
```

`SENDGRID_FROM_EMAIL` must be a bare email address; the display name has its own
setting. Public links use `PUBLIC_BASE_URL`, never a request's host headers.
Restart the application service after configuration changes. Missing settings,
provider rejection, and network errors fail the email operation. Requests time
out after 15 seconds. Click and open tracking are disabled for these emails.

## Verify delivery

Register a fresh test account using a mailbox you control. Confirm that SendGrid
Email Activity shows the message's delivery outcome, that it reaches the mailbox,
and that the link verifies the account and enables sign-in. Also test password
reset and an event invitation. A `202 Accepted` response means SendGrid queued
the message; it does not prove inbox delivery. Investigate bounces, blocks, spam
placement, and suppressions in SendGrid if the message does not arrive.

Users whose old accounts were automatically verified can already sign in.
Unverified users can submit registration again to receive a fresh verification
link after delivery is restored. Existing accounts are not retroactively changed.

## Local development

Use a dedicated development key and sender to exercise delivery, or explicitly
set `DEV_SKIP_EMAIL_VERIFICATION=true` with `NODE_ENV=development` to create
accounts without sending verification emails. The bypass is ignored in production
and does not simulate delivery for password resets or invitations.

Run `npx tsx --test server/email.test.ts` for mocked transport tests. They send no
real messages and do not validate your account, DNS, or inbox delivery.
