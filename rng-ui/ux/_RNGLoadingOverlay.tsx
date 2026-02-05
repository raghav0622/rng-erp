'use client';

import { Center, Loader, Stack, Text } from '@mantine/core';
import type { ReactNode } from 'react';

export interface RNGLoadingOverlayProps {
  message?: string;
  description?: string;
  icon?: ReactNode;
  fullHeight?: boolean;
}

export function RNGLoadingOverlay({
  message = 'Loading...',
  description,
  icon,
  fullHeight = true,
}: RNGLoadingOverlayProps) {
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
