const mailbox = process.env.MAILPIT_URL || "http://127.0.0.1:8025";

export async function emailLink(email: string, contains: string) {
  for (let attempt = 0; attempt < 30; attempt++) {
    const list = await fetch(mailbox + "/api/v1/messages").then((r) =>
      r.json(),
    );

    const message = list.messages.find(
      (m: { To: { Address: string }[]; Subject: string }) =>
        m.To.some((t) => t.Address === email) && m.Subject.includes(contains),
    );

    if (message) {
      const detail = await fetch(
        mailbox + "/api/v1/message/" + message.ID,
      ).then((r) => r.json());

      const match = String(detail.Text).match(/https?:\/\/[^\s]+/);

      if (match) return match[0];
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error("Expected test email was not delivered.");
}
