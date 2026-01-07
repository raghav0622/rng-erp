'use client';

import { Autocomplete, Button, Group, Stack, Text } from '@mantine/core';
import { evaluate } from 'mathjs';
import { useMemo, useState } from 'react';
import { useController, useFormContext, type Control, type FieldValues } from 'react-hook-form';
import type { MathInputItem } from '../../types/core';

interface BaseFieldProps<TValues extends FieldValues> {
  control: Control<TValues>;
  error?: string;
}

// Common mathjs functions
const MATH_FUNCTIONS = [
  'sqrt',
  'pow',
  'abs',
  'floor',
  'ceil',
  'round',
  'sin',
  'cos',
  'tan',
  'asin',
  'acos',
  'atan',
  'sinh',
  'cosh',
  'tanh',
  'exp',
  'log',
  'log10',
  'min',
  'max',
  'sum',
  'mean',
  'median',
  'std',
  'var',
];

const OPERATORS = ['+', '-', '*', '/', '%', '^', '**', '(', ')'];

export default function MathInputField<TValues extends FieldValues>(
  props: MathInputItem<TValues> & BaseFieldProps<TValues>,
) {
  const { control, name, label, description, disabled, error } = props;
  const formContext = useFormContext<TValues>();
  const { field, fieldState } = useController({ name, control });
  const mergedError = error ?? fieldState.error?.message;
  const [expression, setExpression] = useState<string>('');
  const [result, setResult] = useState<string | number | null>(null);

  // Get all field names from the form
  const fieldNames = useMemo(() => {
    const values = formContext.getValues();
    return Object.keys(values || {});
  }, [formContext]);

  // Generate autocomplete suggestions based on cursor position
  const autocompleteSuggestions = useMemo(() => {
    const suggestions = new Set<string>();

    // Add field names
    fieldNames.forEach((name) => suggestions.add(name));

    // Add math functions
    MATH_FUNCTIONS.forEach((fn) => suggestions.add(`${fn}(`));

    // Add operators
    OPERATORS.forEach((op) => suggestions.add(op));

    return Array.from(suggestions).sort();
  }, [fieldNames]);

  const handleEvaluate = () => {
    try {
      const context = (props as any).scope || {};
      const values = formContext.getValues();
      const fullContext = { ...values, ...context };
      const evaluated = evaluate(expression, fullContext);
      setResult(evaluated);
      field.onChange(evaluated);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid expression';
      setResult(`Error: ${message}`);
    }
  };

  const getFieldNameHint = () => {
    const availableFields = fieldNames.join(', ');
    return availableFields ? `Available fields: ${availableFields}` : '';
  };

  return (
    <Stack gap="sm">
      {label && (
        <Text size="sm" fw={600}>
          {label}
        </Text>
      )}

      <Autocomplete
        placeholder="e.g., price * quantity or sqrt(16)"
        data={autocompleteSuggestions}
        value={expression}
        onChange={(val) => setExpression(val)}
        disabled={disabled}
        maxDropdownHeight={200}
        limit={10}
        error={typeof result === 'string' && result.startsWith('Error')}
      />

      {fieldNames.length > 0 && (
        <Text size="xs" c="dimmed" lineClamp={2}>
          {getFieldNameHint()}
        </Text>
      )}

      <Stack gap={6}>
        <Text size="xs" c="gray" fw={500}>
          Common functions: {MATH_FUNCTIONS.slice(0, 8).join(', ')}...
        </Text>
        <Text size="xs" c="gray" fw={500}>
          Operators: {OPERATORS.join(' ')}
        </Text>
      </Stack>

      <Group gap="sm">
        <Button size="sm" onClick={handleEvaluate} disabled={disabled}>
          Evaluate
        </Button>
        {result !== null && (
          <Text size="sm" fw={500}>
            = {typeof result === 'number' ? result.toFixed(6) : result}
          </Text>
        )}
      </Group>

      {description && (
        <Text size="xs" c="dimmed">
          {description}
        </Text>
      )}
      {mergedError && (
        <Text size="xs" c="red">
          {mergedError}
        </Text>
      )}
    </Stack>
  );
}
