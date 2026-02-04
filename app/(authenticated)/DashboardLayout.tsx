'use client';

import { useAuthSession } from '@/rng-platform/rng-auth';
import { AuthLoadingOverlay } from '@/rng-platform/rng-auth/app-auth-components';
import { DashboardHeader, DashboardSidebar } from '@/rng-ui/dashboard';
import { AppShell } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { ReactNode } from 'react';

interface DashboardLayoutProps {
  children: ReactNode;
}

/**
 * Beautiful, responsive dashboard layout following Mantine best practices
 * Features:
 * - Collapsible navbar for both mobile and desktop
 * - Smooth transitions and animations
 * - AppShell.Section for proper scrollable areas
 * - Responsive padding and spacing
 */
export function DashboardLayout({ children }: DashboardLayoutProps) {
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
      {/* Beautiful header with burger menus, logo, and user controls */}
      <AppShell.Header>
        <DashboardHeader
          mobileOpened={mobileOpened}
          desktopOpened={desktopOpened}
          toggleMobile={toggleMobile}
          toggleDesktop={toggleDesktop}
        />
      </AppShell.Header>

      {/* Sidebar with scrollable navigation */}
      <AppShell.Navbar>
        <DashboardSidebar onClick={toggleMobile} />
      </AppShell.Navbar>

      {/* Main content area */}
      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
