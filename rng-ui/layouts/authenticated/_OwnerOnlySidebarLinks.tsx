'use client';

import { OwnerOnly } from '@/rng-platform/rng-auth/app-auth-components';
import { NavLink } from '@mantine/core';
import { IconHeart, IconTrash, IconUserPlus, IconUsers } from '@tabler/icons-react';
import { RNGSideNavLink } from '../../ux/_RNGSideNavLink';

interface DashboardSidebarProps {
  /**
   * Optional click handler (useful for closing mobile drawer)
   */
  onClick?: () => void;
}

export function OwnerOnlySidebarLinks({ onClick }: DashboardSidebarProps) {
  return (
    <OwnerOnly fallback={null}>
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
    </OwnerOnly>
  );
}
