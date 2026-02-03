'use client';

import { useAuthSession, useSignOut } from '@/rng-platform/rng-auth';
import { AuthLoadingOverlay } from '@/rng-platform/rng-auth/app-auth-components';
import DarkModeButton from '@/rng-ui/DarkModeButton';
import { RNGSideNavLink } from '@/rng-ui/Dashboard/SideNavLink';
import { RNGUserMenu } from '@/rng-ui/Dashboard/UserMenu';
import { AppShell, Box, Group, Stack, Text, ThemeIcon, useMantineColorScheme } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconDashboard, IconMenu2 } from '@tabler/icons-react';
import { ReactNode, useState } from 'react';

interface DashboardLayoutProps {
  children: ReactNode;
}
export function DashboardLayout({ children }: DashboardLayoutProps) {
  const session = useAuthSession();
  const [sidebarOpened, setSidebarOpened] = useState(true);
  const isMobile = useMediaQuery('(max-width: 768px)');

  // Sidebar closes on mobile by default, but toggle persists state
  const showSidebar = sidebarOpened && !isMobile;

  if (!session.user) {
    return <AuthLoadingOverlay />;
  }

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 250,
        breakpoint: 'md',
        collapsed: { mobile: !showSidebar, desktop: false },
      }}
      padding={isMobile ? 'md' : 'lg'}
    >
      <AppShell.Header p={0}>
        <DashboardHeader
          onToggleSidebar={() => setSidebarOpened((v) => !v)}
          user={session.state === 'authenticated' ? (session.user?.name ?? 'User') : 'User'}
          userEmail={session.state === 'authenticated' ? (session.user?.email ?? '') : ''}
          isMobile={isMobile}
        />
      </AppShell.Header>

      <AppShell.Navbar p={0}>
        <DashboardSidebar />
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}

/**
 * Sticky header with logo, sidebar toggle, and user menu.
 * Remains visually quiet (minimal decoration).
 */
function DashboardHeader({
  onToggleSidebar,
  user,
  userEmail,
  isMobile,
}: {
  onToggleSidebar: () => void;
  user: string;
  userEmail: string;
  isMobile: boolean;
}) {
  const [menuOpened, setMenuOpened] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { mutateAsync: signout } = useSignOut();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signout();
    // No need to setIsSigningOut(false) - component will unmount on redirect
  };

  return (
    <Box
      h="100%"
      px="lg"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: `1px solid var(--mantine-color-${isDark ? 'dark-5' : 'gray-2'})`,
        backgroundColor: `var(--mantine-color-${isDark ? 'dark-7' : 'white'})`,
      }}
    >
      {/* Left: Logo + Mobile Toggle */}
      <Group gap="xs" wrap="nowrap">
        {isMobile && (
          <ThemeIcon
            variant="light"
            size="lg"
            onClick={onToggleSidebar}
            style={{ cursor: 'pointer' }}
          >
            <IconMenu2 size={20} />
          </ThemeIcon>
        )}
        <Text fw={600} size="md">
          RNG ERP
        </Text>
      </Group>

      {/* Right: Dark Mode + User Menu */}
      <Group gap="md">
        <DarkModeButton />
        <RNGUserMenu />
      </Group>
    </Box>
  );
}

function DashboardSidebar() {
  return (
    <Stack gap={0}>
      <RNGSideNavLink label="Dashboard" icon={<IconDashboard size={20} />} href="/dashboard" />
      <RNGSideNavLink
        label="User Management"
        icon={<IconDashboard size={20} />}
        href="/dashboard/user-management"
      />
    </Stack>
  );
}
