'use client';

import { useAuthSession, useRequireAuthenticated } from '@/rng-platform/rng-auth';
import { RNGLoadingOverlay } from '@/rng-ui/ux';
import { AppShell } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { ReactNode, useEffect } from 'react';
import { AuthenticatedHeader, AuthenticatedSidebar } from '../components';

interface AuthenticatedLayoutProps {
  children: ReactNode;
}
export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const session = useAuthSession();
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);

  // Redirect to sign-in if session becomes unauthenticated (e.g., user disabled by owner)
  // Use full page reload to ensure middleware sees cleared cookie
  useEffect(() => {
    if (session.state === 'unauthenticated') {
      // Force full page reload to /signin to avoid race conditions with cookie clearing
      // Client-side navigation (router.push) can cause redirect loops if cookie isn't cleared yet
      window.location.href = '/signin';
    }
  }, [session.state]);

  // Wait for auth to resolve before rendering
  if (session.state === 'unknown' || session.state === 'authenticating') {
    return <RNGLoadingOverlay />;
  }

  // If unauthenticated, show loading while redirecting (window.location.href will take over)
  if (session.state === 'unauthenticated') {
    return <RNGLoadingOverlay />;
  }

  // Now safe to call - user is authenticated
  useRequireAuthenticated();

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 280,
        breakpoint: 'sm',
        collapsed: { mobile: !mobileOpened, desktop: !desktopOpened },
      }}
      padding="md"
      transitionDuration={300}
      transitionTimingFunction="ease"
    >
      <AppShell.Header>
        <AuthenticatedHeader
          mobileOpened={mobileOpened}
          desktopOpened={desktopOpened}
          toggleMobile={toggleMobile}
          toggleDesktop={toggleDesktop}
        />
      </AppShell.Header>

      <AppShell.Navbar style={{ padding: 0, gap: 0 }}>
        <AuthenticatedSidebar onClick={toggleMobile} />
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
