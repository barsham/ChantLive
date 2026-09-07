export class EmailDeliveryError extends Error {
  constructor() {
    super("Email delivery is unavailable.");
    this.name = "EmailDeliveryError";
  }
}

export function shouldSkipEmailVerification() {
  return process.env.NODE_ENV === "development"
    && process.env.DEV_SKIP_EMAIL_VERIFICATION === "true";
}

export function getPublicAppUrl(path: string) {
  try {
    const configured = process.env.PUBLIC_BASE_URL?.trim();
    const base = new URL(configured || (process.env.NODE_ENV === "development" ? "http://localhost:5000" : ""));
    if (base.username || base.password || base.search || base.hash || base.pathname !== "/"
      || (base.protocol !== "https:" && !(process.env.NODE_ENV === "development" && base.protocol === "http:"))) {
      throw new EmailDeliveryError();
    }
    const url = new URL(path, base);
    if (url.origin !== base.origin) throw new EmailDeliveryError();
    return url.toString();
  } catch {
    throw new EmailDeliveryError();
  }
}

export function getEmailConfiguration() {
  const apiKey = process.env.SENDGRID_API_KEY?.trim();
  const fromEmail = process.env.SENDGRID_FROM_EMAIL?.trim();
  if (!apiKey || !fromEmail || !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(fromEmail)) {
    throw new EmailDeliveryError();
  }
  return { apiKey, fromEmail, fromName: process.env.SENDGRID_FROM_NAME?.trim() || "ChantLive" };
}

async function sendEmail(message: { to: string; subject: string; text: string; html: string }) {
  const { apiKey, fromEmail, fromName } = getEmailConfiguration();
  try {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(15_000),
      body: JSON.stringify({
        personalizations: [{ to: [{ email: message.to }] }],
        from: { email: fromEmail, name: fromName },
        subject: message.subject,
        content: [
          { type: "text/plain", value: message.text },
          { type: "text/html", value: message.html },
        ],
        tracking_settings: {
          click_tracking: { enable: false, enable_text: false },
          open_tracking: { enable: false },
        },
      }),
    });
    // Acceptance means queued by the provider, not confirmed inbox delivery.
    if (response.status !== 202) {
      console.error(`SendGrid rejected transactional email (HTTP ${response.status}).`);
      throw new EmailDeliveryError();
    }
  } catch {
    // Never expose provider response bodies, credentials, or token URLs in errors.
    throw new EmailDeliveryError();
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]!);
}

export async function sendInviteEmail(toEmail: string, inviteeName: string, inviterName: string, demoTitle: string, demoUrl: string) {
  await sendEmail({
    to: toEmail,
    subject: `You've been invited to manage "${demoTitle}" on ChantLive`,
    text: `Hi ${inviteeName}, ${inviterName} invited you to manage "${demoTitle}" on ChantLive. Open event: ${demoUrl}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px;">
        <h2 style="color: #111; margin-bottom: 8px;">You're invited, ${escapeHtml(inviteeName)}!</h2>
        <p style="color: #555; line-height: 1.5;"><strong>${escapeHtml(inviterName)}</strong> has added you as an admin for the event <strong>"${escapeHtml(demoTitle)}"</strong> on ChantLive.</p>
        <p style="color: #555; line-height: 1.5;">You can now manage chants, go live, and control the event in real time.</p>
        <a href="${escapeHtml(demoUrl)}" style="display: inline-block; background: #111; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; margin: 16px 0;">Open Event</a>
        <p style="color: #888; font-size: 13px; margin-top: 24px;">If you weren't expecting this invitation, you can safely ignore this email.</p>
      </div>
    `,
  });
}

export async function sendVerificationEmail(toEmail: string, name: string, verificationUrl: string) {
  await sendEmail({
    to: toEmail,
    subject: 'Verify your ChantLive account',
    text: `Welcome to ChantLive, ${name}! Verify your email: ${verificationUrl} This link expires in 24 hours. If you did not create an account, ignore this email.`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px;">
        <h2 style="color: #111; margin-bottom: 8px;">Welcome to ChantLive, ${escapeHtml(name)}!</h2>
        <p style="color: #555; line-height: 1.5;">Click the button below to verify your email address and activate your account.</p>
        <a href="${escapeHtml(verificationUrl)}" style="display: inline-block; background: #111; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; margin: 16px 0;">Verify Email</a>
        <p style="color: #888; font-size: 13px; margin-top: 24px;">If you didn't create an account, you can safely ignore this email. This link expires in 24 hours.</p>
      </div>
    `,
  });
}


export async function sendPasswordResetEmail(toEmail: string, name: string, resetUrl: string) {
  await sendEmail({
    to: toEmail,
    subject: 'Reset your ChantLive password',
    text: `Hi ${name}, reset your password: ${resetUrl} This link expires in 1 hour. If you did not request this, ignore this email.`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px;">
        <h2 style="color: #111; margin-bottom: 8px;">Password reset request</h2>
        <p style="color: #555; line-height: 1.5;">Hi ${escapeHtml(name)}, click the button below to reset your password.</p>
        <a href="${escapeHtml(resetUrl)}" style="display: inline-block; background: #111; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; margin: 16px 0;">Reset Password</a>
        <p style="color: #888; font-size: 13px; margin-top: 24px;">If you didn't request this, you can ignore this email. This link expires in 1 hour.</p>
      </div>
    `,
  });
}
