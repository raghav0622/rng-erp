'use client';

import { useIsOwnerBootstrapped } from '@/rng-platform';
import { UnauthenticatedLayout } from '@/rng-ui/layouts';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: isBootstrapped, isLoading } = useIsOwnerBootstrapped();

  useEffect(() => {
    if (!isLoading && !isBootstrapped && !pathname.includes('/onboarding')) {
      router.push('/onboarding');
    }
  }, [isBootstrapped, isLoading, pathname, router]);

  return <UnauthenticatedLayout>{children}</UnauthenticatedLayout>;
}
