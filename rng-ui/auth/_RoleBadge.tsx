'use client';

import { AppUserRole } from '@/rng-platform';
import { Badge } from '@mantine/core';

export interface RoleBadgeProps {
  role: AppUserRole;
  /**
   * Badge size
   * @default 'sm'
   */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /**
   * Badge variant
   * @default 'light'
   */
  variant?: 'filled' | 'light' | 'outline' | 'dot';
}

/**
 * Role display badge with consistent styling
 *
 * Color scheme:
 * - owner: violet (highest privilege)
 * - manager: blue (administrative)
 * - employee: green (staff)
 * - client: gray (external)
 *
 * @example
 * <RoleBadge role="owner" />
 * <RoleBadge role="manager" variant="filled" />
 */
export function RoleBadge({ role, size = 'sm', variant = 'light' }: RoleBadgeProps) {
  const colorMap: Record<AppUserRole, string> = {
    owner: 'violet',
    manager: 'blue',
    employee: 'green',
    client: 'gray',
  };

  const labelMap: Record<AppUserRole, string> = {
    owner: 'Owner',
    manager: 'Manager',
    employee: 'Employee',
    client: 'Client',
  };

  return (
    <Badge size={size} color={colorMap[role]} variant={variant}>
      {labelMap[role]}
    </Badge>
  );
}

export default RoleBadge;
