'use client';

import { Badge, Group, Paper, Stack, Text } from '@mantine/core';
import { IconArrowRight } from '@tabler/icons-react';
import { memo } from 'react';
import { getRoleLabel, getRoleLevel } from '../utils/roleHelpers';

export interface RolePermissionComparisonProps {
  currentRole: string;
  newRole: string;
}

/**
 * Role permission comparison component
 * Shows what permissions change when role is updated
 *
 * @example
 * <RolePermissionComparison currentRole="employee" newRole="manager" />
 */
export function RolePermissionComparison({ currentRole, newRole }: RolePermissionComparisonProps) {
  // Permission matrix based on role hierarchy
  const permissions: Record<string, string[]> = {
    owner: [
      'Manage all users',
      'Change user roles',
      'Delete users',
      'Invite users',
      'View audit logs',
      'Access admin panel',
    ],
    manager: [
      'View all users',
      'Invite users (manager+)',
      'Manage employees',
      'Disable/enable users',
      'View reports',
    ],
    employee: [
      'View own profile',
      'Edit own profile',
      'Change own password',
      'View assigned resources',
    ],
    client: ['View own profile', 'Change own password'],
  };

  const currentPerms = permissions[currentRole] || [];
  const newPerms = permissions[newRole] || [];

  const gaining = newPerms.filter((p) => !currentPerms.includes(p));
  const losing = currentPerms.filter((p) => !newPerms.includes(p));
  const keeping = currentPerms.filter((p) => newPerms.includes(p));

  const currentLevel = getRoleLevel(currentRole);
  const newLevel = getRoleLevel(newRole);
  const isPromotion = newLevel > currentLevel;
  const isDemotion = newLevel < currentLevel;

  return (
    <Paper p="md" withBorder>
      <Stack gap="md">
        {/* Header with role transition */}
        <Group justify="space-between">
          <div>
            <Badge>{getRoleLabel(currentRole)}</Badge>
          </div>
          <IconArrowRight
            size={20}
            color={isPromotion ? 'green' : isDemotion ? 'orange' : 'gray'}
          />
          <div>
            <Badge>{getRoleLabel(newRole)}</Badge>
          </div>
        </Group>

        {/* Gaining permissions */}
        {gaining.length > 0 && (
          <div>
            <Text size="sm" fw={600} c="green" mb="xs">
              ✓ New Permissions
            </Text>
            <Stack gap="xs">
              {gaining.map((perm) => (
                <Text key={perm} size="sm">
                  + {perm}
                </Text>
              ))}
            </Stack>
          </div>
        )}

        {/* Losing permissions */}
        {losing.length > 0 && (
          <div>
            <Text size="sm" fw={600} c="orange" mb="xs">
              ✗ Removed Permissions
            </Text>
            <Stack gap="xs">
              {losing.map((perm) => (
                <Text key={perm} size="sm">
                  - {perm}
                </Text>
              ))}
            </Stack>
          </div>
        )}

        {/* Unchanged permissions */}
        {keeping.length > 0 && (
          <div>
            <Text size="sm" fw={600} c="dimmed" mb="xs">
              ≈ Unchanged Permissions
            </Text>
            <Stack gap="xs">
              {keeping.map((perm) => (
                <Text key={perm} size="sm" c="dimmed">
                  ~ {perm}
                </Text>
              ))}
            </Stack>
          </div>
        )}
      </Stack>
    </Paper>
  );
}

export default memo(RolePermissionComparison);
