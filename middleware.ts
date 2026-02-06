import { adminAuth } from '@/lib/firebase-admin';
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
  let hasValidSession = Boolean(sessionCookie?.value);

  // If we have a session cookie, verify it's still valid and user is not disabled
  if (hasValidSession && sessionCookie?.value) {
    try {
      // Verify the session cookie token
      const decodedToken = await adminAuth.verifySessionCookie(sessionCookie.value, true);

      // Check if user is disabled in Firebase Auth
      const userRecord = await adminAuth.getUser(decodedToken.uid);

      if (userRecord.disabled) {
        // User is disabled - force logout
        hasValidSession = false;

        // Clear the session cookie
        const response = NextResponse.redirect(new URL('/signin', request.url));
        response.cookies.delete(serverConfig.cookieName);

        // Only redirect if not already on a public path
        if (!PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
          return response;
        }
      }
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
  if (hasValidSession && PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|api/login|api/logout|favicon.ico|.*\\..*).*)'],
};
