import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { OtpRequestInput, OtpVerifyInput } from '@spendlio/contracts';
import { ZodPipe } from '../common/zod.pipe';
import { OtpService } from './otp.service';

// PUBLIC: these establish identity before any token exists, so no @UseGuards.
@Controller('auth/otp')
export class AuthController {
  constructor(private otp: OtpService) {}

  @Post('request')
  @HttpCode(200)
  async request(@Body(new ZodPipe(OtpRequestInput)) dto: OtpRequestInput) {
    const { devCode } = await this.otp.request(dto.email);
    // Always 200, no enumeration. devCode only present in non-prod.
    return { ok: true as const, ...(devCode ? { devCode } : {}) };
  }

  @Post('verify')
  @HttpCode(200)
  verify(@Body(new ZodPipe(OtpVerifyInput)) dto: OtpVerifyInput) {
    return this.otp.verify(dto.email, dto.code); // throws 401 on bad/expired code
  }
}
