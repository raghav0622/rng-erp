'use client';

import { Container, Group, Skeleton, Stack } from '@mantine/core';

/**
 * Skeleton loader for user detail view
 * Shows placeholder layout while data loads
 */
export function UserDetailSkeleton() {
  return (
    <Container size="md" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Skeleton height={60} circle mb="xl" />
        <Skeleton height={20} width="40%" mb="lg" />

        {/* Profile info */}
        <Stack gap="md">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={80} />
          ))}
        </Stack>

        {/* Actions */}
        <Group gap="sm">
          <Skeleton height={40} width="120px" />
          <Skeleton height={40} width="120px" />
        </Group>
      </Stack>
    </Container>
  );
}

/**
 * Skeleton loader for user list view
 * Shows 5-10 placeholder rows
 */
export function UserListSkeleton({ rowCount = 8 }: { rowCount?: number }) {
  return (
    <Container size="md" py="xl">
      <Stack gap="md">
        {/* Header */}
        <Skeleton height={30} width="20%" mb="lg" />

        {/* Search bar */}
        <Skeleton height={40} mb="lg" />

        {/* Rows */}
        {Array.from({ length: rowCount }).map((_, i) => (
          <Skeleton key={i} height={60} />
        ))}
      </Stack>
    </Container>
  );
}

/**
 * Skeleton loader for user card
 * Quick preview skeleton
 */
export function UserCardSkeleton() {
  return (
    <Stack gap="md" p="md">
      <Skeleton height={40} circle mb="md" />
      <Skeleton height={20} width="80%" />
      <Skeleton height={16} width="100%" />
      <Skeleton height={16} width="60%" />
      <Group gap="sm">
        <Skeleton height={32} width="80px" />
        <Skeleton height={32} width="80px" />
      </Group>
    </Stack>
  );
}

/**
 * Skeleton loader for form/detail screen
 */
export function FormSkeleton() {
  return (
    <Container size="xs" py="xl">
      <Stack gap="md">
        {Array.from({ length: 5 }).map((_, i) => (
          <Stack key={i} gap="xs">
            <Skeleton height={16} width="30%" />
            <Skeleton height={40} />
          </Stack>
        ))}
      </Stack>
    </Container>
  );
}

export default UserDetailSkeleton;
