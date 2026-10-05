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
  await expect(page.getByRole('heading', { name: 'Du stehst auf der Liste.' })).toBeVisible();
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
  await expect(page.getByRole('heading', { name: 'Du stehst auf der Liste.' })).toHaveCount(0);
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
  await expect(page.getByRole('heading', { name: 'Du stehst auf der Liste.' })).toHaveCount(0);
  await submit.click();
  await expect(page.getByRole('heading', { name: 'Du stehst auf der Liste.' })).toBeVisible();
  expect(attempts).toBe(2);
});

test('HTTP success with an unsuccessful response does not claim signup', async ({ page }) => {
  await page.route('**/api/waitlist', (route) => route.fulfill({ json: { ok: false, error: 'Anmeldung nicht möglich.' } }));
  await page.goto('/#waitlist');
  const form = await completeWaitlist(page);
  await form.getByRole('button', { name: 'Auf die Warteliste', exact: true }).click();
  await expect(form.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Du stehst auf der Liste.' })).toHaveCount(0);
});

test('feature list explains real ways to use Pistl without decorative tabs or icons', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Was du mit Pistl machst' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Skigebiet, Startzeit und Tempo festlegen.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Freie Plätze finden oder anbieten.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Finde deine Crew im Skigebiet.' })).toBeVisible();
  await expect(page.getByRole('tab')).toHaveCount(0);
  await expect(page.locator('.feature-art-wrap')).toHaveCount(0);
  await expect(page.locator('.feature-row .action-button')).toHaveCount(0);
});

test('rejected decorative sections are removed and reduced motion works', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.panorama-image--distant')).toBeVisible();
  await expect(page.locator('.mountain-foreground')).toBeVisible();
  expect(await page.locator('.panorama-image--distant').evaluate((image) => getComputedStyle(image).transform)).toBe('none');
  await expect(page.locator('.mountain-riders, .map-sample, .bergtag-steps, .crew-poster')).toHaveCount(0);
  await expect(page.locator('.footer-wordmark')).not.toContainText('✳');
  await expect(page.getByRole('heading', { name: 'Was du mit Pistl machst' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Pistl startet bald.' })).toBeVisible();
});

test('mobile navigation and feature list fit narrow screens', async ({ page }) => {
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.getByRole('button', { name: 'Menü öffnen', exact: true }).click();
    await page.getByRole('link', { name: 'Funktionen', exact: true }).filter({ visible: true }).first().click();
    await expect(page).toHaveURL(/\/#entdecken$/);
    await expect(page.getByRole('heading', { name: 'Was du mit Pistl machst' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const radii = await page.locator('.action-button, .hero-scroll, .menu-toggle').evaluateAll((elements) => elements.map((element) => getComputedStyle(element).borderRadius));
    expect(radii.every((radius) => radius === '999px')).toBe(true);
  }
});

test('feature copy fits on tablet screens', async ({ page }) => {
  await page.setViewportSize({ width: 761, height: 950 });
  await page.goto('/');
  const heading = page.getByRole('heading', { name: 'Was du mit Pistl machst' });
  expect(await heading.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
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
