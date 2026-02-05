'use client';

import { useAuthSession, useRequireAuthenticated } from '@/rng-platform/rng-auth';
import { RNGLoadingOverlay } from '@/rng-ui/ux';
import { AppShell } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { ReactNode } from 'react';
import Header from './_header';
import Sidebar from './_sidebar';

interface AuthenticatedLayoutProps {
  children: ReactNode;
}
export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const session = useAuthSession();
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);

  // Wait for auth to resolve before calling useRequireAuthenticated
  if (session.state === 'unknown' || session.state === 'authenticating') {
    return <RNGLoadingOverlay />;
  }

  // Now safe to call - will throw NotAuthenticatedError if not authenticated
  // which will be caught by AuthErrorBoundary
  const user = useRequireAuthenticated();

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
        <Header
          mobileOpened={mobileOpened}
          desktopOpened={desktopOpened}
          toggleMobile={toggleMobile}
          toggleDesktop={toggleDesktop}
        />
      </AppShell.Header>

      <AppShell.Navbar style={{ padding: 0, gap: 0 }}>
        <Sidebar onClick={toggleMobile} />
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
