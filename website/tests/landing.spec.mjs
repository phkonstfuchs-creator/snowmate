import { test, expect } from '@playwright/test';

const emailAddress = 'pistl-test@example.com';

async function completeWaitlist(page, { earlyAccess = false } = {}) {
  const form = page.getByRole('form', { name: 'Pistl Warteliste' });
  await form.getByLabel('Deine E-Mail-Adresse', { exact: true }).fill(emailAddress);
  if (earlyAccess) {
    await form.getByLabel('Ich möchte auch am Early Access teilnehmen.', { exact: true }).check();
  }
  await form.getByLabel(/Ich möchte per E-Mail/).check();
  return form;
}

test('waitlist sends explicit preferences and confirms only a successful signup', async ({ page }) => {
  let payload;
  await page.route('**/api/waitlist', async (route) => {
    expect(route.request().method()).toBe('POST');
    payload = route.request().postDataJSON();
    await route.fulfill({ json: { ok: true } });
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Wer fährt heute wohin?');
  await expect(page.getByLabel('Ich möchte auch am Early Access teilnehmen.', { exact: true })).not.toBeChecked();
  const form = await completeWaitlist(page, { earlyAccess: true });
  await form.getByRole('button', { name: 'Auf die Warteliste', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Fast geschafft – schau in dein Postfach.' })).toBeVisible();
  expect(payload).toEqual({ email: emailAddress, earlyAccess: true, consent: true, website: '' });
});

test('invalid email and missing consent do not submit personal data', async ({ page }) => {
  let submissions = 0;
  await page.route('**/api/waitlist', async (route) => {
    submissions += 1;
    await route.fulfill({ json: { ok: true } });
  });
  await page.goto('/#waitlist');
  const form = page.getByRole('form', { name: 'Pistl Warteliste' });
  const email = form.getByLabel('Deine E-Mail-Adresse', { exact: true });
  const submit = form.getByRole('button', { name: 'Auf die Warteliste', exact: true });
  await email.fill('invalid-email');
  await submit.click();
  expect(await email.evaluate((input) => input.validity.valid)).toBe(false);
  await email.fill(emailAddress);
  await submit.click();
  await expect(form.getByLabel(/Ich möchte per E-Mail/)).not.toBeChecked();
  await expect(page.getByRole('heading', { name: 'Fast geschafft – schau in dein Postfach.' })).toHaveCount(0);
  expect(submissions).toBe(0);
});

test('failed signup retains email, allows retry, and keeps Early Access optional', async ({ page }) => {
  let attempts = 0;
  await page.route('**/api/waitlist', async (route) => {
    attempts += 1;
    expect(route.request().postDataJSON().earlyAccess).toBe(false);
    await route.fulfill(attempts === 1
      ? { status: 503, json: { ok: false, error: 'Bitte versuche es später erneut.' } }
      : { json: { ok: true } });
  });
  await page.goto('/#waitlist');
  const form = await completeWaitlist(page);
  const submit = form.getByRole('button', { name: 'Auf die Warteliste', exact: true });
  await submit.click();
  await expect(form.getByRole('alert')).toBeVisible();
  await expect(form.getByLabel('Deine E-Mail-Adresse', { exact: true })).toHaveValue(emailAddress);
  await expect(page.getByRole('heading', { name: 'Fast geschafft – schau in dein Postfach.' })).toHaveCount(0);
  await submit.click();
  await expect(page.getByRole('heading', { name: 'Fast geschafft – schau in dein Postfach.' })).toBeVisible();
  expect(attempts).toBe(2);
});

test('HTTP success with an unsuccessful response does not claim signup', async ({ page }) => {
  await page.route('**/api/waitlist', (route) => route.fulfill({ json: { ok: false, error: 'Anmeldung nicht möglich.' } }));
  await page.goto('/#waitlist');
  const form = await completeWaitlist(page);
  await form.getByRole('button', { name: 'Auf die Warteliste', exact: true }).click();
  await expect(form.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Fast geschafft – schau in dein Postfach.' })).toHaveCount(0);
});

test('feature explorer changes the entire panel and supports keyboard navigation', async ({ page }) => {
  await page.goto('/#entdecken');
  const names = ['Ride planen', 'Mitfahren', 'Crew treffen', 'Events finden'];
  const headings = ['Ein Ride. Alle wissen Bescheid.', 'Ein freier Sitz ist ein guter Anfang.', 'Andere Piste. Gleiche Crew.', 'Ein Anlass, gemeinsam rauszukommen.'];
  for (const [index, name] of names.entries()) {
    await page.getByRole('tab', { name, exact: true }).click();
    await expect(page.getByRole('tabpanel')).toHaveAccessibleName(name);
    await expect(page.getByRole('tabpanel').getByRole('heading')).toHaveText(headings[index]);
    await expect(page.getByRole('tabpanel').locator('li')).toHaveCount(3);
    await expect(page.locator('.feature-art')).toHaveCount(1);
  }
  await page.getByRole('tab', { name: 'Events finden' }).press('Home');
  await expect(page.getByRole('tab', { name: 'Ride planen' })).toBeFocused();
  await page.getByRole('tab', { name: 'Ride planen' }).press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Mitfahren' })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('tab', { name: 'Mitfahren' }).press('Tab');
  await expect(page.getByRole('tabpanel')).toBeFocused();
});

test('reduced motion disables decorative transforms', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.panorama-image--distant')).toBeVisible();
  expect(await page.locator('.panorama-image--distant').evaluate((image) => getComputedStyle(image).transform)).toBe('none');
  expect(await page.locator('.feature-art').evaluate((art) => getComputedStyle(art).transform)).toBe('none');
  await expect(page.locator('.mountain-riders, .map-sample, .bergtag-steps')).toHaveCount(0);
});

test('mobile menu closes on Escape and selection; every feature fits narrow screens', async ({ page }) => {
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    await page.getByRole('button', { name: 'Menü öffnen', exact: true }).click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Menü öffnen' })).toBeFocused();
    await expect(page.getByRole('navigation', { name: 'Mobile Navigation' })).toBeHidden();
    await page.getByRole('button', { name: 'Menü öffnen', exact: true }).click();
    await page.getByRole('navigation', { name: 'Mobile Navigation' }).getByRole('link', { name: 'Entdecken' }).click();
    await expect(page).toHaveURL(/\/#entdecken$/);
    await expect(page.getByRole('navigation', { name: 'Mobile Navigation' })).toBeHidden();
    for (const tab of await page.getByRole('tab').all()) {
      await tab.click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      expect(await page.getByRole('tabpanel').getByRole('heading').evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    }
  }
});

test('feature headlines fit tablet screens and signup follows consent', async ({ page }) => {
  await page.setViewportSize({ width: 761, height: 950 });
  await page.goto('/');
  for (const tab of await page.getByRole('tab').all()) {
    await tab.click();
    expect(await page.getByRole('tabpanel').getByRole('heading').evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  }
  const order = await page.getByRole('form').locator('input:not([tabindex="-1"]), button[type="submit"]').evaluateAll((elements) => elements.map((element) => element.getAttribute('name') || element.getAttribute('type')));
  expect(order).toEqual(['email', 'earlyAccess', 'consent', 'submit']);
});

test('metadata, footer destinations, logo and custom 404 are usable', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Pistl/);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /Skifahrer und Snowboarder/);
  const iconUrl = await page.locator('link[rel="icon"]').first().getAttribute('href');
  expect((await page.request.get(iconUrl)).ok()).toBe(true);
  await expect(page.locator('footer')).toContainText(String(new Date().getFullYear()));
  for (const [name, path] of [['Kontakt', '/kontakt'], ['Impressum', '/impressum'], ['Datenschutz', '/datenschutz']]) {
    await page.locator('footer').getByRole('link', { name, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    if (path === '/impressum') {
      await expect(page.locator('main')).toContainText('In den Kiefern 3');
      await expect(page.getByRole('link', { name: 'vfxphilipp@outlook.com' })).toHaveAttribute('href', 'mailto:vfxphilipp@outlook.com');
      await expect(page.getByRole('link', { name: 'Hanken Grotesk' })).toHaveAttribute('href', '/licenses/hanken-grotesk.txt');
    }
  }
  await page.getByRole('link', { name: 'Pistl – Startseite' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Wer fährt heute wohin?');
  const response = await page.goto('/diese-piste-gibt-es-nicht');
  expect(response.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'Hier geht’s zurück.' })).toBeVisible();
  await page.getByRole('link', { name: 'Zur Startseite', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
});

test('opening the email link alone confirms nothing; the button does', async ({ page }) => {
  let confirmations = 0;
  await page.route('**/api/waitlist/confirm', async (route) => {
    confirmations += 1;
    expect(route.request().method()).toBe('POST');
    expect(route.request().postData()).toBe(`t=${'A'.repeat(43)}`);
    await route.fulfill({ status: 303, headers: { Location: '/warteliste/bestaetigt' } });
  });
  await page.goto(`/warteliste/bestaetigen?t=${'A'.repeat(43)}`);
  await expect(page.getByRole('heading', { name: 'Fast geschafft.' })).toBeVisible();
  expect(confirmations).toBe(0);
  await page.getByRole('button', { name: /Ja, ich will auf die Warteliste/ }).click();
  await expect(page.getByRole('heading', { name: 'Du bist auf der Warteliste.' })).toBeVisible();
  expect(confirmations).toBe(1);
});

test('a used or broken confirmation link explains what to do', async ({ page }) => {
  for (const path of ['/warteliste/bestaetigen', '/warteliste/bestaetigen?fehler=1']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: 'Dieser Link gilt nicht mehr.' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Ja, ich will/ })).toHaveCount(0);
  }
  await page.goto('/warteliste/bestaetigen?fehler=2');
  await expect(page.getByRole('heading', { name: 'Das hat gerade nicht geklappt.' })).toBeVisible();
});

test('automated accessibility checks pass on landing and legal routes', async ({ page }) => {
  const { default: AxeBuilder } = await import('@axe-core/playwright');
  // Audit settled visual states; motion behavior is exercised separately.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const path of ['/', '/impressum', '/datenschutz', '/kontakt']) {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(results.violations.map(({ id, nodes }) => ({ id, targets: nodes.map((node) => node.target) })), path).toEqual([]);
  }
});


test('every feature state passes mobile accessibility checks', async ({ page }) => {
  const { default: AxeBuilder } = await import('@axe-core/playwright');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#entdecken');
  for (const tab of await page.getByRole('tab').all()) {
    await tab.click();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(results.violations.map(({ id, nodes }) => ({ id, targets: nodes.map((node) => node.target) }))).toEqual([]);
  }
});
