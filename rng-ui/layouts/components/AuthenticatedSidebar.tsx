'use client';

import { RNGSideNavLink } from '@/rng-ui/ux/_RNGSideNavLink';
import { AppShell, Divider, ScrollArea, Stack, Text } from '@mantine/core';
import { IconAutomation, IconDashboard, IconUser } from '@tabler/icons-react';
import { OwnerSidebarLinks } from './OwnerSidebarLinks';

interface AuthenticatedSidebarProps {
  onClick?: () => void;
}

export function AuthenticatedSidebar({ onClick }: AuthenticatedSidebarProps) {
  return (
    <>
      <AppShell.Section m={0} p={0}>
        <Stack gap={0} p={0}>
          <RNGSideNavLink
            label="Dashboard"
            icon={<IconDashboard size={20} />}
            href="/dashboard"
            onClick={onClick}
          />
        </Stack>

        <Divider my="xs" label="General" labelPosition="center" />
      </AppShell.Section>

      <AppShell.Section grow component={ScrollArea} m={0}>
        <Stack gap={0} p={0}>
          <OwnerSidebarLinks onClick={onClick} />
        </Stack>
      </AppShell.Section>

      <AppShell.Section m={0} p={0}>
        <Stack gap="sm" py="sm">
          <RNGSideNavLink
            href="/profile"
            icon={<IconUser size={20} />}
            onClick={onClick}
            label="Profile Page"
          />
          <Text size="xs" c="dimmed" mx="auto">
            2026 &copy; RN Goyal &amp; Associates
          </Text>
        </Stack>
      </AppShell.Section>
    </>
  );
}
