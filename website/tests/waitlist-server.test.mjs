import test from 'node:test';
import assert from 'node:assert/strict';
import { handleConfirm, handleWaitlist, tokenDigest } from '../lib/waitlist-server.js';
import { confirmationEmail } from '../lib/waitlist-email.js';

const env = {
  SUPABASE_URL: 'https://project.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
  RESEND_API_KEY: 're_test', WAITLIST_FROM_EMAIL: 'Pistl <hallo@pistl.example>', NEXT_PUBLIC_SITE_URL: 'https://pistl.example',
};
const payload = { email: ' Rider@Example.com ', earlyAccess: true, consent: true, website: '' };
const request = (data = payload, headers = {}) => new Request('https://pistl.example/api/waitlist', { method: 'POST', headers: {'content-type': 'application/json', origin: 'https://pistl.example', ...headers}, body: JSON.stringify(data) });
const unavailable = async () => { throw new Error('Must not call upstream'); };

/* Fake Supabase and Resend: records every call, answers per endpoint. */
function upstream({ status = 'send', mail = () => Response.json({ id: 'm1' }) } = {}) {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options, body: JSON.parse(options.body) });
    if (url.endsWith('/rpc/pistl_request_waitlist')) return Response.json(status);
    if (url.endsWith('/rpc/pistl_release_waitlist_token')) return new Response(null, { status: 204 });
    if (url === 'https://api.resend.com/emails') return mail();
    throw new Error(`unexpected ${url}`);
  };
  return { calls, fetchImpl };
}

test('a new signup stores a token digest and emails the matching link', async () => {
  const { calls, fetchImpl } = upstream();
  const response = await handleWaitlist(request(), { env, fetchImpl });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  const [rpc, mail] = calls;
  assert.equal(rpc.url, 'https://project.supabase.co/rest/v1/rpc/pistl_request_waitlist');
  assert.equal(rpc.body.p_email, 'rider@example.com');
  assert.equal(rpc.body.p_early_access, true);
  assert.match(rpc.body.p_rate_key, /^[a-f0-9]{64}$/);
  assert.match(rpc.body.p_token_hash, /^[a-f0-9]{64}$/);
  assert.equal(rpc.options.headers.Authorization, 'Bearer test-service-key');
  assert.equal(mail.options.headers.Authorization, 'Bearer re_test');
  assert.deepEqual(mail.body.to, ['rider@example.com']);
  assert.equal(mail.body.from, 'Pistl <hallo@pistl.example>');
  const token = mail.body.text.match(/https:\/\/pistl\.example\/warteliste\/bestaetigen\?t=([A-Za-z0-9_-]{43})/)[1];
  assert.equal(tokenDigest(token), rpc.body.p_token_hash);
  assert.equal(JSON.stringify(rpc.body).includes(token), false, 'the raw token never reaches the database');
});

test('the link uses the configured site address, not the request host', async () => {
  const { calls, fetchImpl } = upstream();
  const spoofed = new Request('https://evil.example/api/waitlist', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://evil.example' }, body: JSON.stringify(payload) });
  assert.equal((await handleWaitlist(spoofed, { env, fetchImpl })).status, 200);
  assert.equal(calls[1].body.text.includes('evil.example'), false);
});

test('already confirmed or just emailed gets the same answer and no email', async () => {
  for (const status of ['confirmed', 'wait']) {
    const { calls, fetchImpl } = upstream({ status });
    const response = await handleWaitlist(request(), { env, fetchImpl });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
    assert.equal(calls.some((call) => call.url.includes('resend')), false);
  }
});

test('a failed email is reported honestly and releases the token', async () => {
  for (const mail of [() => Response.json({ message: 'secret' }, { status: 500 }), () => { throw new Error('secret'); }]) {
    const { calls, fetchImpl } = upstream({ mail });
    const response = await handleWaitlist(request(), { env, fetchImpl });
    assert.equal(response.status, 503);
    const body = await response.text();
    assert.equal(body.includes('secret'), false);
    const release = calls.find((call) => call.url.endsWith('/rpc/pistl_release_waitlist_token'));
    assert.equal(release.body.p_token_hash, calls[0].body.p_token_hash);
  }
});

test('valid-looking forms cannot claim success without storage or email configured', async () => {
  assert.equal((await handleWaitlist(request(), { env: {}, fetchImpl: unavailable })).status, 503);
  for (const missing of ['RESEND_API_KEY', 'WAITLIST_FROM_EMAIL', 'NEXT_PUBLIC_SITE_URL']) {
    assert.equal((await handleWaitlist(request(), { env: { ...env, [missing]: '' }, fetchImpl: unavailable })).status, 503);
  }
  for (const site of ['http://pistl.example', 'https://pistl.example/path', 'not a url']) {
    assert.equal((await handleWaitlist(request(), { env: { ...env, NEXT_PUBLIC_SITE_URL: site }, fetchImpl: unavailable })).status, 503);
  }
});

test('invalid submissions are rejected before upstream', async () => {
  for (const req of [request({...payload, consent: false}), request(payload, {origin:'https://evil.example'}), request(payload, {'content-type':'text/plain'}), request({...payload, email:'x'.repeat(5000)}), request(payload, {'sec-fetch-site':'cross-site'})]) {
    assert.equal((await handleWaitlist(req, {env, fetchImpl: unavailable})).status, 400);
  }
});

test('honeypot returns generic success without database writes', async () => {
  assert.equal((await handleWaitlist(request({...payload, website:'bot'}), {env, fetchImpl: unavailable})).status, 200);
});

test('upstream rate limits and failures become safe errors', async () => {
  for (const [answer, expected] of [[Response.json('rate_limited'),429], [Response.json({secret:'never reveal'}, {status:500}),503], [Response.json('unexpected'),503]]) {
    const response = await handleWaitlist(request(), {env, fetchImpl:async()=>answer});
    assert.equal(response.status, expected);
    assert.equal((await response.text()).includes('secret'), false);
  }
  assert.equal((await handleWaitlist(request(), {env, fetchImpl:async()=>{throw Error('secret')}})).status,503);
});

test('rejects oversized chunked bodies and malformed JSON', async () => {
  for (const body of ['{', ' '.repeat(5000)]) {
    const req = new Request('https://pistl.example/api/waitlist', {method:'POST', headers:{origin:'https://pistl.example','content-type':'application/json'},body});
    assert.equal((await handleWaitlist(req,{env,fetchImpl:unavailable})).status,400);
  }
});

test('invalid server configuration fails closed', async () => {
  for (const url of ['http://project.supabase.co','not a url','https://user:pass@project.supabase.co','https://project.supabase.co/path']) {
    assert.equal((await handleWaitlist(request(), {env:{...env,SUPABASE_URL:url},fetchImpl:unavailable})).status,503);
  }
});

test('Vercel client addresses are HMAC hashed and upstream requests are bounded', async () => {
  const keys = [];
  for (const ip of ['192.0.2.1','192.0.2.2']) {
    await handleWaitlist(request(payload, {'x-vercel-forwarded-for':ip}), {env:{...env,VERCEL:'1'},fetchImpl:async (url,options)=>{
      assert.ok(options.signal instanceof AbortSignal);
      if (!url.endsWith('/rpc/pistl_request_waitlist')) return Response.json({ id: 'm' });
      keys.push(JSON.parse(options.body).p_rate_key);
      assert.equal(options.body.includes(ip),false);
      return Response.json('send');
    }});
  }
  assert.notEqual(keys[0],keys[1]);
});

const token = 'A'.repeat(43);
const confirmRequest = (body = `t=${token}`, headers = {}) => new Request('https://pistl.example/api/waitlist/confirm', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', origin: 'https://pistl.example', ...headers }, body });

test('confirming sends only the token digest and leads to the confirmed page', async () => {
  let sent;
  const response = await handleConfirm(confirmRequest(), { env, fetchImpl: async (url, options) => {
    assert.equal(url, 'https://project.supabase.co/rest/v1/rpc/pistl_confirm_waitlist');
    sent = JSON.parse(options.body);
    return Response.json('confirmed');
  }});
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('location'), '/warteliste/bestaetigt');
  assert.deepEqual(sent, { p_token_hash: tokenDigest(token) });
});

test('unknown, malformed or cross-site confirmations do not confirm', async () => {
  const invalid = '/warteliste/bestaetigen?fehler=1';
  const answer = await handleConfirm(confirmRequest(), { env, fetchImpl: async () => Response.json('invalid') });
  assert.equal(answer.headers.get('location'), invalid);
  for (const req of [confirmRequest('t=short'), confirmRequest(''), confirmRequest(`t=${token}`, { origin: 'https://evil.example' }), confirmRequest(`t=${token}`, { 'sec-fetch-site': 'cross-site' })]) {
    const response = await handleConfirm(req, { env, fetchImpl: unavailable });
    assert.equal(response.status, 303);
    assert.equal(response.headers.get('location'), invalid);
  }
});

test('a storage failure during confirmation says so', async () => {
  for (const fetchImpl of [async () => { throw new Error('down'); }, async () => new Response('x', { status: 500 })]) {
    const response = await handleConfirm(confirmRequest(), { env, fetchImpl });
    assert.equal(response.headers.get('location'), '/warteliste/bestaetigen?fehler=2');
  }
  assert.equal((await handleConfirm(confirmRequest(), { env: {}, fetchImpl: unavailable })).headers.get('location'), '/warteliste/bestaetigen?fehler=2');
});

test('the confirmation email escapes the link and names the sender', () => {
  const message = confirmationEmail('https://pistl.example/x?t=a"><script>');
  assert.equal(message.html.includes('<script>'), false);
  assert.match(message.subject, /Willkommen bei Pistl/);
  assert.match(message.text, /sieben Tage/);
  assert.match(message.text, /Kleinblittersdorf/);
});
