import type { APIRequestContext } from "@playwright/test";

interface MailpitSearchResult {
  messages?: Array<{ ID?: string }>;
}

/** Read only from the local Mailpit instance provisioned by CI. */
export async function waitForConfirmationCode(request: APIRequestContext, mailpitUrl: string, email: string): Promise<string> {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    const searchResponse = await request.get(`${mailpitUrl}/api/v1/search`, {
      params: { query: `to:"${email}"`, limit: 1 },
    });
    if (searchResponse.ok()) {
      const result = (await searchResponse.json()) as MailpitSearchResult;
      const messageId = result.messages?.[0]?.ID;
      if (messageId) {
        const emailResponse = await request.get(`${mailpitUrl}/view/${encodeURIComponent(messageId)}.html`);
        const code = emailResponse.ok() ? />\s*(\d{6,10})\s*</u.exec(await emailResponse.text())?.[1] : undefined;
        if (code) return code;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`No confirmation email arrived for ${email}.`);
}
