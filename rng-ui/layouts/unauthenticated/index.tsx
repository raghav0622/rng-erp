'use client';

import { RNGLogo } from '@/rng-ui/brand';
import { RNGDarkModeButton } from '@/rng-ui/ux';
import { AppShell, Group } from '@mantine/core';
import { ReactNode } from 'react';

export function UnauthenticatedLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell
      header={{ height: 60 }}
      padding="md"
      transitionDuration={300}
      transitionTimingFunction="ease"
    >
      {/* Beautiful header with burger menus, logo, and user controls */}
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <RNGLogo />

          <Group gap="xs" wrap="nowrap">
            <RNGDarkModeButton />
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
