const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL;
export const siteUrl = configuredUrl && /^https?:\/\//.test(configuredUrl)
  ? configuredUrl.replace(/\/$/, "") : "http://localhost:3001";
// Public business details supplied by the operator from philipp-k-fuchs.de/impressum/.
export const operatorName = "Philipp Fuchs";
export const operatorStreet = "In den Kiefern 3";
export const operatorPostalCity = "66271 Kleinblittersdorf";
export const operatorCountry = "Deutschland";
export const contactEmail = "vfxphilipp@outlook.com";
export const contactPhone = "+49 1511 6477 919";
export const launchReady = process.env.PISTL_LAUNCH_READY === "true";
