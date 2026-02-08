'use client';

import { AppUser } from '@/rng-platform';
import { Avatar, Badge, Button, Group, Paper, Stack, Text } from '@mantine/core';
import { IconUser } from '@tabler/icons-react';
import RoleBadge from './_RoleBadge';

export interface UserCardDesignProps {
  user: AppUser;
  actions?: React.ReactNode;
  onShowDetails?: () => void;
  showDetailsButton?: boolean;
}

/**
 * UserCardDesign - Professional user card
 * Features centered avatar with role badge and action menu
 */
export function UserCardDesign({
  user,
  actions,
  onShowDetails,
  showDetailsButton = false,
}: UserCardDesignProps) {
  return (
    <Paper withBorder shadow="sm" p={0} pos="relative">
      {/* Actions - Top Right */}
      {actions && (
        <div
          style={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }}
          onClick={(e) => e.stopPropagation()}
        >
          {actions}
        </div>
      )}

      {/* Content Container */}
      <Stack gap={0} align="center" py="xs" px="xs">
        {/* Avatar - Centered at top */}
        <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
          <Avatar src={user.photoUrl} size={64} radius="50%">
            <IconUser size={32} />
          </Avatar>
        </div>

        {/* Name */}
        <Text
          fw={600}
          size="sm"
          ta="center"
          style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}
        >
          {user.name}
        </Text>

        {/* Status Badges */}
        <Group gap="xs" mt="xs" justify="center">
          <RoleBadge role={user.role} />
          {user.isDisabled && (
            <Badge size="sm" variant="filled">
              Disabled
            </Badge>
          )}
        </Group>

        {/* Email */}
        <Text size="xs" c="dimmed" ta="center" mt="sm" style={{ wordBreak: 'break-word' }}>
          {user.email}
        </Text>

        {/* Description/Category */}
        {user.roleCategory && (
          <Text size="xs" c="dimmed" ta="center" mt="xs" style={{ fontStyle: 'italic' }}>
            {user.roleCategory}
          </Text>
        )}

        {/* Show Details Button */}
        {showDetailsButton && onShowDetails && (
          <Button variant="subtle" size="xs" mt="sm" onClick={onShowDetails}>
            Show Details
          </Button>
        )}
      </Stack>
    </Paper>
  );
}
