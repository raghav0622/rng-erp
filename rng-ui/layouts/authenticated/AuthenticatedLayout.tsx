'use client';

import { useAuthSession } from '@/rng-platform/rng-auth';
import { AuthLoadingOverlay } from '@/rng-platform/rng-auth/app-auth-components';
import { AppShell } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { ReactNode } from 'react';
import AuthenticatedHeader from './AuthenticatedHeader';
import AuthenticatedSidebar from './AuthenticatedSidebar';
interface DashboardLayoutProps {
  children: ReactNode;
}
export default function AuthenticatedLayout({ children }: DashboardLayoutProps) {
  const session = useAuthSession();
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);

  if (!session.user) {
    return <AuthLoadingOverlay />;
  }

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
