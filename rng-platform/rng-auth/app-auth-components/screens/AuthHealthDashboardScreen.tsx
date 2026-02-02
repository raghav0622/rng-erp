'use client';

import { Alert, Badge, Button, Card, Group, Paper, Progress, Stack, Text } from '@mantine/core';
import {
  IconAlertCircle,
  IconCheck,
  IconClock,
  IconRefresh,
  IconUsers,
  IconX,
} from '@tabler/icons-react';
import { Suspense } from 'react';
import { useIsOwnerBootstrapped, useListOrphanedUsers, useListUsers } from '../../app-auth-hooks';
import { AuthLoadingOverlay } from '../boundaries/AuthLoadingOverlay';
import { ScreenContainer, ScreenHeader } from '../shared/ScreenComponents';

export interface AuthHealthDashboardScreenProps {
  onNavigateToCleanup?: () => void;
}

/**
 * Auth Health Dashboard Screen
 *
 * Owner-only health monitoring dashboard for auth system:
 * - System status overview
 * - User statistics
 * - Orphaned users detection
 * - Invite status breakdown
 * - System health indicators
 *
 * Features:
 * - Real-time stats
 * - Health score calculation
 * - Issue detection
 * - Quick actions
 * - Suspense-friendly
 *
 * @example
 * ```tsx
 * <AuthHealthDashboardScreen
 *   onNavigateToCleanup={() => router.push('/auth/orphaned-cleanup')}
 * />
 * ```
 */
export function AuthHealthDashboardScreen({ onNavigateToCleanup }: AuthHealthDashboardScreenProps) {
  return (
    <Suspense fallback={<AuthLoadingOverlay message="Loading health dashboard..." />}>
      <AuthHealthDashboardScreenInner onNavigateToCleanup={onNavigateToCleanup} />
    </Suspense>
  );
}

function AuthHealthDashboardScreenInner({ onNavigateToCleanup }: AuthHealthDashboardScreenProps) {
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
    <ScreenContainer>
      <ScreenHeader
        title="Auth System Health"
        description="Monitor user system health and detect issues"
        icon={IconUsers}
      />

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
            <Group justify="space-between">
              <Text size="lg" fw={600}>
                System Status
              </Text>
              <Button
                variant="subtle"
                size="xs"
                leftSection={<IconRefresh size={14} />}
                onClick={handleRefreshAll}
                loading={isRefetching}
              >
                Refresh
              </Button>
            </Group>

            <Group>
              <Paper
                p="md"
                radius="md"
                style={{ flex: 1, backgroundColor: 'var(--mantine-color-gray-0)' }}
              >
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

              <Paper
                p="md"
                radius="md"
                style={{ flex: 1, backgroundColor: 'var(--mantine-color-gray-0)' }}
              >
                <Stack gap="xs">
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                    Total Users
                  </Text>
                  <Text size="xl" fw={700}>
                    {totalUsers}
                  </Text>
                </Stack>
              </Paper>

              <Paper
                p="md"
                radius="md"
                style={{ flex: 1, backgroundColor: 'var(--mantine-color-gray-0)' }}
              >
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
                  {onNavigateToCleanup && (
                    <Button size="xs" variant="light" onClick={onNavigateToCleanup}>
                      Go to Cleanup
                    </Button>
                  )}
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

        {orphanedCount === 0 && invitedUsers <= 5 && unverifiedEmails <= 10 && (
          <Alert icon={<IconCheck size={16} />} color="green" variant="light">
            <Text fw={600} size="sm">
              All Systems Operational
            </Text>
            <Text size="sm">No issues detected. Auth system is healthy.</Text>
          </Alert>
        )}
      </Stack>
    </ScreenContainer>
  );
}

export default AuthHealthDashboardScreen;
