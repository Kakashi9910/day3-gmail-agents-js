import "dotenv/config";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

const { GMAIL_ADDRESS, GMAIL_APP_PASSWORD } = process.env;

async function withInbox(fn) {
  if (!GMAIL_ADDRESS || !GMAIL_APP_PASSWORD) {
    throw new Error("Set GMAIL_ADDRESS and GMAIL_APP_PASSWORD in .env");
  }

  const client = new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: { user: GMAIL_ADDRESS, pass: GMAIL_APP_PASSWORD },
    logger: false,
  });

  await client.connect();
  const lock = await client.getMailboxLock("INBOX");
  try {
    return await fn(client);
  } finally {
    lock.release();
    await client.logout();
  }
}

// Turn a raw RFC822 message into { sender, subject, date, body }
async function parse(source) {
  const msg = await simpleParser(source);
  return {
    sender: msg.from?.text ?? "",
    subject: msg.subject ?? "",
    date: msg.date ? msg.date.toString() : "",
    body: msg.text ?? "",
  };
}

export async function countEmails() {
  return withInbox((client) => client.mailbox.exists);
}

export async function getLatestEmail() {
  return withInbox(async (client) => {
    const total = client.mailbox.exists;
    if (!total) throw new Error("Inbox is empty");
    const message = await client.fetchOne(String(total), { source: true });
    return parse(message.source);
  });
}

// Search by subject (same behaviour as the Python demos), newest `limit` matches
export async function searchBySubject(query, limit = 5) {
  return withInbox(async (client) => {
    const uids = await client.search({ subject: query }, { uid: true });
    if (!uids || uids.length === 0) return [];

    const results = [];
    for (const uid of uids.slice(-limit)) {
      const message = await client.fetchOne(
        String(uid),
        { source: true },
        { uid: true }
      );
      results.push(await parse(message.source));
    }
    return results;
  });
}
