'use client';

import { Box, Group, Paper, Stack, Text, Title } from '@mantine/core';
import type { ReactNode } from 'react';

export interface RNGPageContentProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  warnings?: ReactNode | ReactNode[];
  children: ReactNode;
  footer?: ReactNode;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  withPaper?: boolean;
  padding?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export function RNGPageContent({
  title,
  description,
  actions,
  warnings,
  children,
  footer,
  size = 'xl',
  withPaper = false,
  padding = 'md',
}: RNGPageContentProps) {
  const content = (
    <Stack gap="md">
      {/* Header with title, description, and actions */}
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Box style={{ flex: 1 }}>
          <Title order={1} size="h2" mb={description ? 'xs' : 0}>
            {title}
          </Title>
          {description && (
            <Text size="sm" c="dimmed">
              {description}
            </Text>
          )}
        </Box>
        {actions && <Group gap="sm">{actions}</Group>}
      </Group>

      {/* Warnings/Alerts section */}
      {warnings && (
        <Stack gap="sm">
          {Array.isArray(warnings)
            ? warnings.map((warning, idx) => <Box key={idx}>{warning}</Box>)
            : warnings}
        </Stack>
      )}

      {/* Main content */}
      <Box>{children}</Box>

      {/* Footer */}
      {footer && <Box mt="xl">{footer}</Box>}
    </Stack>
  );

  const wrappedContent = withPaper ? (
    <Paper px={padding} shadow="sm" withBorder>
      {content}
    </Paper>
  ) : (
    content
  );

  return (
    <Box
      maw={
        size === 'xl'
          ? 1280
          : size === 'lg'
            ? 1024
            : size === 'md'
              ? 768
              : size === 'sm'
                ? 640
                : 480
      }
      mx="auto"
      w="100%"
      style={{ overflow: 'hidden' }}
    >
      {wrappedContent}
    </Box>
  );
}
