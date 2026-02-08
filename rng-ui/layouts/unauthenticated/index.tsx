'use client';

import { AppShell } from '@mantine/core';
import { ReactNode } from 'react';
import { UnauthenticatedHeader } from '../components';

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
        <UnauthenticatedHeader />
      </AppShell.Header>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
