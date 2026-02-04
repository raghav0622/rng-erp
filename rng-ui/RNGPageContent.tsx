'use client';

import { Box, Group, Paper, Stack, Text, Title } from '@mantine/core';
import type { ReactNode } from 'react';

export interface RNGPageContentProps {
  /**
   * Page title
   */
  title: string;

  /**
   * Optional page description
   */
  description?: string;

  /**
   * Optional action buttons (e.g., refresh, add new)
   * Displayed in the top-right corner
   */
  actions?: ReactNode;

  /**
   * Optional warnings or alerts
   * Displayed between header and content
   */
  warnings?: ReactNode | ReactNode[];

  /**
   * Main page content
   */
  children: ReactNode;

  /**
   * Optional footer content
   */
  footer?: ReactNode;

  /**
   * Container size (default: 'xl')
   */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';

  /**
   * Whether to wrap content in Paper (default: false)
   */
  withPaper?: boolean;

  /**
   * Custom padding (default: 'xl')
   */
  padding?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * Standardized page content wrapper component
 *
 * Provides consistent structure for all pages:
 * - Title and description in header
 * - Optional action buttons
 * - Optional warnings/alerts
 * - Main content area
 * - Optional footer
 *
 * @example
 * ```tsx
 * <PageContent
 *   title="User Management"
 *   description="Manage users and invitations"
 *   actions={<Button>Add User</Button>}
 *   warnings={<Alert color="yellow">Warning message</Alert>}
 * >
 *   <UserList />
 * </PageContent>
 * ```
 */
export function RNGPageContent({
  title,
  description,
  actions,
  warnings,
  children,
  footer,
  size = 'xl',
  withPaper = false,
  padding = 'xl',
}: RNGPageContentProps) {
  const content = (
    <Stack gap="lg">
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
