'use client';

import {
  Autocomplete,
  defaultOptionsFilter,
  Loader,
  type ComboboxParsedItem,
} from '@mantine/core';
import { useCallback, useMemo, useRef } from 'react';
import type { Control, FieldValues } from 'react-hook-form';
import { useController } from 'react-hook-form';
import { useTaxonomyOptions, useAddTaxonomyValue } from '@/rng-platform';
import { useRNGNotification } from '@/rng-ui/ux';

/** Sentinel for "Add …" option in dropdown (MUI creatable pattern). */
const ADD_OPTION_PREFIX = 'Add "';
const ADD_OPTION_SUFFIX = '"';

function isAddOptionValue(value: string): boolean {
  return value.startsWith(ADD_OPTION_PREFIX) && value.endsWith(ADD_OPTION_SUFFIX) && value.length > ADD_OPTION_PREFIX.length + ADD_OPTION_SUFFIX.length;
}

function parseAddOptionValue(value: string): string {
  return value.slice(ADD_OPTION_PREFIX.length, -ADD_OPTION_SUFFIX.length);
}

interface BaseFieldProps<TValues extends FieldValues> {
  control: Control<TValues>;
  error?: string;
}

export interface TaxonomyInputItem<TValues extends FieldValues = FieldValues> {
  type: 'taxonomy';
  name: keyof TValues & string;
  taxonomy: string;
  label?: string;
  description?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  autoFocus?: boolean;
}

/**
 * TaxonomyInput: creatable autocomplete that learns.
 * Receives only taxonomy name; fetches options and persists new values via rng-platform.
 * Users can pick an existing value or type a new one; new values are added to the taxonomy.
 */
function TaxonomyInputInner<TValues extends FieldValues>(
  props: TaxonomyInputItem<TValues> & BaseFieldProps<TValues>,
) {
  const {
    control,
    name,
    taxonomy: taxonomyName,
    label,
    description,
    placeholder,
    disabled,
    required,
    autoFocus,
    error,
  } = props;

  const { field, fieldState } = useController({ name: name as never, control });
  const inputRef = useRef<HTMLInputElement | null>(null);
  const mergedError = error ?? fieldState.error?.message;

  const setRef = useCallback(
    (el: HTMLInputElement | null) => {
      inputRef.current = el;
      field.ref(el);
    },
    [field],
  );

  const { options, isLoading, error: taxonomyError } = useTaxonomyOptions(taxonomyName);
  const addValue = useAddTaxonomyValue();
  const notifications = useRNGNotification();

  const baseData = useMemo(() => options.map((o) => o.value), [options]);

  /**
   * Include "Add \"…\"" in data so optionsLockup has it (Mantine does optionsLockup[val].label on submit).
   * Otherwise selecting the Add option causes "Cannot read properties of undefined (reading 'label')".
   */
  const data = useMemo(() => {
    const trimmed = String(field.value ?? '').trim();
    if (!trimmed || baseData.includes(trimmed)) return baseData;
    return [...baseData, `${ADD_OPTION_PREFIX}${trimmed}${ADD_OPTION_SUFFIX}`];
  }, [baseData, field.value]);

  /**
   * Filter: use default; the "Add …" option is already in data so it will be filtered by search like other options.
   */
  const creatableFilter = useCallback(
    (input: { options: ComboboxParsedItem[]; search: string; limit: number }): ComboboxParsedItem[] =>
      defaultOptionsFilter(input),
    [],
  );

  /** Show notification when a new option is created (UX + DX). */
  const notifyOptionCreated = useCallback(
    (value: string) => {
      notifications.showSuccess(
        `"${value}" added to options`,
        'New option created',
        { autoClose: 4000 },
      );
    },
    [notifications],
  );

  // #region agent log
  if (typeof fetch !== 'undefined') {
    fetch('http://127.0.0.1:7242/ingest/18656cd5-67ad-4cc7-82a4-b01dcb979455', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'TaxonomyInput.tsx:options',
        message: 'TaxonomyInput state',
        data: {
          taxonomyName,
          optionsLength: options.length,
          hasError: !!taxonomyError,
          errorMessage: taxonomyError?.message ?? null,
          isLoading,
        },
        timestamp: Date.now(),
        hypothesisId: 'C',
      }),
    }).catch(() => {});
  }
  // #endregion

  /**
   * When user selects "Add \"…\"" from dropdown, add to taxonomy and set field.
   * Otherwise just update field.
   */
  const handleChange = useCallback(
    (value: string) => {
      if (isAddOptionValue(value)) {
        const toAdd = parseAddOptionValue(value);
        addValue.mutate(
          { name: taxonomyName, value: toAdd },
          {
            onSuccess: () => {
              field.onChange(toAdd);
              notifyOptionCreated(toAdd);
            },
            onError: () => {},
          },
        );
        return;
      }
      field.onChange(value);
    },
    [field, taxonomyName, addValue, notifyOptionCreated],
  );

  /**
   * Creatable: learn on Enter or blur when value is not in options.
   * MUI pattern: https://mui.com/material-ui/react-autocomplete/#creatable
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      const trimmed = String(field.value ?? '').trim();
      if (!trimmed) return;
      const exists = options.some((o) => o.value === trimmed);
      if (!exists) {
        addValue.mutate(
          { name: taxonomyName, value: trimmed },
          {
            onSuccess: () => notifyOptionCreated(trimmed),
            onError: () => {},
          },
        );
      }
    },
    [field.value, options, taxonomyName, addValue, notifyOptionCreated],
  );

  /** Create new option on blur (click away) when value is not in options. */
  const handleBlur = useCallback(() => {
    field.onBlur();
    const trimmed = String(field.value ?? '').trim();
    if (!trimmed) return;
    const exists = options.some((o) => o.value === trimmed);
    if (!exists) {
      addValue.mutate(
        { name: taxonomyName, value: trimmed },
        {
          onSuccess: () => notifyOptionCreated(trimmed),
          onError: () => {},
        },
      );
    }
  }, [field, options, taxonomyName, addValue, notifyOptionCreated]);

  const displayError = mergedError ?? (taxonomyError ? taxonomyError.message : undefined);

  return (
    <Autocomplete
      ref={setRef}
      name={field.name}
      label={label}
      description={description}
      placeholder={placeholder ?? `Type or choose…`}
      disabled={disabled}
      required={required}
      autoFocus={autoFocus}
      error={displayError}
      value={field.value ?? ''}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onClear={() => {
        field.onChange('');
        // Restore focus to input after clear so user can keep typing
        requestAnimationFrame(() => inputRef.current?.focus());
      }}
      data={data}
      filter={creatableFilter}
      clearable
      rightSection={isLoading ? <Loader size="xs" /> : undefined}
    />
  );
}

export function TaxonomyInputField<TValues extends FieldValues>(
  props: TaxonomyInputItem<TValues> & BaseFieldProps<TValues>,
) {
  return <TaxonomyInputInner {...props} />;
}

export default TaxonomyInputField;
