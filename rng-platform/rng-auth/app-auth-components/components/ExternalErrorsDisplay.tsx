'use client';

import { Alert, Stack, Text } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';

export interface ExternalErrorsDisplayProps {
  errors: string[];
  onDismiss?: () => void;
  title?: string;
}

/**
 * Reusable external errors display component
 * Eliminates 5-10 lines of Alert/Stack boilerplate per screen
 *
 * @example
 * <ExternalErrorsDisplay
 *   errors={externalErrors}
 *   onDismiss={() => setExternalErrors([])}
 * />
 */
export function ExternalErrorsDisplay({
  errors,
  onDismiss,
  title = 'An error occurred',
}: ExternalErrorsDisplayProps) {
  if (!errors || errors.length === 0) {
    return null;
  }

  return (
    <Alert
      icon={<IconAlertCircle size={16} />}
      title={title}
      color="red"
      variant="light"
      onClose={onDismiss}
    >
      <Stack gap="xs">
        {errors.map((error, idx) => (
          <Text key={idx} size="sm">
            {error}
          </Text>
        ))}
      </Stack>
    </Alert>
  );
}

export default ExternalErrorsDisplay;
