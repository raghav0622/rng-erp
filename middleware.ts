import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { serverConfig } from './lib/firebase-auth-edge';

const PUBLIC_PATHS = [
  '/signin',
  '/owner-bootstrap',
  '/signup-with-invite',
  '/forgot-password',
  '/reset-password',
];
const AUTHENTICATED_PATHS = ['/dashboard', '/profile'];

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  // Get the session cookie
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(serverConfig.cookieName);
  const hasValidSession = Boolean(sessionCookie?.value);

  // Handle root path - redirect based on auth status
  if (pathname === '/') {
    url.pathname = hasValidSession ? '/dashboard' : '/signin';
    return NextResponse.redirect(url);
  }

  // If trying to access authenticated paths without a session, redirect to signin
  if (!hasValidSession && AUTHENTICATED_PATHS.some((path) => pathname.startsWith(path))) {
    url.pathname = '/signin';
    return NextResponse.redirect(url);
  }

  // If trying to access public paths with a valid session, redirect to dashboard
  if (hasValidSession && PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|api/login|api/logout|favicon.ico|.*\\..*).*)'],
};
