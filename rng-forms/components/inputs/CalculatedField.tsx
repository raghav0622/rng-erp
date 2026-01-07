'use client';

import { Paper, Stack, Text } from '@mantine/core';
import { useEffect, useMemo } from 'react';
import { useFormContext, useWatch, type Control, type FieldValues } from 'react-hook-form';
import type { CalculatedInputItem } from '../../types/core';

interface BaseFieldProps<TValues extends FieldValues> {
  control: Control<TValues>;
  error?: string;
}

export default function CalculatedField<TValues extends FieldValues>(
  props: CalculatedInputItem<TValues> & BaseFieldProps<TValues>,
) {
  const { control, label, description, name } = props;
  const { setValue } = useFormContext<TValues>();

  // Watch all values in the form to auto-update calculated field
  const formValues = useWatch({ control }) as TValues;

  const calculation = (props as any).calculation as (values: TValues) => string | number;
  const formatFn = (props as any).formatFn as ((value: string | number) => string) | undefined;
  const format = (props as any).format;

  const { rawResult, displayValue, isError } = useMemo(() => {
    try {
      if (!calculation || typeof calculation !== 'function') {
        return { rawResult: null, displayValue: 'Invalid calculation function', isError: true };
      }

      // Determine the correct scope for calculation
      // If name is like "items.0.total", we need to pass the item at index 0
      // If name is like "grandTotal", we pass the full form values
      let scopedValues: any = formValues;
      const nameParts = String(name).split('.');

      if (nameParts.length > 1) {
        // Navigate to the parent scope (e.g., for "items.0.total", get items[0])
        const parentPath = nameParts.slice(0, -1);
        let current: any = formValues;

        for (const part of parentPath) {
          if (current === undefined || current === null) break;
          current = current[part];
        }

        scopedValues = current || {};
      }

      const result = calculation(scopedValues);

      if (formatFn && typeof formatFn === 'function') {
        return { rawResult: result, displayValue: formatFn(result), isError: false };
      }

      let formatted: any = result;
      if (format && typeof result === 'number') {
        if (format.type === 'percent') {
          formatted = `${(result * 100).toFixed(format.decimals ?? 2)}%`;
        } else if (format.type === 'currency') {
          const locale = format.locale ?? 'en-US';
          const currency = format.currency ?? 'USD';
          formatted = new Intl.NumberFormat(locale, {
            style: 'currency',
            currency,
            minimumFractionDigits: format.decimals ?? 2,
            maximumFractionDigits: format.decimals ?? 2,
          }).format(result);
        } else if (format.type === 'decimal') {
          formatted = result.toFixed(format.decimals ?? 2);
        }
      }
      return { rawResult: result, displayValue: formatted, isError: false };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Calculation error';
      return { rawResult: null, displayValue: `Error: ${message}`, isError: true };
    }
  }, [calculation, formValues, formatFn, format]);

  useEffect(() => {
    if (isError) return;
    if (rawResult === undefined || rawResult === null) return;
    setValue(name as any, rawResult as any, { shouldDirty: false, shouldValidate: false });
  }, [isError, name, rawResult, setValue]);

  return (
    <Stack gap="sm">
      {label && (
        <Text size="sm" fw={600}>
          {label}
        </Text>
      )}

      <Paper p="md" radius="md" withBorder bg="var(--mantine-color-gray-0)">
        <Text size="sm" fw={500}>
          {displayValue !== null ? displayValue : '—'}
        </Text>
      </Paper>

      {description && (
        <Text size="xs" c="dimmed">
          {description}
        </Text>
      )}
    </Stack>
  );
}
