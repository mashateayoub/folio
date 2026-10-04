# Email delivery and local mailbox

`sendMail()` builds a Nodemailer SMTP transport for each send. It uses `SMTP_SERVICE_HOST` when set, otherwise validated `SMTP_HOST`, the configured positive port, sender, optional username/password, and TLS only when `SMTP_SECURE` is literal `true`.

Local Compose sends through Mailpit at container host `mailpit`, port 1025. Host development sends to `127.0.0.1:1025`. Mail UI is http://localhost:8025. Mailpit captures messages and links; it does not deliver to external recipients.

Authentication sends verification and password-reset emails through library callbacks. Team invitations create their database record before delivery and send a plain-text acceptance link. A failed invitation send leaves a pending record and reports 502; fix transport and send a new invitation, which revokes the previous pending token.

All callback links depend on `APP_URL`. Incorrect origins/ports or proxy configuration can make valid messages lead to the wrong service. Verification links do not automatically sign in. Invitation acceptance requires the actual recipient's matching verified account.

For production, configure an authenticated externally delivering SMTP service and correct sender identity/transport settings. There is no shipped email queue, retry scheduler, bounce processor, deliverability dashboard, or provider-specific API adapter. A transport failure is reported through the relevant request path; do not assume asynchronous eventual delivery.

The Mailpit helper in tests reads captured messages to retrieve links. It is a local acceptance aid, not an application mail API. Email links and tokens are sensitive: avoid logging bodies or forwarding support screenshots with active links.

## Implementation references

- [src/lib/server/mail.ts](../../src/lib/server/mail.ts)
- [src/lib/server/auth.ts](../../src/lib/server/auth.ts)
- [src/lib/server/saas.ts](../../src/lib/server/saas.ts)
- [tests/mail-helper.ts](../../tests/mail-helper.ts)
