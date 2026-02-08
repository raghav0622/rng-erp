'use client';

import { Alert, Text, type AlertProps } from '@mantine/core';
import type { ReactNode } from 'react';

export interface RNGMessageAlertProps extends Omit<AlertProps, 'children'> {
  message: ReactNode;
  tone?: 'red' | 'yellow' | 'blue' | 'green' | 'gray';
}

export function RNGMessageAlert({ message, tone, ...props }: RNGMessageAlertProps) {
  const isTextMessage = typeof message === 'string' || typeof message === 'number';
  const color = props.color ?? tone;
  const variant = props.variant ?? (tone ? 'light' : props.variant);

  return (
    <Alert {...props} color={color} variant={variant}>
      {isTextMessage ? <Text size="sm">{message}</Text> : message}
    </Alert>
  );
}
