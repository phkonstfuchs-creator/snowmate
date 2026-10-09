import { contactEmail, operatorAddress, operatorName } from './site.js';

const escape = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/* The double opt-in email. It is the only email the waitlist sends before
   the address is confirmed, so it carries no advertising. */
export function confirmationEmail(link, { earlyAccess = false } = {}) {
  const subject = 'Willkommen bei Pistl – bestätige deine Anmeldung';
  const preference = earlyAccess
    ? 'Mit deiner Bestätigung erhältst du Informationen zum Pistl-Start und mögliche Einladungen zum Early Access.'
    : 'Mit deiner Bestätigung erhältst du Informationen zum Pistl-Start. Early Access hast du nicht ausgewählt.';
  const text = [
    'Servus!',
    '',
    'Schön, dass du bei Pistl dabei sein willst. Ein Klick noch, dann bist du auf der Warteliste:',
    preference,
    '',
    link,
    '',
    'Der Link gilt sieben Tage.',
    '',
    'Du hast dich nicht angemeldet? Dann ignoriere diese E-Mail einfach. Ohne Bestätigung löschen wir die Adresse nach sieben Tagen.',
    '',
    '–',
    `Pistl · ${operatorName} · ${operatorAddress} · ${contactEmail}`,
  ].join('\n');
  const html = `<!doctype html>
<html lang="de"><body style="margin:0;padding:24px;background:#f6f7f4;font-family:Helvetica,Arial,sans-serif;color:#1d2321">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;padding:32px">
<tr><td>
<p style="margin:0 0 8px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#5d6b66">Pistl Warteliste</p>
<h1 style="margin:0 0 16px;font-size:26px;line-height:1.2">Willkommen bei Pistl!</h1>
<p style="margin:0 0 24px;font-size:16px;line-height:1.5">Schön, dass du dabei sein willst. Ein Klick noch, dann bist du auf der Warteliste.</p>
<p style="margin:0 0 24px;font-size:16px;line-height:1.5">${escape(preference)}</p>
<p style="margin:0 0 24px"><a href="${escape(link)}" style="display:inline-block;background:#1d2321;color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 22px;border-radius:999px">Ja, ich will auf die Warteliste</a></p>
<p style="margin:0 0 8px;font-size:14px;line-height:1.5;color:#5d6b66">Der Link gilt sieben Tage. Funktioniert der Button nicht, kopiere diese Adresse in deinen Browser:<br><span style="word-break:break-all">${escape(link)}</span></p>
<p style="margin:16px 0 0;font-size:14px;line-height:1.5;color:#5d6b66">Du hast dich nicht angemeldet? Dann ignoriere diese E-Mail einfach. Ohne Bestätigung löschen wir die Adresse nach sieben Tagen.</p>
</td></tr></table>
<p style="max-width:520px;margin:16px auto 0;font-size:12px;line-height:1.5;color:#5d6b66">Pistl · ${escape(operatorName)} · ${escape(operatorAddress)} · ${escape(contactEmail)}</p>
</td></tr></table>
</body></html>`;
  return { subject, text, html };
}
