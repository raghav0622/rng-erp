'use client';

import {
  Button,
  Group,
  Paper,
  Stack,
  Text,
  type ButtonProps,
  type PaperProps,
} from '@mantine/core';
import type { ReactNode } from 'react';

export interface RNGActionPanelProps extends Omit<PaperProps, 'children'> {
  icon?: ReactNode;
  title?: ReactNode;
  message?: ReactNode;
  severity?: 'red' | 'yellow' | 'blue' | 'green' | 'gray';
  compact?: boolean;
  action?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  actionProps?: ButtonProps;
}

export function RNGActionPanel({
  icon,
  title,
  message,
  severity,
  compact = false,
  action,
  actionLabel,
  onAction,
  actionProps,
  ...props
}: RNGActionPanelProps) {
  const isTextMessage = typeof message === 'string' || typeof message === 'number';
  const withBorder = props.withBorder ?? true;
  const padding = compact ? 'sm' : 'md';
  const textSize = compact ? 'xs' : 'sm';
  const titleSize = compact ? 'xs' : 'sm';
  const groupGap = compact ? 'sm' : 'md';
  const stackGap = compact ? 2 : 4;
  const severityBg = severity ? `var(--mantine-color-${severity}-light)` : undefined;
  const severityBorder = severity ? `var(--mantine-color-${severity}-light-border)` : undefined;
  const resolvedStyle = severityBorder
    ? { borderColor: severityBorder, ...props.style }
    : props.style;

  return (
    <Paper
      p={padding}
      radius="md"
      withBorder={withBorder}
      bg={severityBg}
      style={resolvedStyle}
      {...props}
    >
      <Group justify="space-between" align="flex-start" gap={groupGap} wrap="nowrap">
        <Group align="flex-start" gap="sm" wrap="nowrap">
          {icon}
          <Stack gap={stackGap}>
            {title && (
              <Text size={titleSize} fw={600}>
                {title}
              </Text>
            )}
            {message &&
              (isTextMessage ? (
                <Text size={textSize} c="dimmed">
                  {message}
                </Text>
              ) : (
                message
              ))}
          </Stack>
        </Group>

        {action ||
          (actionLabel && onAction && (
            <Button
              size={compact ? 'xs' : 'sm'}
              variant="light"
              onClick={onAction}
              {...actionProps}
            >
              {actionLabel}
            </Button>
          ))}
      </Group>
    </Paper>
  );
}
