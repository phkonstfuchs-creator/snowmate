import test from 'node:test';
import assert from 'node:assert/strict';
import { validateWaitlist } from '../lib/waitlist-validation.js';
const valid = { email: ' Rider@Example.com ', earlyAccess: true, consent: true, website: '' };
test('normalizes email without mutating input', () => {
  assert.deepEqual(validateWaitlist(valid), { email: 'rider@example.com', earlyAccess: true, consent: true, website: '' });
  assert.equal(valid.email, ' Rider@Example.com ');
});
test('rejects missing consent, invalid addresses, wrong types, and extra fields', () => {
  for (const value of [null, [], {}, {...valid, consent: false}, {...valid, email: 'x@y'}, {...valid, email: 'a\nb@example.com'}, {...valid, earlyAccess: 'yes'}, {...valid, website: 2}, {...valid, surprise: true}, {...valid, email: `${'a'.repeat(255)}@example.com`}]) {
    assert.throws(() => validateWaitlist(value));
  }
});
