const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL;
export const siteUrl = configuredUrl && /^https?:\/\//.test(configuredUrl)
  ? configuredUrl.replace(/\/$/, "") : "http://localhost:3001";

/* The operator's own details, given by the operator on 2026-10-05: a sole
   proprietorship registered in Kleinblittersdorf, Germany (§ 5 DDG).
   Environment variables may override them; nothing here is a placeholder. */
export const operatorName = process.env.PISTL_OPERATOR_NAME || "Philipp Fuchs";
export const operatorBusiness = process.env.PISTL_OPERATOR_BUSINESS || "Einzelunternehmen, digitale Dienstleistungen";
export const operatorAddress = process.env.PISTL_OPERATOR_ADDRESS || "In den Kiefern 3, 66271 Kleinblittersdorf, Deutschland";
export const contactEmail = process.env.PISTL_CONTACT_EMAIL || "support@pistl.app";
export const reportEmail = "meldung@pistl.app";
export const privacyEmail = "datenschutz@pistl.app";
export const contactPhone = "+49 1511 6477 919";

/* Data protection authority for the operator's seat (Saarland). */
export const supervisoryAuthority = {
  name: "Unabhängiges Datenschutzzentrum Saarland",
  address: "Fritz-Dobisch-Straße 12, 66111 Saarbrücken",
  url: "https://www.datenschutz.saarland.de",
};

export const launchReady = process.env.PISTL_LAUNCH_READY === "true";
