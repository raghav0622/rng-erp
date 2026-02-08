'use client';

import { Badge, Group, Stack, Text } from '@mantine/core';

export function UserStatusLegend() {
  return (
    <Stack gap="xs">
      <Group gap="xs">
        <Badge color="green" size="xs">
          Active
        </Badge>
        <Text size="xs" c="dimmed">
          User is active and can sign in
        </Text>
      </Group>
      <Group gap="xs">
        <Badge color="orange" size="xs">
          Disabled
        </Badge>
        <Text size="xs" c="dimmed">
          User is disabled and cannot sign in
        </Text>
      </Group>
      <Group gap="xs">
        <Badge color="gray" size="xs">
          Deleted
        </Badge>
        <Text size="xs" c="dimmed">
          User is deleted and cannot sign in
        </Text>
      </Group>
      <Group gap="xs">
        <Badge color="blue" size="xs">
          Invited
        </Badge>
        <Text size="xs" c="dimmed">
          User has been invited but not registered
        </Text>
      </Group>
      <Group gap="xs">
        <Badge color="red" size="xs">
          Revoked
        </Badge>
        <Text size="xs" c="dimmed">
          User invitation was revoked
        </Text>
      </Group>
      <Group gap="xs">
        <Badge color="green" size="xs">
          Activated
        </Badge>
        <Text size="xs" c="dimmed">
          User has completed registration
        </Text>
      </Group>
    </Stack>
  );
}
