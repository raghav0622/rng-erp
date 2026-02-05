'use client';

import {
  useCleanupOrphanedUser,
  useListOrphanedUsers,
} from '@/rng-platform/rng-auth/app-auth-hooks';
import type { AppUser } from '@/rng-platform/rng-auth/app-auth-service/internal-app-user-service/app-user.contracts';
import { RNGPageContent } from '@/rng-ui/ux/_RNGPageContent';
import { Alert, Button, Center, Group, Loader, Stack, Text } from '@mantine/core';
import { IconAlertCircle, IconAlertTriangle, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';

/**
 * User Management - Orphaned Users Cleanup
 * Owner-only page for cleaning up Firebase Auth users without Firestore records
 * WARNING: This performs permanent deletion from Firebase Auth
 */
export default function OrphanedCleanupPage() {
  const { data: orphanedUsers = [], isLoading } = useListOrphanedUsers();
  const cleanupOrphanedUser = useCleanupOrphanedUser();
  const [externalErrors, setExternalErrors] = useState<string[]>([]);
  const [cleaningUserId, setCleaningUserId] = useState<string | null>(null);

  const handleCleanup = async (userId: string) => {
    setExternalErrors([]);
    setCleaningUserId(userId);

    try {
      await cleanupOrphanedUser.mutateAsync({ userId });
      setCleaningUserId(null);
    } catch (error) {
      const appError = error as any;
      setExternalErrors([appError?.message || 'Failed to cleanup orphaned user']);
      setCleaningUserId(null);
    }
  };

  const formatShortDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <Center h={400}>
        <Loader />
      </Center>
    );
  }

  return (
    <RNGPageContent
      title="Orphaned Users Cleanup"
      description="Clean up Firebase Auth users without corresponding Firestore records"
      warnings={[
        <Alert
          key="main-warning"
          icon={<IconAlertTriangle size={20} />}
          title="Permanent Deletion Warning"
          color="red"
        >
          Cleaning up orphaned users performs <strong>permanent deletion from Firebase Auth</strong>
          . This action cannot be undone. Orphaned users are Firebase Auth accounts without
          corresponding Firestore AppUser records, typically created during failed signup attempts
          or system errors.
        </Alert>,
        <Alert key="info" icon={<IconAlertCircle size={16} />} color="yellow" variant="light">
          <Stack gap="xs">
            <Text fw={600} size="sm">
              What are orphaned users?
            </Text>
            <Text size="sm">
              Firebase Auth users without corresponding AppUser records in Firestore. Usually caused
              by failed signups or race conditions.
            </Text>
          </Stack>
        </Alert>,
      ]}
    >
      <Stack gap="md">
        {externalErrors.length > 0 && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
            <Stack gap="xs">
              {externalErrors.map((error, idx) => (
                <Text key={idx} size="sm">
                  {error}
                </Text>
              ))}
            </Stack>
          </Alert>
        )}

        {orphanedUsers.length === 0 ? (
          <Alert icon={<IconAlertCircle size={32} />} color="green" variant="light">
            <Stack gap="xs">
              <Text fw={600} size="sm">
                No Orphaned Users
              </Text>
              <Text size="sm">Your system is healthy - no orphaned Firebase Auth users found</Text>
            </Stack>
          </Alert>
        ) : (
          <Stack gap="md">
            <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
              <Text size="sm">
                Found {orphanedUsers.length} orphaned user{orphanedUsers.length !== 1 ? 's' : ''}{' '}
                that need cleanup
              </Text>
            </Alert>

            <Stack gap="sm">
              {orphanedUsers.map((user: AppUser) => (
                <div
                  key={user.id}
                  style={{
                    padding: 12,
                    borderRadius: 6,
                    border: '1px solid var(--mantine-color-red-3)',
                  }}
                >
                  <Group justify="space-between" align="flex-start">
                    <div style={{ flex: 1 }}>
                      <Group gap="xs" mb={4}>
                        <Text fw={600} size="sm">
                          {user.email}
                        </Text>
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
                Cleanup will permanently delete the Firebase Auth user. This is safe - the user
                cannot sign in anyway without an AppUser record.
              </Text>
            </Alert>
          </Stack>
        )}
      </Stack>
    </RNGPageContent>
  );
}
