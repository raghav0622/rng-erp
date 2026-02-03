'use client';

import { NavLink } from '@mantine/core';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';

export interface SideNavLinkProps {
  href: string;
  label: string;
  icon: React.ReactNode;
}

export function RNGSideNavLink(props: SideNavLinkProps) {
  const route = usePathname();
  const active = props.href === route;
  return (
    <NavLink
      active={active}
      component={NextLink}
      label={props.label}
      leftSection={props.icon}
      href={props.href}
    />
  );
}
