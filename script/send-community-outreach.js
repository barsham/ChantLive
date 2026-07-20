import fs from 'node:fs';
import tls from 'node:tls';

function loadEnv(path) {
  const values = {};
  for (const line of fs.readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[match[1]] = value;
  }
  return values;
}

const [, , recipient, organization, fit, experimentRequest] = process.argv;
if (!recipient || !organization || !fit) {
  console.error('Usage: node script/send-community-outreach.js <email> <organization> <fit>');
  process.exit(2);
}

const env = { ...process.env, ...loadEnv('.env') };
const host = env.CHANTLIVE_SMTP_HOST;
const port = Number(env.CHANTLIVE_SMTP_PORT || 465);
const user = env.CHANTLIVE_SMTP_USER;
const password = env.CHANTLIVE_SMTP_PASS;
const from = env.CHANTLIVE_FROM_EMAIL;

if (!host || !user || !password || !from) {
  console.error('Missing ChantLive SMTP configuration in .env');
  process.exit(2);
}

const subject = 'Could you sanity-check a free event chant coordination tool?';
const body = `Hi ${organization} team,

I maintain ChantLive, a free and open-source real-time chant coordination tool for demonstrations and public events:

https://chantlive.online/
https://github.com/barsham/ChantLive

I am reaching out because ${fit} could be very helpful in testing whether this is actually useful, safe, accessible, and understandable for real organizers and participants.

${experimentRequest ? `${experimentRequest}\n\n` : ''}The basic flow is that an organizer prepares a chant list and pushes the current chant live. Participants join from a public link or QR code and do not need an account.

I am not asking for promotion or endorsement. I would really appreciate a short practical review from someone in your team or network. A useful test takes about 10 minutes:

1. Create a sample event.
2. Add 2-3 chants.
3. Open the participant link on another phone or browser.
4. Tell me what would need to change before this could be used at a real rally, vigil, march, meeting, or public event.

Feedback that would help most:

- What would make you trust or not trust this tool?
- What should participants see before joining?
- What privacy or safety concerns should be addressed before broader use?
- What accessibility issues should be fixed in the public-link or QR-code flow?
- Should ChantLive support self-hosting instructions for groups that need tighter control?

If this is appropriate for someone in your team or network to test, I would be grateful for any feedback. If it is not relevant, no need to reply.

Thank you for the work you do, and thank you for any contribution you can make to improving this.

Kind regards,
Barsham Sotoudeh
ChantLive
${from}`;

const message = [
  `From: ChantLive <${from}>`,
  `To: ${organization} <${recipient}>`,
  `Subject: ${subject}`,
  `Date: ${new Date().toUTCString()}`,
  `Message-ID: <${Date.now()}.${Math.random().toString(16).slice(2)}@chantlive.online>`,
  'MIME-Version: 1.0',
  'Content-Type: text/plain; charset=utf-8',
  'Content-Transfer-Encoding: 8bit',
  '',
  body,
].join('\r\n').replace(/^\./gm, '..') + '\r\n.\r\n';

const socket = tls.connect({ host, port, servername: host });
socket.setEncoding('utf8');

let buffer = '';
const replies = [];
const waiters = [];

function consumeReplies() {
  while (true) {
    const match = buffer.match(/^(\d{3})([ -])[^\r\n]*(?:\r?\n|$)/);
    if (!match) return;
    const code = Number(match[1]);
    const separator = match[2];
    const lineLength = match[0].length;
    buffer = buffer.slice(lineLength);
    if (separator === '-') continue;
    const waiter = waiters.shift();
    if (waiter) waiter(code);
    else replies.push(code);
  }
}

socket.on('data', chunk => {
  buffer += chunk;
  consumeReplies();
});

function response() {
  if (replies.length) return Promise.resolve(replies.shift());
  return new Promise(resolve => waiters.push(resolve));
}

async function command(text, expected) {
  socket.write(`${text}\r\n`);
  const code = await response();
  if (!expected.includes(code)) throw new Error(`SMTP command failed with status ${code}`);
}

socket.on('secureConnect', async () => {
  try {
    if ((await response()) !== 220) throw new Error('SMTP greeting failed');
    await command('EHLO chantlive.online', [250]);
    await command('AUTH LOGIN', [334]);
    await command(Buffer.from(user).toString('base64'), [334]);
    await command(Buffer.from(password).toString('base64'), [235]);
    await command(`MAIL FROM:<${from}>`, [250]);
    await command(`RCPT TO:<${recipient}>`, [250, 251]);
    await command('DATA', [354]);
    socket.write(message);
    if ((await response()) !== 250) throw new Error('SMTP server did not accept the message');
    await command('QUIT', [221]);
    console.log(`Sent to ${organization} <${recipient}>`);
    socket.end();
  } catch (error) {
    console.error(error.message);
    socket.destroy();
    process.exitCode = 1;
  }
});

socket.on('error', error => {
  console.error(`SMTP connection failed: ${error.message}`);
  process.exitCode = 1;
});
