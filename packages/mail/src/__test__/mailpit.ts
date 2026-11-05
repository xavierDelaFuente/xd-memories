import { GenericContainer, type StartedTestContainer, Wait } from 'testcontainers';

// Mailpit: an SMTP server that keeps every message it receives and lists them over HTTP.
// The same image compose.yaml runs for E2E.
export type TestMailbox = {
  smtpUrl: string;
  received: () => Promise<ReceivedMail[]>;
  stop: () => Promise<void>;
};

export type ReceivedMail = { from: string; to: string[]; subject: string; text: string };

type Summary = { ID: string };
type Message = {
  From: { Address: string };
  To: { Address: string }[];
  Subject: string;
  Text: string;
};

export async function startMailbox(): Promise<TestMailbox> {
  const container: StartedTestContainer = await new GenericContainer('axllent/mailpit:v1.31')
    .withExposedPorts(1025, 8025)
    .withWaitStrategy(Wait.forHttp('/livez', 8025))
    .start();
  const api = `http://${container.getHost()}:${container.getMappedPort(8025)}/api/v1`;
  const get = async <T>(path: string) => (await (await fetch(`${api}${path}`)).json()) as T;

  return {
    smtpUrl: `smtp://${container.getHost()}:${container.getMappedPort(1025)}`,
    received: async () => {
      const { messages } = await get<{ messages: Summary[] }>('/messages');
      const full = await Promise.all(messages.map(({ ID }) => get<Message>(`/message/${ID}`)));
      return full.map((message) => ({
        from: message.From.Address,
        to: message.To.map(({ Address }) => Address),
        subject: message.Subject,
        text: message.Text.trim(),
      }));
    },
    stop: async () => {
      await container.stop();
    },
  };
}
