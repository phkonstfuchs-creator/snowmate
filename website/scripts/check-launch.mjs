import nextEnv from '@next/env';
const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const required = ['NEXT_PUBLIC_SITE_URL', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missing = required.filter(key => !process.env[key]?.trim());
if (missing.length) {
  console.error(`Noch einzurichten: ${missing.join(', ')}. Werte werden nicht ausgegeben.`);
  process.exitCode = 1;
}
const origin = process.env.NEXT_PUBLIC_SITE_URL || '';
if (!origin.startsWith('https://') || origin.includes('.example') || origin.includes('localhost')) {
  console.error('Eine echte öffentliche HTTPS-Domain ist erforderlich.');
  process.exitCode = 1;
}
if (process.env.PISTL_LAUNCH_READY !== 'true') {
  console.error('Die Website ist als Entwurf markiert und für Suchmaschinen gesperrt.');
  process.exitCode = 1;
}
if (!process.exitCode) console.log('Konfiguration vollständig. Supabase-Migration, tatsächliche Hosting-Regionen, Vertragsunterlagen und Löschablauf vor Veröffentlichung prüfen. Vor dem ersten E-Mail-Versand Adressbestätigung (Double-Opt-in) einrichten.');
