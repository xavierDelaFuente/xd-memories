import { createTransport } from 'nodemailer';
import type { Mailer } from './mailer';

export type SmtpSettings = {
  // smtps://user:app-password@smtp.gmail.com:465 in production; Mailpit locally and in E2E.
  url: string;
  // Gmail sends only from its own account address.
  from: string;
};

export function smtpMailer({ url, from }: SmtpSettings): Mailer {
  const transport = createTransport(url);
  return {
    send: async ({ to, subject, text }) => {
      await transport.sendMail({ from, to, subject, text });
    },
  };
}
