import { Injectable, Logger } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';
import type { EmailSender } from './email-sender';

const TIMEOUT_MS = 10_000; // bound every phase so request() can't hang on a dead host

/**
 * Real transport: send the OTP over SMTP via nodemailer. Vendor-neutral — point
 * SMTP_* at Mailpit locally or SES/Mailgun/Resend-SMTP in prod, no code change
 * (golden rule #6). Selected by AuthModule's factory when SMTP_HOST is present.
 */
@Injectable()
export class SmtpEmailSender implements EmailSender {
  // Real delivery -> the code must never be echoed in the /request response.
  readonly exposesCode = false;
  private readonly log = new Logger('EmailSender');
  private readonly from = process.env.EMAIL_FROM ?? 'Spendlio <no-reply@spendlio.app>';
  private readonly transport: Transporter;

  constructor() {
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    // `|| 587` (not `??`) so an empty SMTP_PORT="" falls back instead of Number("")===0.
    const port = Number(process.env.SMTP_PORT) || 587;
    // Honor SMTP_SECURE when set; otherwise derive from the port (465 = implicit TLS),
    // so SMTP_PORT=465 doesn't silently connect in plaintext and stall to a timeout.
    const secureEnv = process.env.SMTP_SECURE;
    const secure = secureEnv ? secureEnv === 'true' : port === 465;
    this.transport = createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure,
      // Mailpit (and many dev sinks) accept no auth; only send creds when both are set.
      ...(user && pass ? { auth: { user, pass } } : {}),
      connectionTimeout: TIMEOUT_MS,
      greetingTimeout: TIMEOUT_MS,
      socketTimeout: TIMEOUT_MS,
    });
  }

  async sendOtpCode(to: string, code: string): Promise<void> {
    await this.transport.sendMail({
      from: this.from,
      to,
      subject: 'Your Spendlio code',
      text:
        `Your Spendlio sign-in code is ${code}. It expires in 10 minutes.\n\n` +
        `If you didn't request this, you can safely ignore this email.`,
      html: otpHtml(code),
    });
    // Never log the code from a real transport — the inbox is the only place it lives.
    this.log.log(`OTP emailed to ${to} via SMTP`);
  }
}

function otpHtml(code: string): string {
  return [
    '<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:420px;margin:0 auto;padding:24px;color:#1a1a1a">',
    '<p style="font-size:16px;margin:0 0 16px">Your Spendlio sign-in code is:</p>',
    `<p style="font-size:32px;font-weight:700;letter-spacing:6px;margin:0 0 16px">${code}</p>`,
    '<p style="font-size:14px;color:#666;margin:0 0 4px">It expires in 10 minutes.</p>',
    "<p style=\"font-size:13px;color:#999;margin:16px 0 0\">If you didn't request this, you can safely ignore this email.</p>",
    '</div>',
  ].join('');
}
