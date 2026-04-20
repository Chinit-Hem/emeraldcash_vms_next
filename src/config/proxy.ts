import { getClientIp, getClientUserAgent, getSessionFromRequest, validateSession } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /dashboard routes
  if (pathname.startsWith('/dashboard')) {
    const ip = getClientIp(request.headers);
    const userAgent = getClientUserAgent(request.headers);
    const sessionCookie = request.cookies.get('session')?.value;

    if (!sessionCookie) {
      // Redirect to login if no session cookie
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const session = getSessionFromRequest(userAgent, ip, sessionCookie);
    if (!session || !validateSession(session)) {
      // Redirect to login if invalid session
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};
