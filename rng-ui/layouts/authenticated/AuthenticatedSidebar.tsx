'use client';

import { AppShell, ScrollArea, Stack, Text } from '@mantine/core';
import { IconDashboard } from '@tabler/icons-react';
import { RNGSideNavLink } from '../../ux/_RNGSideNavLink';
import { OwnerOnlySidebarLinks } from './_OwnerOnlySidebarLinks';

interface AuthenticatedSidebarProps {
  onClick?: () => void;
}

export default function AuthenticatedSidebar({ onClick }: AuthenticatedSidebarProps) {
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
      </AppShell.Section>

      {/* Main section - scrollable */}
      <AppShell.Section grow component={ScrollArea} m={0}>
        <Stack gap={0} p={0}>
          <OwnerOnlySidebarLinks onClick={onClick} />
        </Stack>
      </AppShell.Section>

      <AppShell.Section m={0} p={0}>
        <Stack gap={0} p={'sm'}>
          <Text size="xs" c="dimmed" mx="auto">
            2026 &copy; RN Goyal &amp; Associates
          </Text>
        </Stack>
      </AppShell.Section>
    </>
  );
}
