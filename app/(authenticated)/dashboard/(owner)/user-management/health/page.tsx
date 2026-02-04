'use client';

import {
  useIsOwnerBootstrapped,
  useListOrphanedUsers,
  useListUsers,
} from '@/rng-platform/rng-auth/app-auth-hooks';
import { RNGPageContent } from '@/rng-ui/RNGPageContent';
import {
  Alert,
  Badge,
  Button,
  Card,
  Center,
  Group,
  Loader,
  Paper,
  Progress,
  Stack,
  Text,
} from '@mantine/core';
import { IconAlertCircle, IconCheck, IconClock, IconRefresh, IconX } from '@tabler/icons-react';
import Link from 'next/link';
import { Suspense } from 'react';

/**
 * User Management - System Health Dashboard
 * Owner-only page for monitoring auth system health
 */
export default function HealthDashboardPage() {
  return (
    <Suspense
      fallback={
        <Center h={400}>
          <Loader />
        </Center>
      }
    >
      <HealthDashboardContent />
    </Suspense>
  );
}

function HealthDashboardContent() {
  const { data: users, refetch: refetchUsers, isRefetching } = useListUsers();
  const { data: orphanedUsers, refetch: refetchOrphaned } = useListOrphanedUsers();
  const { data: isOwnerBootstrapped } = useIsOwnerBootstrapped();

  const allUsers = users || [];
  const orphaned = orphanedUsers || [];

  // Calculate statistics
  const totalUsers = allUsers.length;
  const activeUsers = allUsers.filter((u) => !u.isDisabled).length;
  const disabledUsers = allUsers.filter((u) => u.isDisabled).length;
  const invitedUsers = allUsers.filter((u) => u.inviteStatus === 'invited').length;
  const activatedUsers = allUsers.filter((u) => u.inviteStatus === 'activated').length;
  const revokedUsers = allUsers.filter((u) => u.inviteStatus === 'revoked').length;
  const unverifiedEmails = allUsers.filter((u) => !u.emailVerified).length;
  const orphanedCount = orphaned.length;

  // Health score (0-100)
  const healthScore = Math.max(
    0,
    100 -
      orphanedCount * 10 - // -10 per orphaned user
      invitedUsers * 2 - // -2 per pending invite
      disabledUsers * 1, // -1 per disabled user
  );

  const healthColor = healthScore >= 80 ? 'green' : healthScore >= 60 ? 'yellow' : 'red';
  const healthLabel =
    healthScore >= 80 ? 'Healthy' : healthScore >= 60 ? 'Fair' : 'Needs Attention';

  const handleRefreshAll = () => {
    refetchUsers();
    refetchOrphaned();
  };

  return (
    <RNGPageContent
      title="System Health Dashboard"
      description="Monitor authentication system health, user statistics, and detect issues"
      actions={
        <Button
          leftSection={<IconRefresh size={16} />}
          variant="light"
          onClick={handleRefreshAll}
          loading={isRefetching}
        >
          Refresh Data
        </Button>
      }
    >
      <Stack gap="md">
        {/* Health Score Card */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="md">
            <Group justify="space-between">
              <div>
                <Text size="sm" c="dimmed">
                  Overall Health Score
                </Text>
                <Group gap="sm" align="baseline">
                  <Text size="xl" fw={700}>
                    {healthScore}
                  </Text>
                  <Text size="sm" c="dimmed">
                    / 100
                  </Text>
                </Group>
              </div>

              <Badge color={healthColor} size="lg" variant="light">
                {healthLabel}
              </Badge>
            </Group>

            <Progress value={healthScore} color={healthColor} size="lg" />

            <Text size="xs" c="dimmed">
              Based on orphaned users, pending invites, and disabled accounts
            </Text>
          </Stack>
        </Card>

        {/* System Status */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="md">
            <Text size="lg" fw={600}>
              System Status
            </Text>

            <Group grow>
              <Paper p="md" radius="md" withBorder>
                <Stack gap="xs">
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                    Owner Bootstrap
                  </Text>
                  {isOwnerBootstrapped ? (
                    <Group gap="xs">
                      <IconCheck size={16} color="var(--mantine-color-green-6)" />
                      <Text size="sm" fw={600}>
                        Complete
                      </Text>
                    </Group>
                  ) : (
                    <Group gap="xs">
                      <IconClock size={16} color="var(--mantine-color-yellow-6)" />
                      <Text size="sm" fw={600}>
                        Pending
                      </Text>
                    </Group>
                  )}
                </Stack>
              </Paper>

              <Paper p="md" radius="md" withBorder>
                <Stack gap="xs">
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                    Total Users
                  </Text>
                  <Text size="xl" fw={700}>
                    {totalUsers}
                  </Text>
                </Stack>
              </Paper>

              <Paper p="md" radius="md" withBorder>
                <Stack gap="xs">
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                    Active Users
                  </Text>
                  <Text size="xl" fw={700} c="green">
                    {activeUsers}
                  </Text>
                </Stack>
              </Paper>
            </Group>
          </Stack>
        </Card>

        {/* Issues & Warnings */}
        {(orphanedCount > 0 || invitedUsers > 5 || unverifiedEmails > 10) && (
          <Stack gap="sm">
            {orphanedCount > 0 && (
              <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
                <Stack gap="xs">
                  <Text fw={600} size="sm">
                    {orphanedCount} Orphaned User{orphanedCount > 1 ? 's' : ''} Detected
                  </Text>
                  <Text size="sm">
                    These users have Firebase Auth accounts but no linked AppUser records. Cleanup
                    recommended.
                  </Text>
                  <Button
                    component={Link}
                    href="/dashboard/user-management/orphaned-cleanup"
                    size="xs"
                    variant="light"
                  >
                    Go to Cleanup
                  </Button>
                </Stack>
              </Alert>
            )}

            {invitedUsers > 5 && (
              <Alert icon={<IconClock size={16} />} color="yellow" variant="light">
                <Text size="sm">
                  {invitedUsers} pending invites. Consider following up with invited users.
                </Text>
              </Alert>
            )}

            {unverifiedEmails > 10 && (
              <Alert icon={<IconX size={16} />} color="yellow" variant="light">
                <Text size="sm">
                  {unverifiedEmails} users have unverified emails. Email verification reminders may
                  be needed.
                </Text>
              </Alert>
            )}
          </Stack>
        )}

        {/* User Breakdown */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="md">
            <Text size="lg" fw={600}>
              User Breakdown
            </Text>

            <Group grow>
              <Paper p="md" radius="md" withBorder>
                <Stack gap="xs">
                  <Text size="xs" c="dimmed">
                    Activated
                  </Text>
                  <Text size="xl" fw={700} c="green">
                    {activatedUsers}
                  </Text>
                </Stack>
              </Paper>

              <Paper p="md" radius="md" withBorder>
                <Stack gap="xs">
                  <Text size="xs" c="dimmed">
                    Invited
                  </Text>
                  <Text size="xl" fw={700} c="blue">
                    {invitedUsers}
                  </Text>
                </Stack>
              </Paper>

              <Paper p="md" radius="md" withBorder>
                <Stack gap="xs">
                  <Text size="xs" c="dimmed">
                    Revoked
                  </Text>
                  <Text size="xl" fw={700} c="red">
                    {revokedUsers}
                  </Text>
                </Stack>
              </Paper>

              <Paper p="md" radius="md" withBorder>
                <Stack gap="xs">
                  <Text size="xs" c="dimmed">
                    Disabled
                  </Text>
                  <Text size="xl" fw={700} c="gray">
                    {disabledUsers}
                  </Text>
                </Stack>
              </Paper>
            </Group>
          </Stack>
        </Card>

        {/* All Systems Operational */}
        {orphanedCount === 0 && invitedUsers <= 5 && unverifiedEmails <= 10 && (
          <Alert icon={<IconCheck size={16} />} color="green" variant="light">
            <Text fw={600} size="sm">
              All Systems Operational
            </Text>
            <Text size="sm">No issues detected. Auth system is healthy.</Text>
          </Alert>
        )}
      </Stack>
    </RNGPageContent>
  );
}
