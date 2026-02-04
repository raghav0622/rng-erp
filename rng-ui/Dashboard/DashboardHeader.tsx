'use client';

import { Burger, Group, Text } from '@mantine/core';
import { IconBrandReact } from '@tabler/icons-react';
import { DarkModeButton } from './DarkModeButton';
import { RNGUserMenu } from './UserMenu';

interface DashboardHeaderProps {
  /**
   * Mobile sidebar opened state
   */
  mobileOpened: boolean;
  /**
   * Desktop sidebar opened state
   */
  desktopOpened: boolean;
  /**
   * Toggle mobile sidebar
   */
  toggleMobile: () => void;
  /**
   * Toggle desktop sidebar
   */
  toggleDesktop: () => void;
}

/**
 * Beautiful dashboard header with logo, burger menu, dark mode toggle, and user menu
 * Follows Mantine AppShell best practices
 */
export function DashboardHeader({
  mobileOpened,
  desktopOpened,
  toggleMobile,
  toggleDesktop,
}: DashboardHeaderProps) {
  return (
    <Group h="100%" px="md" justify="space-between" wrap="nowrap">
      {/* Left side: Burgers + Logo */}
      <Group gap="sm" wrap="nowrap">
        <Burger opened={mobileOpened} onClick={toggleMobile} hiddenFrom="sm" size="sm" />
        <Burger opened={desktopOpened} onClick={toggleDesktop} visibleFrom="sm" size="sm" />

        <Group gap="xs" wrap="nowrap">
          <IconBrandReact size={28} stroke={2} style={{ color: 'var(--mantine-color-blue-6)' }} />
          <Text size="lg" fw={700} style={{ letterSpacing: '-0.5px' }}>
            RNG ERP
          </Text>
        </Group>
      </Group>

      {/* Right side: Dark Mode + User Menu */}
      <Group gap="xs" wrap="nowrap">
        <DarkModeButton />
        <RNGUserMenu />
      </Group>
    </Group>
  );
}
