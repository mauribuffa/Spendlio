import { describe, it, expect } from 'vitest';
import { OtpRequestInput, OtpVerifyInput, OtpRequestResult, AuthUser } from './auth';

describe('auth contracts', () => {
  it('OtpRequestInput requires a valid email', () => {
    expect(OtpRequestInput.safeParse({ email: 'a@b.com' }).success).toBe(true);
    expect(OtpRequestInput.safeParse({ email: 'nope' }).success).toBe(false);
  });

  it('OtpVerifyInput requires email + a 6-digit code', () => {
    expect(OtpVerifyInput.safeParse({ email: 'a@b.com', code: '123456' }).success).toBe(true);
    expect(OtpVerifyInput.safeParse({ email: 'a@b.com', code: '12345' }).success).toBe(false);
    expect(OtpVerifyInput.safeParse({ email: 'a@b.com', code: 'abcdef' }).success).toBe(false);
  });

  it('OtpRequestResult allows an optional dev code', () => {
    expect(OtpRequestResult.safeParse({ ok: true }).success).toBe(true);
    expect(OtpRequestResult.safeParse({ ok: true, devCode: '123456' }).success).toBe(true);
    expect(OtpRequestResult.safeParse({ ok: false }).success).toBe(false);
  });

  it('AuthUser requires id (uuid) + email + name', () => {
    const ok = AuthUser.safeParse({
      id: '00000000-0000-0000-0000-000000000001',
      email: 'demo@spendlio.app',
      name: 'Demo',
    });
    expect(ok.success).toBe(true);
    expect(AuthUser.safeParse({ id: 'x', email: 'demo@spendlio.app', name: 'Demo' }).success).toBe(false);
  });
});
