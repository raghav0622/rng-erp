'use client';

import { OwnerOnly } from '@/rng-platform/rng-auth/app-auth-components';
import { AppShell, ScrollArea, Stack } from '@mantine/core';
import { IconDashboard, IconHeart, IconTrash, IconUserPlus, IconUsers } from '@tabler/icons-react';
import { CollapsibleNavGroup } from './CollapsibleNavGroup';
import { RNGSideNavLink } from './SideNavLink';

interface DashboardSidebarProps {
  /**
   * Optional click handler (useful for closing mobile drawer)
   */
  onClick?: () => void;
}

/**
 * Beautiful dashboard sidebar with scrollable navigation
 * Uses AppShell.Section for proper layout
 */
export function DashboardSidebar({ onClick }: DashboardSidebarProps) {
  return (
    <>
      {/* Header section - fixed at top */}
      <AppShell.Section>
        <Stack gap={0} p="md">
          <RNGSideNavLink
            label="Dashboard"
            icon={<IconDashboard size={20} />}
            href="/dashboard"
            onClick={onClick}
          />
        </Stack>
      </AppShell.Section>

      {/* Main section - scrollable */}
      <AppShell.Section grow component={ScrollArea}>
        <Stack gap={0} p="md" pt={0}>
          <OwnerOnly>
            <CollapsibleNavGroup
              label="User Management"
              icon={<IconUsers size={20} />}
              basePath="/dashboard/user-management"
              defaultOpened={true}
            >
              <RNGSideNavLink
                label="User List"
                icon={<IconUsers size={18} />}
                href="/dashboard/user-management"
                onClick={onClick}
              />
              <RNGSideNavLink
                label="Invite User"
                icon={<IconUserPlus size={18} />}
                href="/dashboard/user-management/invite"
                onClick={onClick}
              />
              <RNGSideNavLink
                label="Health Dashboard"
                icon={<IconHeart size={18} />}
                href="/dashboard/user-management/health"
                onClick={onClick}
              />
              <RNGSideNavLink
                label="Orphaned Users"
                icon={<IconTrash size={18} />}
                href="/dashboard/user-management/orphaned-cleanup"
                onClick={onClick}
              />
            </CollapsibleNavGroup>
          </OwnerOnly>
        </Stack>
      </AppShell.Section>

      {/* Footer section - fixed at bottom (optional) */}
      {/* <AppShell.Section>
        <Stack gap="xs" p="md">
          <Text size="xs" c="dimmed">
            Version 1.0.0
          </Text>
        </Stack>
      </AppShell.Section> */}
    </>
  );
}
