'use client';

import { Grid } from '@mantine/core';
import { useFormContext, type FieldValues } from 'react-hook-form';
import { useFieldLogic } from '../hooks/useFieldLogic';
import type { RNGFormItem } from '../types/core';
import { FieldErrorBoundary } from './FieldErrorBoundary';
import { useRNGContext } from './FormContext';
import { COMPONENT_REGISTRY } from './Registry';

export interface FieldWrapperProps<TValues extends FieldValues = FieldValues> {
  item: RNGFormItem<TValues>;
}

export function FieldWrapper<TValues extends FieldValues = FieldValues>({
  item,
}: FieldWrapperProps<TValues>) {
  const { control, formState } = useFormContext<TValues>();
  const { isVisible, dynamicProps } = useFieldLogic(item);
  const { readOnly: ctxReadOnly, isSubmitting } = useRNGContext();

  if (!isVisible) return null;

  const Component = COMPONENT_REGISTRY[item.type];
  if (!Component) return null;

  const error = 'name' in item ? (formState.errors as any)?.[item.name]?.message : undefined;
  const mergedDisabled =
    (dynamicProps as any)?.disabled ?? ('disabled' in item ? (item as any).disabled : false);
  const mergedReadOnly =
    (dynamicProps as any)?.readOnly ?? ('readOnly' in item ? (item as any).readOnly : ctxReadOnly);
  const colProps = 'colProps' in item ? (item as any).colProps : undefined;
  const { colProps: _colProps, ...itemProps } = item as any;

  const componentElement = (
    <FieldErrorBoundary>
      <Component
        {...itemProps}
        {...dynamicProps}
        control={control}
        error={error}
        disabled={mergedDisabled || isSubmitting || ctxReadOnly}
        readOnly={mergedReadOnly || ctxReadOnly}
      />
    </FieldErrorBoundary>
  );

  // Only wrap in Grid.Col if colProps are provided
  if (colProps) {
    return <Grid.Col {...colProps}>{componentElement}</Grid.Col>;
  }

  return componentElement;
}

export default FieldWrapper;
