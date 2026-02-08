'use client';

import { RNGLogo } from '@/rng-ui/brand';
import { RNGDarkModeButton } from '@/rng-ui/ux';
import { Group } from '@mantine/core';

export function UnauthenticatedHeader() {
  return (
    <Group h="100%" px="md" justify="space-between" wrap="nowrap">
      <RNGLogo />

      <Group gap="xs" wrap="nowrap">
        <RNGDarkModeButton />
      </Group>
    </Group>
  );
}
