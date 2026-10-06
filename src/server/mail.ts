import nodemailer from "nodemailer";
import { config } from "@/server/config";

export async function sendMail(to: string, subject: string, text: string) {
  const env = config();

  const transport = nodemailer.createTransport({
    host: process.env.SMTP_SERVICE_HOST || env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
  });

  await transport.sendMail({ from: env.SMTP_FROM, to, subject, text });
}
