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
  console.error(
    'Usage: node script/send-community-outreach.js <email> <organization> <fit> [focus]',
  );
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

const subject = 'Could two people try ChantLive for seven minutes?';
const body = `Hi ${organization} team,

I maintain ChantLive, a free and open-source tool that helps an organizer show the current chant to people at a demonstration or public event:

https://chantlive.online/
https://github.com/barsham/ChantLive

I am reaching out because ${fit}.

Could two people from your team or network try a prepared seven-minute test? One person acts as the organizer and the other joins as a participant. One person using two browsers or devices also works.

The test is:

1. Create a sample event with three harmless test chants.
2. Open its ordinary participant link on the second device or browser.
3. Change the current chant three times.
4. Reply with where you hesitated, your biggest trust concern, and the one change that would help most.

${experimentRequest ? `${experimentRequest}\n\n` : ''}Participants do not need an account, and the ordinary link can be used without scanning a QR code.

There is no paid offer, promotion request, endorsement request, or partnership pitch. The aim is simply to improve a free community tool through candid feedback. If it is not relevant, no need to reply.

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
