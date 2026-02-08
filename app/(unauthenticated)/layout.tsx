'use client';

import { useIsOwnerBootstrapped } from '@/rng-platform';
import { UnauthenticatedLayout } from '@/rng-ui/layouts';
import { RNGLoadingOverlay } from '@/rng-ui/ux';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: isBootstrapped, isLoading } = useIsOwnerBootstrapped();

  // Redirect to onboarding if not bootstrapped
  useEffect(() => {
    if (!isLoading && !isBootstrapped && !pathname.includes('/onboarding')) {
      router.push('/onboarding');
    }
  }, [isBootstrapped, isLoading, pathname, router]);

  // Prevent flash by showing loading state during bootstrap check
  if (isLoading) {
    return <RNGLoadingOverlay message="Loading..." />;
  }

  // Prevent flash: don't render non-onboarding pages when redirect is needed
  if (!isBootstrapped && !pathname.includes('/onboarding')) {
    return <RNGLoadingOverlay message="Redirecting to setup..." />;
  }

  return <UnauthenticatedLayout>{children}</UnauthenticatedLayout>;
}
