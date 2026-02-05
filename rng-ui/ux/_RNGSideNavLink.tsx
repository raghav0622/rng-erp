'use client';

import { NavLink } from '@mantine/core';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';

export interface RNGSideNavLinkProps {
  href: string;
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  matchPartial?: boolean;
}

export function RNGSideNavLink(props: RNGSideNavLinkProps) {
  const route = usePathname();
  const active = props.matchPartial ? route.startsWith(props.href) : props.href === route;

  return (
    <NavLink
      active={active}
      component={NextLink}
      label={props.label}
      leftSection={props.icon}
      href={props.href}
      onClick={props.onClick}
    />
  );
}
