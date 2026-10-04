const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL;
export const siteUrl = configuredUrl && /^https?:\/\//.test(configuredUrl)
  ? configuredUrl.replace(/\/$/, "") : "http://localhost:3001";
export const contactEmail = process.env.PISTL_CONTACT_EMAIL || "";
export const operatorName = process.env.PISTL_OPERATOR_NAME || "";
export const operatorAddress = process.env.PISTL_OPERATOR_ADDRESS || "";
export const launchReady = process.env.PISTL_LAUNCH_READY === "true";
