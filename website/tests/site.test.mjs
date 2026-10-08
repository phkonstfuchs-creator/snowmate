import { test } from 'node:test';
import assert from 'node:assert/strict';

test('contact defaults distinguish support, abuse and privacy', async () => {
  const previous = process.env.PISTL_CONTACT_EMAIL;
  delete process.env.PISTL_CONTACT_EMAIL;
  try {
    const site = await import('../lib/site.js?contact-defaults');
    assert.equal(site.contactEmail, 'support@pistl.app');
    assert.equal(site.reportEmail, 'meldung@pistl.app');
    assert.equal(site.privacyEmail, 'datenschutz@pistl.app');
  } finally {
    if (previous === undefined) delete process.env.PISTL_CONTACT_EMAIL;
    else process.env.PISTL_CONTACT_EMAIL = previous;
  }
});
