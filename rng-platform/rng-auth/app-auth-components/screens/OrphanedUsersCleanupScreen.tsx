'use client';

import { Alert, Button, Group, Stack, Text } from '@mantine/core';
import { IconAlertCircle, IconTrash } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useCleanupOrphanedUser } from '../../app-auth-hooks/useUserManagementMutations';
import { useListOrphanedUsers } from '../../app-auth-hooks/useUserQueries';
import type { AppUser } from '../../app-auth-service/internal-app-user-service/app-user.contracts';
import { AuthEmptyState } from '../boundaries/AuthEmptyState';
import { AuthLoadingOverlay } from '../boundaries/AuthLoadingOverlay';
import OrphanedUserBadge from '../components/OrphanedUserBadge';
import { ScreenContainer, ScreenHeader } from '../shared/ScreenComponents';
import { formatShortDate } from '../utils/dateFormatters';

export interface OrphanedUsersCleanupScreenProps {
  backPath?: string;
}

/**
 * Orphaned users cleanup screen
 *
 * Features:
 * - Diagnose auth/Firestore sync issues
 * - List orphaned Firebase Auth users
 * - Manual cleanup/deletion of orphaned users
 * - Shows status and linked user info
 * - Async cleanup with error recovery
 *
 * Orphaned Users:
 * - Firebase Auth user without AppUser in Firestore
 * - Indicates failed signup, race condition, or manual deletion
 * - Cannot sign in (no AppUser)
 * - Must be cleaned up manually
 *
 * @example
 * <OrphanedUsersCleanupScreen backPath="/admin" />
 */
export function OrphanedUsersCleanupScreen({
  backPath = '/users',
}: OrphanedUsersCleanupScreenProps) {
  const router = useRouter();
  const { data: orphanedUsers = [], isLoading: orphansLoading } = useListOrphanedUsers();
  const cleanupOrphanedUser = useCleanupOrphanedUser();
  const [externalErrors, setExternalErrors] = useState<string[]>([]);
  const [cleaningUserId, setCleaningUserId] = useState<string | null>(null);

  const handleCleanup = async (userId: string) => {
    setExternalErrors([]);
    setCleaningUserId(userId);

    try {
      await cleanupOrphanedUser.mutateAsync({ userId });
      // Successfully deleted - remove from list
      setCleaningUserId(null);
    } catch (error) {
      const appError = error as any;
      setExternalErrors([appError?.message || 'Failed to cleanup orphaned user']);
      setCleaningUserId(null);
    }
  };

  if (orphansLoading) {
    return <AuthLoadingOverlay message="Loading orphaned users..." />;
  }

  return (
    <ScreenContainer>
      <ScreenHeader
        title="Orphaned Users Cleanup"
        description="Manage and cleanup Firebase Auth users without Firestore AppUser records"
        icon={IconAlertCircle}
      />

      <Alert icon={<IconAlertCircle size={16} />} color="yellow" variant="light" mb="lg">
        <Stack gap="xs">
          <Text fw={600} size="sm">
            What are orphaned users?
          </Text>
          <Text size="sm">
            Firebase Auth users without corresponding AppUser records in Firestore. Usually caused
            by failed signups or race conditions.
          </Text>
        </Stack>
      </Alert>

      {externalErrors.length > 0 && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light" mb="lg">
          <Stack gap="xs">
            {externalErrors.map((error, idx) => (
              <Text key={idx} size="sm">
                {error}
              </Text>
            ))}
          </Stack>
        </Alert>
      )}

      {orphanedUsers.length === 0 && (
        <AuthEmptyState
          title="No Orphaned Users"
          description="Your system is healthy - no orphaned Firebase Auth users found"
          icon={<IconAlertCircle size={32} style={{ color: 'var(--mantine-color-green-6)' }} />}
        />
      )}

      {orphanedUsers.length > 0 && (
        <Stack gap="md">
          <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
            <Text size="sm">
              Found {orphanedUsers.length} orphaned user{orphanedUsers.length !== 1 ? 's' : ''} that
              need cleanup
            </Text>
          </Alert>

          <Stack gap="sm">
            {orphanedUsers.map((user: AppUser) => (
              <div
                key={user.id}
                style={{
                  padding: 12,
                  borderRadius: 6,
                  backgroundColor: 'var(--mantine-color-gray-0)',
                  border: '1px solid var(--mantine-color-red-2)',
                }}
              >
                <Group justify="space-between" align="flex-start">
                  <div style={{ flex: 1 }}>
                    <Group gap="xs" mb={4}>
                      <Text fw={600} size="sm">
                        {user.email}
                      </Text>
                      <OrphanedUserBadge size="sm" />
                    </Group>
                    <Text size="xs" c="dimmed">
                      Auth ID: {user.id}
                    </Text>
                    {user.createdAt && (
                      <Text size="xs" c="dimmed" mt={2}>
                        Created: {formatShortDate(user.createdAt)}
                      </Text>
                    )}
                  </div>
                  <Button
                    color="red"
                    size="sm"
                    onClick={() => handleCleanup(user.id)}
                    loading={cleaningUserId === user.id}
                    disabled={cleaningUserId !== null}
                    leftSection={<IconTrash size={14} />}
                  >
                    {cleaningUserId === user.id ? 'Cleaning...' : 'Cleanup'}
                  </Button>
                </Group>
              </div>
            ))}
          </Stack>

          <Alert icon={<IconAlertCircle size={16} />} color="blue" variant="light">
            <Text size="sm">
              Cleanup will permanently delete the Firebase Auth user. This is safe - the user cannot
              sign in anyway without an AppUser record.
            </Text>
          </Alert>
        </Stack>
      )}

      <Button variant="subtle" mt="lg" onClick={() => router.push(backPath)}>
        Back
      </Button>
    </ScreenContainer>
  );
}

export default OrphanedUsersCleanupScreen;
