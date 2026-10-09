import { createHash, createHmac, randomBytes } from 'node:crypto';
import { validateWaitlist } from './waitlist-validation.js';
import { confirmationEmail } from './waitlist-email.js';

const MAX_BODY_BYTES = 2048;
const unavailableMessage = 'Die Anmeldung ist gerade nicht verfügbar. Bitte versuche es später erneut.';
const mailFailedMessage = 'Die Bestätigungs-E-Mail konnte gerade nicht verschickt werden. Bitte versuche es gleich noch einmal.';
const reply = (status, error) => Response.json(error ? { ok: false, error } : { ok: true }, {
  status, headers: { 'Cache-Control': 'no-store', ...(status === 429 ? { 'Retry-After': '3600' } : {}) },
});

export const CONFIRM_PATH = '/warteliste/bestaetigen';
export const CONFIRMED_PATH = '/warteliste/bestaetigt';
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
export const tokenDigest = (token) => createHash('sha256').update(token).digest('hex');

async function readBodyText(request) {
  if (Number(request.headers.get('content-length')) > MAX_BODY_BYTES) throw new Error('body');
  if (!request.body) throw new Error('body');
  const reader = request.body.getReader();
  let size = 0;
  let body = '';
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) { await reader.cancel(); throw new Error('body'); }
      body += decoder.decode(value, { stream: true });
    }
    return body + decoder.decode();
  } finally { reader.releaseLock(); }
}

function supabaseConfiguration(env) {
  const value = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  if (!value || !env.SUPABASE_SERVICE_ROLE_KEY) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') return null;
    return { url: url.origin, key: env.SUPABASE_SERVICE_ROLE_KEY };
  } catch { return null; }
}

/* The link in the email is built from the configured site address, never
   from the request's Host header. */
function mailConfiguration(env) {
  if (!env.RESEND_API_KEY?.trim() || !env.WAITLIST_FROM_EMAIL?.trim()) return null;
  try {
    const site = new URL(env.NEXT_PUBLIC_SITE_URL);
    if (site.protocol !== 'https:' || site.pathname !== '/' || site.search || site.hash) return null;
    return { key: env.RESEND_API_KEY.trim(), from: env.WAITLIST_FROM_EMAIL.trim(), siteUrl: site.origin };
  } catch { return null; }
}

const rpc = (config, fetchImpl, name, body) => fetchImpl(`${config.url}/rest/v1/rpc/${name}`, {
  method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(7000),
  headers: { 'Content-Type': 'application/json', apikey: config.key, Authorization: `Bearer ${config.key}` },
  body: JSON.stringify(body),
});

async function sendConfirmation(mail, fetchImpl, to, link, earlyAccess) {
  const message = confirmationEmail(link, { earlyAccess });
  const response = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(7000),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${mail.key}` },
    body: JSON.stringify({ from: mail.from, to: [to], subject: message.subject, html: message.html, text: message.text }),
  });
  if (!response.ok) throw new Error('mail');
}

export async function handleWaitlist(request, { env = process.env, fetchImpl = fetch } = {}) {
  const origin = request.headers.get('origin');
  if (origin !== new URL(request.url).origin
    || request.headers.get('sec-fetch-site') === 'cross-site'
    || request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    return reply(400, 'Diese Anfrage konnte nicht verarbeitet werden.');
  }
  let data;
  try { data = validateWaitlist(JSON.parse(await readBodyText(request))); }
  catch { return reply(400, 'Bitte prüfe deine E-Mail-Adresse und bestätige die Anmeldung.'); }
  if (data.website) return reply(200);
  const config = supabaseConfiguration(env);
  const mail = mailConfiguration(env);
  if (!config || !mail) return reply(503, unavailableMessage);
  // Vercel overwrites this header. Other hosts share a conservative fallback bucket
  // until a trusted reverse-proxy IP integration is explicitly configured.
  const ip = env.VERCEL === '1' ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0].trim() || 'unknown' : 'unknown';
  const rateKey = createHmac('sha256', env.WAITLIST_RATE_LIMIT_SECRET || config.key).update(ip).digest('hex');
  const token = randomBytes(32).toString('base64url');
  const tokenHash = tokenDigest(token);

  let status;
  try {
    const result = await rpc(config, fetchImpl, 'pistl_request_waitlist', {
      p_email: data.email, p_early_access: data.earlyAccess, p_rate_key: rateKey, p_token_hash: tokenHash,
    });
    if (!result.ok) return reply(503, unavailableMessage);
    status = await result.json();
  } catch { return reply(503, unavailableMessage); }

  if (status === 'rate_limited') return reply(429, 'Zu viele Versuche. Bitte versuche es in einer Stunde erneut.');
  // Already confirmed or emailed a moment ago: same answer, so the form
  // does not tell strangers who is on the list.
  if (status === 'confirmed' || status === 'wait') return reply(200);
  if (status !== 'send') return reply(503, unavailableMessage);

  try {
    await sendConfirmation(mail, fetchImpl, data.email, `${mail.siteUrl}${CONFIRM_PATH}?t=${token}`, data.earlyAccess);
    return reply(200);
  } catch {
    // Let the next attempt send straight away instead of waiting out the pause.
    try { await rpc(config, fetchImpl, 'pistl_release_waitlist_token', { p_token_hash: tokenHash }); } catch { /* the pause then applies */ }
    return reply(503, mailFailedMessage);
  }
}

/* The link in the email opens a page with a button; only that button's
   POST confirms. Mail scanners that follow links therefore cannot
   confirm on someone's behalf. */
export async function handleConfirm(request, { env = process.env, fetchImpl = fetch } = {}) {
  const back = (path) => new Response(null, { status: 303, headers: { Location: path, 'Cache-Control': 'no-store' } });
  const invalid = `${CONFIRM_PATH}?fehler=1`;
  if (request.headers.get('origin') !== new URL(request.url).origin
    || request.headers.get('sec-fetch-site') === 'cross-site') return back(invalid);
  let token;
  try {
    // Bound the actual stream before parsing; Content-Length may be absent
    // or understate the size of a chunked request.
    const body = await readBodyText(request);
    const form = await new Response(body, {
      headers: { 'Content-Type': request.headers.get('content-type') || '' },
    }).formData();
    token = form.get('t');
  } catch { return back(invalid); }
  if (typeof token !== 'string' || !TOKEN_PATTERN.test(token)) return back(invalid);
  const config = supabaseConfiguration(env);
  if (!config) return back(`${CONFIRM_PATH}?fehler=2`);
  try {
    const result = await rpc(config, fetchImpl, 'pistl_confirm_waitlist', { p_token_hash: tokenDigest(token) });
    if (!result.ok) return back(`${CONFIRM_PATH}?fehler=2`);
    return back((await result.json()) === 'confirmed' ? CONFIRMED_PATH : invalid);
  } catch { return back(`${CONFIRM_PATH}?fehler=2`); }
}
