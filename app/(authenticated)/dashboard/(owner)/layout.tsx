'use client';

import { useAuthSession } from '@/rng-platform';
import { useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';

interface AuthenticatedLayoutProps {
  children: ReactNode;
}
export default function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const session = useAuthSession();
  const router = useRouter();

  useEffect(() => {
    if (session.user?.role !== 'owner') {
      router.push('/dashboard');
    }
  }, [session.user, router]);

  // Don't render if not authenticated to prevent flashing empty state
  if (session.user?.role !== 'owner') {
    return null;
  }

  return <>{children}</>;
}
