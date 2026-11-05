// The port the app sends mail through. Gmail SMTP behind it today (smtp.ts); a provider such as
// Resend, with its own domain, can replace it without touching auth.
export type Mail = { to: string; subject: string; text: string };

export type Mailer = { send: (mail: Mail) => Promise<void> };
