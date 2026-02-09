'use client';

import { InputBase } from '@mantine/core';
import type { Control, FieldValues } from 'react-hook-form';
import { useController } from 'react-hook-form';

interface BaseFieldProps<TValues extends FieldValues> {
  control: Control<TValues>;
  error?: string;
}

export interface TaxonomyInputItem<TValues extends FieldValues = any> {
  type: 'taxonomy';
  name: keyof TValues & string;
  taxonomy: string; // Parent category (e.g., 'property_type', 'project_status')
  label?: string;
  description?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  autoFocus?: boolean;
}

/**
 * TaxonomyInput Component (Stub)
 *
 * Taxonomy system was removed due to persistent state synchronization issues.
 * This component is kept as a stub to avoid breaking existing form definitions.
 *
 * To use: Replace this field type with a standard 'select' or 'text' field in your form schema.
 *
 * @example
 * // Before (no longer works):
 * { type: 'taxonomy', name: 'propertyType', taxonomy: 'property_type' }
 *
 * // After (use select instead):
 * { type: 'select', name: 'propertyType', options: ['Option1', 'Option2'] }
 */
function TaxonomyInputInner<TValues extends FieldValues>(
  props: TaxonomyInputItem<TValues> & BaseFieldProps<TValues>,
) {
  const { control, name, label, description, placeholder, disabled, required, autoFocus, error } =
    props;

  const { field, fieldState } = useController({ name: name as any, control });

  const mergedError = error ?? fieldState.error?.message;

  return (
    <InputBase
      ref={field.ref}
      {...(field.name && { name: field.name })}
      label={label}
      description={
        description || 'Taxonomy input is no longer available. Please use a select field instead.'
      }
      placeholder={placeholder || 'Not available'}
      disabled={true}
      required={required}
      autoFocus={autoFocus}
      error={mergedError}
      value=""
      onChange={() => {}}
      onBlur={() => field.onBlur()}
    />
  );
}

export function TaxonomyInputField<TValues extends FieldValues>(
  props: TaxonomyInputItem<TValues> & BaseFieldProps<TValues>,
) {
  return <TaxonomyInputInner {...props} />;
}

export default TaxonomyInputField;
