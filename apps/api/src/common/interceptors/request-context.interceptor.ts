import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import type { Observable } from 'rxjs';

// Per-request tenant/auth context. PLACEHOLDER.
// TODO(F1): resolve the session -> { userId, orgId }, open a DB transaction, and
// SET app.current_org_id so Postgres RLS scopes every query to the caller's org.
// See docs/conventions/data-model.md (§1) and docs/conventions/auth.md.
@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle();
  }
}
