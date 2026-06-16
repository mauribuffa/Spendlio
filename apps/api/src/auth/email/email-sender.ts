/** DI token for the email transport (target interfaces, not vendors — golden rule #6). */
export const EMAIL_SENDER = Symbol('EMAIL_SENDER');

export interface EmailSender {
  /** Deliver a one-time code to `to`. Implementations must not throw on success. */
  sendOtpCode(to: string, code: string): Promise<void>;
}
