// auth.guard.ts — verifies the short-lived Bearer JWT the web mints (ADR-033).
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { jwtVerify } from 'jose';

function secret(): Uint8Array {
  return new TextEncoder().encode(process.env.API_JWT_SECRET ?? 'change-me-dev-only');
}

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const header: string | undefined = req.header('authorization');
    const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;
    if (!token) throw new UnauthorizedException('Missing bearer token');
    try {
      const { payload } = await jwtVerify(token, secret(), {
        issuer: 'spendlio-web',
        audience: 'spendlio-api',
      });
      if (!payload.sub) throw new Error('missing sub');
      req.user = { id: payload.sub };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
