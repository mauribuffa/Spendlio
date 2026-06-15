// auth.guard.ts — replace the stub body with JWT verification in Phase 5 (ADR-009)
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    // DEV ONLY: trust a header so you can build the API before auth exists.
    req.user = { id: req.header('x-user-id') ?? '00000000-0000-0000-0000-000000000001' };
    return true;
  }
}
