'use client';

import { Badge, Button, Card, Code, Collapse, Group, Paper, Stack, Text } from '@mantine/core';
import { IconBug, IconChevronDown, IconChevronUp, IconCopy } from '@tabler/icons-react';
import { useState } from 'react';
import { useAuthSession, useGetLastAuthError, useGetSessionSnapshot } from '../../../rng-auth';

export interface SessionDebugPanelProps {
  /**
   * Show by default (collapsed vs expanded)
   */
  defaultExpanded?: boolean;
  /**
   * Compact mode
   */
  compact?: boolean;
}

/**
 * Session Debug Panel Component
 *
 * Developer tool for inspecting current auth session state.
 * Displays real-time session info, errors, and diagnostics.
 *
 * Features:
 * - Real-time session state
 * - Last error tracking
 * - Session expiry countdown
 * - Copy session JSON
 * - Collapsible UI
 *
 * Usage:
 * Only enable in development or for admins.
 *
 * @example
 * ```tsx
 * {process.env.NODE_ENV === 'development' && (
 *   <SessionDebugPanel defaultExpanded />
 * )}
 * ```
 */
export function SessionDebugPanel({
  defaultExpanded = false,
  compact = false,
}: SessionDebugPanelProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const session = useAuthSession();
  const { data: snapshot } = useGetSessionSnapshot();
  const { data: lastError } = useGetLastAuthError();

  const handleCopySession = () => {
    const data = { session, snapshot, lastError };
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
  };

  const stateColors: Record<string, string> = {
    authenticated: 'green',
    unauthenticated: 'gray',
    authenticating: 'blue',
    unknown: 'yellow',
  };

  return (
    <Card
      shadow="xs"
      padding={compact ? 'sm' : 'md'}
      radius="md"
      withBorder
      style={{
        position: compact ? undefined : 'fixed',
        bottom: compact ? undefined : 16,
        right: compact ? undefined : 16,
        zIndex: compact ? undefined : 100,
        maxWidth: compact ? undefined : 400,
      }}
    >
      <Stack gap="sm">
        <Group justify="space-between">
          <Group gap="xs">
            <IconBug size={16} />
            <Text size="sm" fw={600}>
              Session Debug
            </Text>
          </Group>

          <Group gap="xs">
            <Button
              variant="subtle"
              size="xs"
              onClick={handleCopySession}
              leftSection={<IconCopy size={12} />}
            >
              Copy
            </Button>
            <Button
              variant="subtle"
              size="xs"
              onClick={() => setExpanded(!expanded)}
              rightSection={expanded ? <IconChevronDown size={12} /> : <IconChevronUp size={12} />}
            >
              {expanded ? 'Collapse' : 'Expand'}
            </Button>
          </Group>
        </Group>

        <Collapse in={expanded}>
          <Stack gap="md">
            {/* Session State */}
            <Paper p="xs" withBorder>
              <Stack gap="xs">
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                  Session State
                </Text>
                <Badge color={stateColors[session.state]} variant="light">
                  {session.state}
                </Badge>
              </Stack>
            </Paper>

            {/* User Info */}
            {session.user && (
              <Paper p="xs" withBorder>
                <Stack gap="xs">
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                    Current User
                  </Text>
                  <Text size="xs" fw={500}>
                    {session.user.name}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {session.user.email}
                  </Text>
                  <Group gap="xs">
                    <Badge size="xs">{session.user.role}</Badge>
                    {session.user.emailVerified ? (
                      <Badge size="xs" color="green">
                        Verified
                      </Badge>
                    ) : (
                      <Badge size="xs" color="yellow">
                        Unverified
                      </Badge>
                    )}
                  </Group>
                </Stack>
              </Paper>
            )}

            {/* Session Expiry */}
            {session.sessionExpiresAt && (
              <Paper p="xs" withBorder>
                <Stack gap="xs">
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                    Session Expiry
                  </Text>
                  <Text size="xs">{new Date(session.sessionExpiresAt).toLocaleString()}</Text>
                  <Text size="xs" c="dimmed">
                    {Math.round(
                      (new Date(session.sessionExpiresAt).getTime() - Date.now()) / 1000 / 60,
                    )}{' '}
                    minutes remaining
                  </Text>
                </Stack>
              </Paper>
            )}

            {/* Last Error */}
            {(session.lastAuthError || lastError) && (
              <Paper p="xs" withBorder style={{ borderColor: 'var(--mantine-color-red-4)' }}>
                <Stack gap="xs">
                  <Text size="xs" c="red" tt="uppercase" fw={600}>
                    Last Error
                  </Text>
                  <Code block p="xs" style={{ fontSize: 10 }}>
                    {JSON.stringify(
                      session.lastAuthError || lastError,
                      (key, value) => {
                        if (key === 'error' && value instanceof Error) {
                          return { name: value.name, message: value.message };
                        }
                        return value;
                      },
                      2,
                    )}
                  </Code>
                </Stack>
              </Paper>
            )}

            {/* Last Transition Error */}
            {session.lastTransitionError && (
              <Paper p="xs" withBorder style={{ borderColor: 'var(--mantine-color-yellow-4)' }}>
                <Stack gap="xs">
                  <Text size="xs" c="yellow" tt="uppercase" fw={600}>
                    Last Transition Error
                  </Text>
                  <Text size="xs">
                    {session.lastTransitionError.from} → {session.lastTransitionError.to}
                  </Text>
                  <Code block p="xs" style={{ fontSize: 10 }}>
                    {JSON.stringify(
                      session.lastTransitionError.error instanceof Error
                        ? {
                            name: session.lastTransitionError.error.name,
                            message: session.lastTransitionError.error.message,
                          }
                        : session.lastTransitionError.error,
                      null,
                      2,
                    )}
                  </Code>
                </Stack>
              </Paper>
            )}

            {/* Snapshot */}
            {snapshot && (
              <Paper p="xs" withBorder>
                <Stack gap="xs">
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                    Session Snapshot
                  </Text>
                  <Code block p="xs" style={{ fontSize: 10, maxHeight: 150, overflow: 'auto' }}>
                    {JSON.stringify(snapshot, null, 2)}
                  </Code>
                </Stack>
              </Paper>
            )}
          </Stack>
        </Collapse>
      </Stack>
    </Card>
  );
}

export default SessionDebugPanel;
