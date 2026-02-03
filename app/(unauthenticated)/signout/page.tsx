'use client';

import { useSignOut } from '@/rng-platform/rng-auth';
import { AuthLoadingOverlay } from '@/rng-platform/rng-auth/app-auth-components';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Signout page - handles the signout flow
 * Clears the session cookie and Firebase auth state, then redirects to signin
 */
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
        console.error('Signout error:', error);
      } finally {
        // Always redirect to signin, whether signout succeeded or not
        router.push('/signin');
      }
    };

    performSignOut();
  }, [signout, router]);

  return <AuthLoadingOverlay message="Loggin You Out" />;
}
