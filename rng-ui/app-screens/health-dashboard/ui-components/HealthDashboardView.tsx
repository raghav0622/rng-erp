'use client';

import { RNGActionPanel, RNGMessageAlert, RNGMetricCard, RNGPageContent } from '@/rng-ui/ux';
import { Badge, Button, Card, Group, Progress, Stack, Text } from '@mantine/core';
import { IconAlertCircle, IconCheck, IconClock, IconRefresh, IconX } from '@tabler/icons-react';
import Link from 'next/link';

export interface HealthDashboardViewProps {
  isOwnerBootstrapped: boolean | undefined;
  isRefetching: boolean;
  totalUsers: number;
  activeUsers: number;
  disabledUsers: number;
  invitedUsers: number;
  activatedUsers: number;
  revokedUsers: number;
  unverifiedEmails: number;
  orphanedCount: number;
  healthScore: number;
  healthColor: 'green' | 'yellow' | 'red';
  healthLabel: string;
  onRefresh: () => void;
}

export function HealthDashboardView({
  isOwnerBootstrapped,
  isRefetching,
  totalUsers,
  activeUsers,
  disabledUsers,
  invitedUsers,
  activatedUsers,
  revokedUsers,
  unverifiedEmails,
  orphanedCount,
  healthScore,
  healthColor,
  healthLabel,
  onRefresh,
}: HealthDashboardViewProps) {
  return (
    <RNGPageContent
      title="System Health Dashboard"
      description="Monitor authentication system health, user statistics, and detect issues"
      actions={
        <Button
          leftSection={<IconRefresh size={16} />}
          variant="light"
          onClick={onRefresh}
          loading={isRefetching}
        >
          Refresh Data
        </Button>
      }
    >
      <Stack gap="md">
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

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="md">
            <Text size="lg" fw={600}>
              System Status
            </Text>

            <Group grow>
              <RNGMetricCard
                label="Owner Bootstrap"
                value={
                  isOwnerBootstrapped ? (
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
                  )
                }
              />
              <RNGMetricCard label="Total Users" value={totalUsers} />
              <RNGMetricCard label="Active Users" value={activeUsers} valueProps={{ c: 'green' }} />
            </Group>
          </Stack>
        </Card>

        {(orphanedCount > 0 || invitedUsers > 5 || unverifiedEmails > 10) && (
          <Stack gap="sm">
            {orphanedCount > 0 && (
              <RNGActionPanel
                icon={<IconAlertCircle size={16} />}
                title={`${orphanedCount} Orphaned User${orphanedCount > 1 ? 's' : ''} Detected`}
                message="These users have Firebase Auth accounts but no linked AppUser records. Cleanup recommended."
                compact
                action={
                  <Button
                    component={Link}
                    href="/dashboard/user-management/orphaned-cleanup"
                    size="xs"
                    variant="light"
                  >
                    Go to Cleanup
                  </Button>
                }
              />
            )}

            {invitedUsers > 5 && (
              <RNGMessageAlert
                icon={<IconClock size={16} />}
                tone="yellow"
                message={`${invitedUsers} pending invites. Consider following up with invited users.`}
              />
            )}

            {unverifiedEmails > 10 && (
              <RNGMessageAlert
                icon={<IconX size={16} />}
                tone="yellow"
                message={`${unverifiedEmails} users have unverified emails. Email verification reminders may be needed.`}
              />
            )}
          </Stack>
        )}

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="md">
            <Text size="lg" fw={600}>
              User Breakdown
            </Text>

            <Group grow>
              <RNGMetricCard label="Activated" value={activatedUsers} valueProps={{ c: 'green' }} />
              <RNGMetricCard label="Invited" value={invitedUsers} valueProps={{ c: 'blue' }} />
              <RNGMetricCard label="Revoked" value={revokedUsers} valueProps={{ c: 'red' }} />
              <RNGMetricCard label="Disabled" value={disabledUsers} valueProps={{ c: 'gray' }} />
            </Group>
          </Stack>
        </Card>

        {orphanedCount === 0 && invitedUsers <= 5 && unverifiedEmails <= 10 && (
          <RNGMessageAlert
            icon={<IconCheck size={16} />}
            tone="green"
            title="All Systems Operational"
            message="No issues detected. Auth system is healthy."
          />
        )}
      </Stack>
    </RNGPageContent>
  );
}
