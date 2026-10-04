import test from 'node:test';
import assert from 'node:assert/strict';
import { handleWaitlist } from '../lib/waitlist-server.js';
const env = { SUPABASE_URL: 'https://project.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'test-service-key' };
const payload = { email: ' Rider@Example.com ', earlyAccess: true, consent: true, website: '' };
const request = (data = payload, headers = {}) => new Request('https://pistl.example/api/waitlist', { method: 'POST', headers: {'content-type': 'application/json', origin: 'https://pistl.example', ...headers}, body: JSON.stringify(data) });
const unavailable = async () => { throw new Error('Must not call upstream'); };
test('valid registration invokes RPC with normalized data and opaque rate key', async () => {
  let called = 0;
  const response = await handleWaitlist(request(), { env, fetchImpl: async (url, options) => {
    called++;
    assert.equal(url, 'https://project.supabase.co/rest/v1/rpc/pistl_join_waitlist');
    const body = JSON.parse(options.body);
    assert.equal(body.p_email, 'rider@example.com');
    assert.equal(body.p_early_access, true);
    assert.match(body.p_rate_key, /^[a-f0-9]{64}$/);
    assert.equal(options.headers.Authorization, 'Bearer test-service-key');
    return Response.json('accepted');
  }});
  assert.equal(called, 1);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {ok: true});
});
test('valid-looking forms cannot claim success without configured storage', async () => {
  assert.equal((await handleWaitlist(request(), { env: {}, fetchImpl: unavailable })).status, 503);
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
  for (const [upstream, expected] of [[Response.json('rate_limited'),429], [Response.json({secret:'never reveal'}, {status:500}),503], [Response.json('unexpected'),503]]) {
    const response = await handleWaitlist(request(), {env, fetchImpl:async()=>upstream});
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
    await handleWaitlist(request(payload, {'x-vercel-forwarded-for':ip}), {env:{...env,VERCEL:'1'},fetchImpl:async (_url,options)=>{
      const body = JSON.parse(options.body);
      keys.push(body.p_rate_key);
      assert.equal(options.body.includes(ip),false);
      assert.ok(options.signal instanceof AbortSignal);
      return Response.json('accepted');
    }});
  }
  assert.notEqual(keys[0],keys[1]);
});
