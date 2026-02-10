'use client';

import { RequireRole } from '@/rng-ui/auth/_RequireRole';
import { RNGSideNavLink } from '@/rng-ui/ux/_RNGSideNavLink';
import { Divider, NavLink } from '@mantine/core';
import { IconHeart, IconListTree, IconTrash, IconUserPlus, IconUsers } from '@tabler/icons-react';
import type { ReactNode } from 'react';

interface OwnerSidebarLinksProps {
  onClick?: () => void;
}

type OwnerSidebarLinkItem = {
  type: 'link';
  label: string;
  icon: ReactNode;
  href: string;
};

type OwnerSidebarSectionItem = {
  type: 'section';
  label: string;
  leftSection: ReactNode;
  children: OwnerSidebarLinkItem[];
};

type OwnerSidebarItem = OwnerSidebarLinkItem | OwnerSidebarSectionItem;

const OwnerOnlySidebarLinks: OwnerSidebarItem[] = [
  {
    type: 'link',
    label: 'Taxonomy',
    icon: <IconListTree size={18} />,
    href: '/dashboard/taxonomy',
  },
  {
    type: 'section',
    leftSection: <IconUsers size={18} />,
    label: 'User Management',
    children: [
      {
        type: 'link',
        label: 'Team',
        icon: <IconUsers size={18} />,
        href: '/dashboard/user-management',
      },
      {
        type: 'link',
        label: 'Invite User',
        icon: <IconUserPlus size={18} />,
        href: '/dashboard/user-management/invite',
      },
      {
        type: 'link',
        label: 'Health Dashboard',
        icon: <IconHeart size={18} />,
        href: '/dashboard/user-management/health',
      },
      {
        type: 'link',
        label: 'Orphaned Users',
        icon: <IconTrash size={18} />,
        href: '/dashboard/user-management/orphaned-cleanup',
      },
    ],
  },
];

export function OwnerSidebarLinks({ onClick }: OwnerSidebarLinksProps) {
  return (
    <RequireRole allow={['owner']} fallback={null}>
      <Divider my="xs" label="Adminstration" labelPosition="center" />

      {OwnerOnlySidebarLinks.map((val) => {
        if (val.type === 'link') {
          return (
            <RNGSideNavLink
              key={val.href}
              label={val.label}
              icon={val.icon}
              href={val.href}
              onClick={onClick}
            />
          );
        }

        if (val.type === 'section') {
          return (
            <NavLink
              key={val.label}
              label={val.label}
              leftSection={val.leftSection}
              defaultOpened={true}
            >
              {val.children.map((child) => {
                return (
                  <RNGSideNavLink
                    key={child.href}
                    label={child.label}
                    icon={child.icon}
                    href={child.href}
                    onClick={onClick}
                  />
                );
              })}
            </NavLink>
          );
        }

        return null;
      })}
    </RequireRole>
  );
}
