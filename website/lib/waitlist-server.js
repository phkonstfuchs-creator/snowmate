import { createHmac } from 'node:crypto';
import { validateWaitlist } from './waitlist-validation.js';

const MAX_BODY_BYTES = 2048;
const unavailableMessage = 'Die Anmeldung ist gerade nicht verfügbar. Bitte versuche es später erneut.';
const reply = (status, error) => Response.json(error ? { ok: false, error } : { ok: true }, {
  status, headers: { 'Cache-Control': 'no-store', ...(status === 429 ? { 'Retry-After': '3600' } : {}) },
});

async function readBody(request) {
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
    return JSON.parse(body + decoder.decode());
  } finally { reader.releaseLock(); }
}

function configuration(env) {
  const value = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  if (!value || !env.SUPABASE_SERVICE_ROLE_KEY) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') return null;
    return { url: url.origin, key: env.SUPABASE_SERVICE_ROLE_KEY };
  } catch { return null; }
}

export async function handleWaitlist(request, { env = process.env, fetchImpl = fetch } = {}) {
  const origin = request.headers.get('origin');
  if (origin !== new URL(request.url).origin
    || request.headers.get('sec-fetch-site') === 'cross-site'
    || request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    return reply(400, 'Diese Anfrage konnte nicht verarbeitet werden.');
  }
  let data;
  try { data = validateWaitlist(await readBody(request)); }
  catch { return reply(400, 'Bitte prüfe deine E-Mail-Adresse und bestätige die Anmeldung.'); }
  if (data.website) return reply(200);
  const config = configuration(env);
  if (!config) return reply(503, unavailableMessage);
  // Vercel overwrites this header. Other hosts share a conservative fallback bucket
  // until a trusted reverse-proxy IP integration is explicitly configured.
  const ip = env.VERCEL === '1' ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0].trim() || 'unknown' : 'unknown';
  const rateKey = createHmac('sha256', env.WAITLIST_RATE_LIMIT_SECRET || config.key).update(ip).digest('hex');
  try {
    const result = await fetchImpl(`${config.url}/rest/v1/rpc/pistl_join_waitlist`, {
      method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(7000),
      headers: { 'Content-Type': 'application/json', apikey: config.key, Authorization: `Bearer ${config.key}` },
      body: JSON.stringify({ p_email: data.email, p_early_access: data.earlyAccess, p_rate_key: rateKey }),
    });
    if (!result.ok) return reply(503, unavailableMessage);
    const status = await result.json();
    if (status === 'rate_limited') return reply(429, 'Zu viele Versuche. Bitte versuche es in einer Stunde erneut.');
    return status === 'accepted' ? reply(200) : reply(503, unavailableMessage);
  } catch { return reply(503, unavailableMessage); }
}
