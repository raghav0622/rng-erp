import { getTokens } from 'next-firebase-auth-edge';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { serverConfig } from './lib/firebase-auth-edge';

const PUBLIC_PATHS = [
  '/signin',
  '/onboarding',
  '/signup-with-invite',
  '/forgot-password',
  '/reset-password',
];
const AUTHENTICATED_PATHS = ['/dashboard', '/profile', '/signout'];

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  // Get the session cookie
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(serverConfig.cookieName);
  let hasValidSession = false;

  // If we have a session cookie, verify it's still valid
  if (sessionCookie?.value) {
    try {
      // Verify the session cookie token using next-firebase-auth-edge (Edge Runtime compatible)
      const tokens = await getTokens(cookieStore, {
        serviceAccount: serverConfig.serviceAccount,
        apiKey: serverConfig.apiKey,
        cookieName: serverConfig.cookieName,
        cookieSignatureKeys: serverConfig.cookieSignatureKeys,
      });

      // If tokens are valid and not expired, user has valid session
      hasValidSession = Boolean(tokens);
    } catch (error) {
      // Token verification failed (expired, revoked, or invalid)
      console.error('Session validation failed:', error);
      hasValidSession = false;

      // Clear the invalid cookie and redirect to signin if on protected path
      if (AUTHENTICATED_PATHS.some((path) => pathname.startsWith(path))) {
        const response = NextResponse.redirect(new URL('/signin', request.url));
        response.cookies.delete(serverConfig.cookieName);
        return response;
      }
    }
  }

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
  // This handles the server-side redirect for authenticated users
  if (hasValidSession && PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|api/login|api/logout|favicon.ico|.*\\..*).*)'],
};
