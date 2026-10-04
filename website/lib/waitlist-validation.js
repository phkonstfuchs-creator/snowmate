const allowedKeys = new Set(['email', 'earlyAccess', 'consent', 'website']);

export function validateWaitlist(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)
    || Object.keys(input).some((key) => !allowedKeys.has(key))
    || typeof input.email !== 'string'
    || typeof input.earlyAccess !== 'boolean'
    || input.consent !== true
    || typeof input.website !== 'string'
    || input.website.length > 200) {
    throw new Error('Bitte prüfe deine Angaben und bestätige die Anmeldung.');
  }
  const email = input.email.trim().toLowerCase();
  if (email.length > 254 || !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(email)
    || email.split('@')[0].length > 64 || email.startsWith('.') || email.includes('..') || email.includes('.@')) {
    throw new Error('Bitte gib eine gültige E-Mail-Adresse ein.');
  }
  return { email, earlyAccess: input.earlyAccess, consent: true, website: input.website };
}
