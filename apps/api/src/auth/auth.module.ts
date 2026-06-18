import { Logger, Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { OtpService } from './otp.service';
import { EMAIL_SENDER } from './email/email-sender';
import { ConsoleEmailSender } from './email/console-email-sender';
import { SmtpEmailSender } from './email/smtp-email-sender';

// DbModule is @Global, so OtpService can inject DB without importing it here.
@Module({
  controllers: [AuthController],
  providers: [
    OtpService,
    {
      // SMTP_HOST present -> real email; else the dev console transport.
      // (Mirrors @spendlio/ai's offline-default / live-gated-on-env pattern.)
      provide: EMAIL_SENDER,
      useFactory: () => {
        const log = new Logger('EmailSender');
        if (process.env.SMTP_HOST) {
          log.log(`Using SMTP transport (${process.env.SMTP_HOST})`);
          return new SmtpEmailSender();
        }
        log.log('Using console transport (set SMTP_HOST to send real email)');
        return new ConsoleEmailSender();
      },
    },
  ],
})
export class AuthModule {}
