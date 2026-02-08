'use client';

import type { AppUser } from '@/rng-platform/rng-auth/app-auth-service/internal-app-user-service/app-user.contracts';
import { RNGActionPanel, RNGMessageAlert, RNGPageContent } from '@/rng-ui/ux';
import { Button, Group, Paper, Stack, Text } from '@mantine/core';
import { IconAlertCircle, IconAlertTriangle, IconRefresh, IconTrash } from '@tabler/icons-react';

export interface OrphanedCleanupViewProps {
  orphanedUsers: AppUser[];
  externalErrors: string[];
  cleaningUserId: string | null;
  onCleanup: (userId: string) => void;
  onRefresh: () => void;
}

export function OrphanedCleanupView({
  orphanedUsers,
  externalErrors,
  cleaningUserId,
  onCleanup,
  onRefresh,
}: OrphanedCleanupViewProps) {
  const formatShortDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <RNGPageContent
      title="Orphaned Users Cleanup"
      description="Clean up Firebase Auth users without corresponding Firestore records"
      actions={
        <Button leftSection={<IconRefresh size={16} />} variant="light" onClick={onRefresh}>
          Refresh
        </Button>
      }
      warnings={[
        <RNGActionPanel
          key="main-warning"
          icon={<IconAlertTriangle size={20} />}
          title="Permanent Deletion Warning"
          severity="red"
          compact
          message={
            <Text size="sm" c="dimmed">
              Cleaning up orphaned users performs{' '}
              <strong>permanent deletion from Firebase Auth</strong>. This action cannot be undone.
              Orphaned users are Firebase Auth accounts without corresponding Firestore AppUser
              records, typically created during failed signup attempts or system errors.
            </Text>
          }
        />,
        <RNGActionPanel
          key="info"
          icon={<IconAlertCircle size={16} />}
          title="What are orphaned users?"
          severity="yellow"
          compact
          message={
            <Text size="sm" c="dimmed">
              Firebase Auth users without corresponding AppUser records in Firestore. Usually caused
              by failed signups or race conditions.
            </Text>
          }
        />,
      ]}
    >
      <Stack gap="md">
        {externalErrors.length > 0 && (
          <RNGMessageAlert
            icon={<IconAlertCircle size={16} />}
            tone="red"
            message={
              <Stack gap="xs">
                {externalErrors.map((error, idx) => (
                  <Text key={idx} size="sm">
                    {error}
                  </Text>
                ))}
              </Stack>
            }
          />
        )}

        {orphanedUsers.length === 0 ? (
          <RNGMessageAlert
            icon={<IconAlertCircle size={32} />}
            tone="green"
            title="No Orphaned Users"
            message="Your system is healthy - no orphaned Firebase Auth users found"
          />
        ) : (
          <Stack gap="md">
            <RNGMessageAlert
              icon={<IconAlertCircle size={16} />}
              tone="red"
              message={`Found ${orphanedUsers.length} orphaned user${orphanedUsers.length !== 1 ? 's' : ''} that need cleanup`}
            />

            <Stack gap="sm">
              {orphanedUsers.map((user) => (
                <Paper key={user.id} p="sm" radius="md" withBorder bg="red" variant="light">
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
                      onClick={() => onCleanup(user.id)}
                      loading={cleaningUserId === user.id}
                      disabled={cleaningUserId !== null}
                      leftSection={<IconTrash size={14} />}
                    >
                      {cleaningUserId === user.id ? 'Cleaning...' : 'Cleanup'}
                    </Button>
                  </Group>
                </Paper>
              ))}
            </Stack>

            <RNGMessageAlert
              icon={<IconAlertCircle size={16} />}
              tone="blue"
              message="Cleanup will permanently delete the Firebase Auth user. This is safe - the user cannot sign in anyway without an AppUser record."
            />
          </Stack>
        )}
      </Stack>
    </RNGPageContent>
  );
}
