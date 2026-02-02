'use client';

import { Center, Loader, Stack, Text } from '@mantine/core';
import type { ReactNode } from 'react';

export interface AuthLoadingOverlayProps {
  /**
   * Loading message to display
   * @default "Loading..."
   */
  message?: string;
  /**
   * Additional description text
   */
  description?: string;
  /**
   * Custom icon/content above message
   */
  icon?: ReactNode;
  /**
   * Full height container
   * @default true
   */
  fullHeight?: boolean;
}

/**
 * Consistent loading overlay for auth operations
 *
 * @example
 * <AuthLoadingOverlay message="Signing in..." />
 */
export function AuthLoadingOverlay({
  message = 'Loading...',
  description,
  icon,
  fullHeight = true,
}: AuthLoadingOverlayProps) {
  return (
    <Center style={{ minHeight: fullHeight ? '100dvh' : '400px' }}>
      <Stack gap="md" align="center">
        {icon || <Loader size="lg" />}
        <Stack gap="xs" align="center">
          <Text fw={600}>{message}</Text>
          {description && (
            <Text size="sm" c="dimmed">
              {description}
            </Text>
          )}
        </Stack>
      </Stack>
    </Center>
  );
}
