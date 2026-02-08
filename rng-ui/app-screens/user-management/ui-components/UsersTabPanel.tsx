'use client';

import type { AppUser } from '@/rng-platform/rng-auth/app-auth-service/internal-app-user-service/app-user.contracts';
import { RNGLoadingOverlay, RNGMessageAlert } from '@/rng-ui/ux';
import { SimpleGrid } from '@mantine/core';
import { ReactNode } from 'react';

interface UsersTabPanelProps {
  users: AppUser[];
  isLoading: boolean;
  emptyLabel: string;
  renderUser: (user: AppUser) => ReactNode;
}

export function UsersTabPanel({ users, isLoading, emptyLabel, renderUser }: UsersTabPanelProps) {
  if (isLoading) {
    return <RNGLoadingOverlay />;
  }

  if (users.length === 0) {
    return <RNGMessageAlert tone="gray" message={emptyLabel} />;
  }

  return (
    <SimpleGrid cols={{ base: 2, md: 3 }} spacing="md">
      {users.map(renderUser)}
    </SimpleGrid>
  );
}
