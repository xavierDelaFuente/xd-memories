import { expect } from '@playwright/test';

// Mailpit from compose.yaml catches what the app sends (playwright.config.ts points SMTP at it).
const MAILPIT = 'http://localhost:8025/api/v1';

type Found = { messages: { ID: string }[] };

// The link in the latest mail to this address, waiting a moment for it to arrive.
export async function linkMailedTo(email: string): Promise<string> {
  let latest: string | undefined;
  await expect
    .poll(async () => {
      const query = encodeURIComponent(`to:"${email}"`);
      const found = (await (await fetch(`${MAILPIT}/search?query=${query}`)).json()) as Found;
      latest = found.messages[0]?.ID;
      return latest;
    })
    .toBeDefined();
  const { Text } = (await (await fetch(`${MAILPIT}/message/${latest}`)).json()) as {
    Text: string;
  };
  const link = Text.match(/https?:\/\/\S+/)?.[0];
  if (link === undefined) throw new Error(`no link in the mail to ${email}`);
  return link;
}

// How many mails this address has received.
export async function mailCountTo(email: string): Promise<number> {
  const query = encodeURIComponent(`to:"${email}"`);
  const found = (await (await fetch(`${MAILPIT}/search?query=${query}`)).json()) as Found;
  return found.messages.length;
}
