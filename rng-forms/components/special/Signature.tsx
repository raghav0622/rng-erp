'use client';

import { ActionIcon, Box, Group, Text } from '@mantine/core';

import { IconEraser } from '@tabler/icons-react';
import { useRef } from 'react';
import { useController, type Control, type FieldValues } from 'react-hook-form';
import SignatureCanvas from 'react-signature-canvas';
import type { SignatureInputItem } from '../../types/core';

interface BaseFieldProps<TValues extends FieldValues> {
  control: Control<TValues>;
  error?: string;
}

export default function Signature<TValues extends FieldValues>(
  props: SignatureInputItem<TValues> & BaseFieldProps<TValues>,
) {
  const { control, name, label, description, disabled, error } = props;
  const { field, fieldState } = useController({ name, control });
  const mergedError = error ?? fieldState.error?.message;
  const signatureRef = useRef<SignatureCanvas | null>(null);

  const handleClear = () => {
    if (signatureRef.current) {
      signatureRef.current.clear();
    }
    field.onChange('');
  };

  return (
    <Box>
      {label && (
        <Group justify="space-between" mb={6} gap="xs">
          <Text size="sm" fw={600}>
            {label}
          </Text>
          <ActionIcon
            variant="light"
            size="sm"
            onClick={handleClear}
            disabled={disabled}
            aria-label="Clear signature"
          >
            <IconEraser size={16} />
          </ActionIcon>
        </Group>
      )}

      <Box
        style={{
          border: '1px solid var(--mantine-color-gray-4)',
          borderRadius: 8,
          overflow: 'hidden',
          background: '#fff',
        }}
        role="img"
        aria-label={label || 'Signature canvas'}
        aria-invalid={!!mergedError}
      >
        <SignatureCanvas
          ref={signatureRef}
          canvasProps={
            {
              width: 500,
              height: 200,
              style: { width: '100%', height: 200, display: 'block', cursor: 'crosshair' },
              'aria-label': 'Sign here',
            } as any
          }
          onEnd={() => {
            const data = signatureRef.current?.toDataURL() ?? '';
            field.onChange(data);
          }}
          penColor="black"
        />
      </Box>

      {description && (
        <Text size="xs" c="dimmed" mt={4}>
          {description}
        </Text>
      )}
      {mergedError && (
        <Text size="xs" c="red" mt={4} role="alert">
          {mergedError}
        </Text>
      )}
    </Box>
  );
}
