'use client';
import { globalLogger } from '@/lib';
import { useSignOut } from '@/rng-platform/rng-auth';
import { RNGLoadingOverlay } from '@/rng-ui/ux';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
export default function SignOutPage() {
  const { mutateAsync: signout } = useSignOut();
  const router = useRouter();

  useEffect(() => {
    const performSignOut = async () => {
      try {
        await signout();
        // Wait a brief moment for the cookie to be cleared
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        globalLogger.error('Error during sign out:', error as any);
      } finally {
        router.push('/signin');
      }
    };

    performSignOut();
  }, [signout, router]);

  return <RNGLoadingOverlay message="Signing You Out" />;
}
