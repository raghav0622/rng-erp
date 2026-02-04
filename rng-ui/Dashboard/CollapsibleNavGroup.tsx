'use client';

import { NavLink } from '@mantine/core';
import { usePathname } from 'next/navigation';

export interface CollapsibleNavGroupProps {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpened?: boolean;
  basePath?: string; // For detecting active state of parent group
}

/**
 * Collapsible navigation group for sidebar
 * Uses Mantine NavLink with built-in collapsible behavior
 * Detects active state based on current pathname matching basePath
 */
export function CollapsibleNavGroup({
  label,
  icon,
  children,
  defaultOpened = false,
  basePath,
}: CollapsibleNavGroupProps) {
  const pathname = usePathname();

  // Detect if any child route is active
  const isActive = basePath ? pathname.startsWith(basePath) : false;

  return (
    <NavLink
      label={label}
      leftSection={icon}
      active={isActive}
      childrenOffset={28}
      defaultOpened={defaultOpened}
    >
      {children}
    </NavLink>
  );
}
