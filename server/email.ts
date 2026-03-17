import { Resend } from 'resend';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    console.warn('X_REPLIT_TOKEN not found for repl/depl. Email sending will be bypassed.');
    return null;
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken,
      },
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || !connectionSettings.settings.api_key) {
    console.warn('Resend not connected. Email sending will be bypassed.');
    return null;
  }
  return { apiKey: connectionSettings.settings.api_key, fromEmail: connectionSettings.settings.from_email };
}

async function getResendClient() {
  const credentials = await getCredentials();
  if (!credentials) return null;

  const { apiKey, fromEmail } = credentials;
  return {
    client: new Resend(apiKey),
    fromEmail,
  };
}

export async function sendInviteEmail(toEmail: string, inviteeName: string, inviterName: string, demoTitle: string, demoUrl: string) {
  const resendClient = await getResendClient();
  if (!resendClient) {
    console.log(`[Email Bypassed] Invite to ${toEmail}: ${demoUrl}`);
    return;
  }
  const { client, fromEmail } = resendClient;

  await client.emails.send({
    from: fromEmail || 'ChantLive <noreply@chantlive.online>',
    to: toEmail,
    subject: `You've been invited to manage "${demoTitle}" on ChantLive`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px;">
        <h2 style="color: #111; margin-bottom: 8px;">You're invited, ${inviteeName}!</h2>
        <p style="color: #555; line-height: 1.5;"><strong>${inviterName}</strong> has added you as an admin for the event <strong>"${demoTitle}"</strong> on ChantLive.</p>
        <p style="color: #555; line-height: 1.5;">You can now manage chants, go live, and control the event in real time.</p>
        <a href="${demoUrl}" style="display: inline-block; background: #111; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; margin: 16px 0;">Open Event</a>
        <p style="color: #888; font-size: 13px; margin-top: 24px;">If you weren't expecting this invitation, you can safely ignore this email.</p>
      </div>
    `,
  });
}

export async function sendVerificationEmail(toEmail: string, name: string, verificationUrl: string) {
  const resendClient = await getResendClient();
  if (!resendClient) {
    console.log(`[Email Bypassed] Verification for ${toEmail}: ${verificationUrl}`);
    return;
  }
  const { client, fromEmail } = resendClient;

  await client.emails.send({
    from: fromEmail || 'ChantLive <noreply@chantlive.online>',
    to: toEmail,
    subject: 'Verify your ChantLive account',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px;">
        <h2 style="color: #111; margin-bottom: 8px;">Welcome to ChantLive, ${name}!</h2>
        <p style="color: #555; line-height: 1.5;">Click the button below to verify your email address and activate your account.</p>
        <a href="${verificationUrl}" style="display: inline-block; background: #111; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; margin: 16px 0;">Verify Email</a>
        <p style="color: #888; font-size: 13px; margin-top: 24px;">If you didn't create an account, you can safely ignore this email. This link expires in 24 hours.</p>
      </div>
    `,
  });
}


export async function sendPasswordResetEmail(toEmail: string, name: string, resetUrl: string) {
  const resendClient = await getResendClient();
  if (!resendClient) {
    console.log(`[Email Bypassed] Password reset for ${toEmail}: ${resetUrl}`);
    return;
  }
  const { client, fromEmail } = resendClient;

  await client.emails.send({
    from: fromEmail || 'ChantLive <noreply@chantlive.online>',
    to: toEmail,
    subject: 'Reset your ChantLive password',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px;">
        <h2 style="color: #111; margin-bottom: 8px;">Password reset request</h2>
        <p style="color: #555; line-height: 1.5;">Hi ${name}, click the button below to reset your password.</p>
        <a href="${resetUrl}" style="display: inline-block; background: #111; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; margin: 16px 0;">Reset Password</a>
        <p style="color: #888; font-size: 13px; margin-top: 24px;">If you didn't request this, you can ignore this email. This link expires in 1 hour.</p>
      </div>
    `,
  });
}
