import { afterAll, beforeAll, expect, it } from 'vitest';
import { smtpMailer } from '../smtp';
import { startMailbox, type TestMailbox } from './mailpit';

let mailbox: TestMailbox;

beforeAll(async () => {
  mailbox = await startMailbox();
});

afterAll(async () => {
  await mailbox?.stop();
});

it('delivers the mail, from the configured address', async () => {
  const mailer = smtpMailer({ url: mailbox.smtpUrl, from: 'xd-memories <app@example.com>' });
  await mailer.send({ to: 'ada@example.com', subject: 'Hello', text: 'Hi Ada' });

  const received = await mailbox.received();

  expect(received).toEqual([
    { from: 'app@example.com', to: ['ada@example.com'], subject: 'Hello', text: 'Hi Ada' },
  ]);
});

// Better Auth then answers with an error, instead of claiming a mail went out.
it('fails when the server cannot be reached', async () => {
  const mailer = smtpMailer({ url: 'smtp://127.0.0.1:1', from: 'app@example.com' });

  const sent = mailer.send({ to: 'ada@example.com', subject: 'Hello', text: 'Hi' });

  await expect(sent).rejects.toThrow();
});
