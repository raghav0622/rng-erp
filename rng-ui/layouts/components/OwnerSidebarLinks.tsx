'use client';

import { RequireRole } from '@/rng-ui/auth/_RequireRole';
import { RNGSideNavLink } from '@/rng-ui/ux/_RNGSideNavLink';
import { Divider, NavLink } from '@mantine/core';
import { IconHeart, IconTrash, IconUserPlus, IconUsers } from '@tabler/icons-react';

interface OwnerSidebarLinksProps {
  onClick?: () => void;
}

export function OwnerSidebarLinks({ onClick }: OwnerSidebarLinksProps) {
  return (
    <RequireRole allow={['owner']} fallback={null}>
      <Divider my="xs" label="Adminstration" labelPosition="center" />

      <NavLink label="User Management" leftSection={<IconUsers size={20} />} defaultOpened={false}>
        <RNGSideNavLink
          label="Team"
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
      </NavLink>
    </RequireRole>
  );
}
