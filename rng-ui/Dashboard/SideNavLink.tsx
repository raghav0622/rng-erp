'use client';

import { NavLink } from '@mantine/core';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';

export interface SideNavLinkProps {
  href: string;
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  /**
   * Enable partial path matching for active state detection
   * When true, link is active if current pathname starts with href
   * Default: false (exact match only)
   */
  matchPartial?: boolean;
}

/**
 * Beautiful navigation link component for sidebar
 * Supports exact and partial path matching for active state
 */
export function RNGSideNavLink(props: SideNavLinkProps) {
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
