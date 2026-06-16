import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { OtpService } from './otp.service';
import { EMAIL_SENDER } from './email/email-sender';
import { ConsoleEmailSender } from './email/console-email-sender';

// DbModule is @Global, so OtpService can inject DB without importing it here.
@Module({
  controllers: [AuthController],
  providers: [OtpService, { provide: EMAIL_SENDER, useClass: ConsoleEmailSender }],
})
export class AuthModule {}
