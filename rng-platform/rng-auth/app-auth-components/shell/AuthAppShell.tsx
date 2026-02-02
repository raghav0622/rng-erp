'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useAuthSession } from '../../app-auth-hooks/useAuthSession';
import type { AppAuthError } from '../../app-auth-service/app-auth.errors';
import { AuthErrorBoundary } from '../boundaries/AuthErrorBoundary';

export interface AuthAppShellProps {
  loadingRoute?: string;
  unauthenticatedRoute?: string;
  authenticatedRoute?: string;
  children: ReactNode;
  fatalError?: (error: AppAuthError) => ReactNode;
}

/**
 * Core app shell. Single-tenant, mounted once at app root.
 * Uses prefix matching for authenticated route (allows nested paths).
 * ErrorBoundary fallback is fully conditional (never returns undefined!).
 */
export function AuthAppShell({
  loadingRoute = '/auth/loading',
  unauthenticatedRoute = '/auth/signin',
  authenticatedRoute = '/dashboard',
  children,
  fatalError,
}: AuthAppShellProps) {
  const boundary = (
    <AuthAppShellContent
      loadingRoute={loadingRoute}
      unauthenticatedRoute={unauthenticatedRoute}
      authenticatedRoute={authenticatedRoute}
    >
      {children}
    </AuthAppShellContent>
  );

  if (fatalError) {
    return (
      <AuthErrorBoundary fallback={(error) => <>{fatalError(error)}</>}>
        {boundary}
      </AuthErrorBoundary>
    );
  }

  return <AuthErrorBoundary>{boundary}</AuthErrorBoundary>;
}

/**
 * Internal content component that uses session hook and navigation
 */
function AuthAppShellContent({
  loadingRoute,
  unauthenticatedRoute,
  authenticatedRoute,
  children,
}: {
  loadingRoute: string;
  unauthenticatedRoute: string;
  authenticatedRoute: string;
  children: ReactNode;
}) {
  const session = useAuthSession();
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const currentPath = window.location.pathname;
    if (session.lastAuthError && session.state === 'unauthenticated') {
      if (currentPath !== unauthenticatedRoute) router.replace(unauthenticatedRoute);
      return;
    }
    switch (session.state) {
      case 'unknown':
      case 'authenticating':
        if (currentPath !== loadingRoute) router.replace(loadingRoute);
        break;
      case 'unauthenticated':
        if (currentPath !== unauthenticatedRoute) router.replace(unauthenticatedRoute);
        break;
      case 'authenticated':
        if (!session.user)
          throw new Error('AuthSession invariant violation: authenticated but user is null');
        if (session.emailVerified === false && currentPath !== '/auth/verify-email') {
          router.replace('/auth/verify-email');
          break;
        }
        if (!currentPath.startsWith(authenticatedRoute) && currentPath !== '/auth/verify-email') {
          router.replace(authenticatedRoute);
        }
        break;
      default:
        const _exhaustive: never = session.state;
        throw new Error(`Unhandled auth state: ${_exhaustive}`);
    }
  }, [
    session.state,
    session.user,
    session.emailVerified,
    session.lastAuthError,
    router,
    loadingRoute,
    unauthenticatedRoute,
    authenticatedRoute,
  ]);

  return <>{children}</>;
}
