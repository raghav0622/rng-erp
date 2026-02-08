'use client';

import { useCreateTaxonomyValue, useTaxonomyValues } from '@/rng-platform/taxonomy';
import { Combobox, InputBase, Loader, useCombobox } from '@mantine/core';
import { useState } from 'react';
import { useController, type Control, type FieldValues } from 'react-hook-form';

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
 * TaxonomyInput Component
 *
 * Self-learning combobox field for taxonomy values.
 * - Fetches existing values from Firestore
 * - Allows creating new values by typing and pressing Enter
 * - Single selection only (string value)
 *
 * @example
 * ```tsx
 * {
 *   type: 'taxonomy',
 *   name: 'propertyType',
 *   taxonomy: 'property_type',
 *   label: 'Property Type',
 *   placeholder: 'Select or type to create...'
 * }
 * ```
 */

/**
 * Inner component that uses the taxonomy hooks
 * Wrapped in Suspense to handle async data loading
 */
function TaxonomyInputInner<TValues extends FieldValues>(
  props: TaxonomyInputItem<TValues> & BaseFieldProps<TValues>,
) {
  const {
    control,
    name,
    taxonomy,
    label,
    description,
    placeholder,
    disabled,
    required,
    autoFocus,
    error,
  } = props;

  const { field, fieldState } = useController({ name: name as any, control });
  const [inputValue, setInputValue] = useState<string>('');
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  // Fetch existing taxonomy values (auto-updates on any taxonomy change)
  const { data: taxonomyValues = [], isLoading } = useTaxonomyValues(taxonomy);
  const createMutation = useCreateTaxonomyValue();

  const mergedError = error ?? fieldState.error?.message;

  // Filter values based on input
  const filteredValues = taxonomyValues.filter((value) =>
    value.toLowerCase().includes(inputValue.toLowerCase()),
  );

  const handleInputChange = (value: string) => {
    setInputValue(value);
    combobox.openDropdown();
  };

  const handleValueSelect = (value: string) => {
    setInputValue(value);
    field.onChange(value);
    combobox.closeDropdown();
  };

  const handleCreateValue = async () => {
    const trimmedValue = inputValue.trim();
    if (!trimmedValue) return;

    // Check if value already exists
    if (taxonomyValues.includes(trimmedValue)) {
      field.onChange(trimmedValue);
      setInputValue(trimmedValue);
      combobox.closeDropdown();
      return;
    }

    try {
      await createMutation.mutateAsync({
        parent: taxonomy,
        value: trimmedValue,
      });
      // Update field with the new value (list auto-updates via event system)
      field.onChange(trimmedValue);
      setInputValue(trimmedValue);
      combobox.closeDropdown();
    } catch (err) {
      console.error('Failed to create taxonomy value:', err);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleCreateValue();
    }
  };

  // Show create option if input doesn't match any existing value
  const trimmedInput = inputValue.trim();
  const hasExactMatch =
    trimmedInput && taxonomyValues.some((v) => v.toLowerCase() === trimmedInput.toLowerCase());

  const displayOptions = hasExactMatch ? filteredValues : [...filteredValues];
  if (trimmedInput && !hasExactMatch) {
    displayOptions.push(trimmedInput);
  }

  const options = displayOptions.map((value) => (
    <Combobox.Option value={value} key={value}>
      {value}
    </Combobox.Option>
  ));

  if (isLoading) {
    return (
      <InputBase
        label={label}
        description={description}
        placeholder={placeholder || 'Loading...'}
        disabled
        rightSection={<Loader size="xs" />}
      />
    );
  }

  return (
    <Combobox store={combobox} onOptionSubmit={handleValueSelect} withinPortal={false}>
      <Combobox.Target>
        <InputBase
          ref={field.ref}
          {...(field.name && { name: field.name })}
          label={label}
          description={description}
          placeholder={placeholder || 'Select or type to create...'}
          disabled={disabled}
          required={required}
          autoFocus={autoFocus}
          error={mergedError}
          rightSection={<Combobox.Chevron />}
          value={inputValue}
          onChange={(event) => handleInputChange(event.currentTarget.value)}
          onBlur={() => {
            field.onBlur();
            combobox.closeDropdown();
          }}
          onFocus={() => combobox.openDropdown()}
          onKeyDown={handleKeyDown}
        />
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options>
          {options.length > 0 ? options : <Combobox.Empty>Type to create</Combobox.Empty>}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}

export function TaxonomyInputField<TValues extends FieldValues>(
  props: TaxonomyInputItem<TValues> & BaseFieldProps<TValues>,
) {
  return <TaxonomyInputInner {...props} />;
}

export default TaxonomyInputField;
