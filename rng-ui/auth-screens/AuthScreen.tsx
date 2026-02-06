'use client';

import { Container, Loader, Stack, StackProps, Text } from '@mantine/core';
import { ReactNode } from 'react';

export interface AuthScreenProps extends Omit<StackProps, 'children'> {
  /** Main content to display */
  children?: ReactNode;
  /** Screen title */
  title?: string;
  /** Screen description */
  description?: ReactNode;
  /** Show loading overlay */
  isLoading?: boolean;
  /** Loading message to display */
  loadingMessage?: string;
  /** Container size (default: "sm") */
  containerSize?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Custom padding (default: 0) */
  containerPadding?: string | number;
  /** Gap between Stack items (default: "md") */
  gap?: string | number;
  /** Align Stack items (default: "stretch") */
  align?: 'center' | 'flex-start' | 'flex-end' | 'stretch' | 'baseline';
}

/**
 * Base component for all authentication screens.
 * Provides common layout, loading states, and styling for sign-in, sign-up, etc.
 *
 * Usage:
 * ```tsx
 * <AuthScreen isLoading={isPending}>
 *   <YourFormContent />
 * </AuthScreen>
 * ```
 */
export function AuthScreen({
  children,
  title,
  description,
  isLoading = false,
  loadingMessage = 'Loading...',
  containerSize = 'xs',
  containerPadding = 0,
  gap = 'md',
  align = 'stretch',
  ...stackProps
}: AuthScreenProps) {
  if (isLoading) {
    return (
      <Container size={containerSize} py={containerPadding}>
        <Stack gap={gap} align="center" justify="center">
          <Loader size="lg" />
          {loadingMessage && <Text>{loadingMessage}</Text>}
        </Stack>
      </Container>
    );
  }

  return (
    <Container
      size={containerSize}
      py={containerPadding}
      px="md"
      style={{ display: 'flex', alignItems: 'center' }}
    >
      <Stack gap={gap} align={align} style={{ width: '100%' }} {...stackProps}>
        {(title || description) && (
          <Stack gap="xs" align="center" mb="lg">
            {title && <div style={{ fontSize: '24px', fontWeight: 600 }}>{title}</div>}
            {description && (
              <div style={{ fontSize: '14px', color: 'var(--mantine-color-gray-6)' }}>
                {description}
              </div>
            )}
          </Stack>
        )}
        {children}
      </Stack>
    </Container>
  );
}
