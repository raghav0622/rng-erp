'use client';

// import { useAuthState } from '@/rng-firebase/auth/hooks';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export const excludedPaths = [
  '/(auth)',
  '/(auth)/login',
  '/(auth)/signup',
  '/(auth)/forgot-password',
  '/(auth)/action-handler',
];

export function RequireAuth({ children }: { children: React.ReactNode }) {
  // const { user, isLoading } = useAuthState();
  // Temporary stub for build: always unauthenticated
  const user: null = null;
  const isLoading: false = false;
  const router = useRouter();
  const pathname = usePathname
    ? usePathname()
    : typeof window !== 'undefined'
      ? window.location.pathname
      : '';
  const isExcluded = excludedPaths.some((path) => pathname.startsWith(path));

  useEffect(() => {
    if (!isExcluded && user === null) {
      router.replace('/login');
    }
  }, [user, router, isExcluded]);

  if (!isExcluded && user === undefined) {
    // Let Suspense handle loading state
    // throw new Promise(() => {});
  }
  if (isLoading) {
    return <>loading..</>;
  }
  if (!isExcluded && user === null) return null;
  if (!isLoading && user) return <>{children}</>;

  return null;
}
