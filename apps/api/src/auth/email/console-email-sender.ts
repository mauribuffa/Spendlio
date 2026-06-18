import { Injectable, Logger } from '@nestjs/common';
import type { EmailSender } from './email-sender';

/**
 * Dev transport: log the code to the API console. No external infra. The prod
 * vendor (Resend/SMTP/SES) is a later ADR (decisions.md open question #2).
 */
@Injectable()
export class ConsoleEmailSender implements EmailSender {
  // No real delivery -> the code may be echoed back for local convenience.
  readonly exposesCode = true;
  private readonly log = new Logger('EmailSender');
  async sendOtpCode(to: string, code: string): Promise<void> {
    this.log.log(`OTP for ${to}: ${code}`);
  }
}
