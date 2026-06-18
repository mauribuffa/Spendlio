/** DI token for the email transport (target interfaces, not vendors — golden rule #6). */
export const EMAIL_SENDER = Symbol('EMAIL_SENDER');

export interface EmailSender {
  /**
   * True only for transports that DON'T actually deliver email (the dev console
   * sender). Gates whether `/auth/otp/request` may echo the code back in its
   * response — a real transport must never leak the code, regardless of NODE_ENV.
   */
  readonly exposesCode: boolean;
  /** Deliver a one-time code to `to`. Implementations must not throw on success. */
  sendOtpCode(to: string, code: string): Promise<void>;
}
