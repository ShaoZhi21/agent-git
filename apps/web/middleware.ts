import { NextResponse, type NextRequest } from 'next/server';

// Route-level auth gate for the authenticated area.
// Placeholder — the real session check lands with F1 (identity boundary).
export function middleware(_request: NextRequest) {
  // TODO(F1): if no valid session, redirect to /login.
  return NextResponse.next();
}

// Only run on the protected routes (route groups don't affect these URLs).
export const config = {
  matcher: ['/dashboard/:path*', '/agents/:path*'],
};
