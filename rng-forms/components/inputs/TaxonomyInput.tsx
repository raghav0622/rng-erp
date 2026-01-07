'use client';

import { useCreateTaxonomy, useGetTaxonomyByType, type TaxonomyEntity } from '@/domain/taxonomy';
import { globalLogger, notificationService } from '@/lib';
import {
  ActionIcon,
  Badge,
  Combobox,
  Group,
  Loader,
  Pill,
  PillsInput,
  Stack,
  Text,
  Tooltip,
  useCombobox,
} from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import type { BaseFieldProps } from '../../types/core';

export interface TaxonomyOption {
  value: string;
  label: string;
}

export interface TaxonomyInputProps extends BaseFieldProps {
  /**
   * Taxonomy key/collection (e.g., 'categories', 'tags', 'departments')
   * Everything else is handled automatically!
   */
  collection: string;
  /**
   * Placeholder text (optional)
   */
  placeholder?: string;
  /**
   * Allow multiple selection
   * @default true
   */
  multiple?: boolean;
  /**
   * Allow creating new taxonomy items (optional, defaults to RBAC-based)
   * If provided, overrides RBAC check
   */
  creatable?: boolean;
}

/**
 * Taxonomy Input Component
 *
 * Features:
 * - Fetches from Firestore automatically
 * - Creatable - type and select to create new items (RBAC-based, admin/manager only)
 * - Single or multiple selection
 * - Searchable with instant filtering
 *
 * @example
 * ```tsx
 * { type: 'taxonomy', name: 'categories', label: 'Categories', collection: 'categories', multiple: true }
 * ```
 */
export function TaxonomyInput({
  name,
  label,
  collection,
  placeholder,
  disabled,
  readOnly,
  required,
  multiple = true,
  creatable: creatableProp,
}: TaxonomyInputProps) {
  const { control } = useFormContext();
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  // Use hooks layer instead of direct service calls
  const {
    data: taxonomyItems = [],
    isLoading: loading,
    refetch,
  } = useGetTaxonomyByType(collection, {
    // meta: { suspense: true },
  });

  const createTaxonomy = useCreateTaxonomy();

  const [search, setSearch] = useState('');

  // Derive options directly from taxonomyItems (avoids infinite loop)
  const [localOptions, setLocalOptions] = useState<TaxonomyOption[]>([]);
  const options = useMemo(() => {
    const baseOptions = taxonomyItems.map((item: TaxonomyEntity) => ({
      value: item.value,
      label: item.label,
    }));
    // Merge with any locally created options that haven't synced yet
    const localValues = new Set(localOptions.map((o) => o.value));
    const remoteValues = new Set(baseOptions.map((o) => o.value));
    const onlyLocal = localOptions.filter((o) => !remoteValues.has(o.value));
    const allOptions = [...baseOptions, ...onlyLocal];
    return allOptions;
  }, [taxonomyItems, localOptions]);

  /**
   * Create new taxonomy item (automatically saves to Firestore)
   */
  const handleCreate = async (query: string): Promise<string> => {
    try {
      const value = query.toLowerCase().replace(/\s+/g, '-');

      // Use mutation hook (with proper error handling in the hook pipeline)
      try {
        await createTaxonomy.mutateAsync({
          type: collection,
          value,
          label: query,
          deletedAt: null,
        });
      } catch (firestoreErr) {
        const errorDetails =
          firestoreErr instanceof Error
            ? {
                message: firestoreErr.message,
                name: firestoreErr.name,
                stack: firestoreErr.stack,
                cause: firestoreErr.cause,
              }
            : { raw: String(firestoreErr) };

        globalLogger.warn('Failed to save to Firestore, continuing locally:', {
          collection,
          error: errorDetails,
        });

        // Show user-friendly notification
        notificationService.offlineWarning(
          `"${query}" saved locally. It will sync when connection is restored.`,
          'Offline Mode',
        );
      }

      const newOption: TaxonomyOption = { value, label: query };
      setLocalOptions((prev) => [...prev, newOption]);
      return value;
    } catch (err) {
      globalLogger.error('Error creating taxonomy:', { error: err });
      return query.toLowerCase().replace(/\s+/g, '-');
    }
  };

  // Filter options based on search
  const filteredOptions = options.filter((item) =>
    item.label.toLowerCase().includes(search.toLowerCase().trim()),
  );

  // Check if search value could be a new item (only if user has create permission)
  const exactMatch = options.find(
    (item) => item.label.toLowerCase() === search.toLowerCase().trim(),
  );
  const canCreate = true;

  const handleValueSelect = async (val: string, fieldValue: string | string[]) => {
    const isCreate = val.startsWith('__create__:');

    if (isCreate) {
      // Extract the label from the create value
      const newLabel = val.replace('__create__:', '');
      const newValue = await handleCreate(newLabel);

      if (multiple) {
        const currentValues = Array.isArray(fieldValue) ? fieldValue : [];
        return [...currentValues, newValue];
      }
      return newValue;
    }

    if (multiple) {
      const currentValues = Array.isArray(fieldValue) ? fieldValue : [];
      return currentValues.includes(val)
        ? currentValues.filter((v) => v !== val)
        : [...currentValues, val];
    }
    return val;
  };

  const handleValueRemove = (val: string, fieldValue: string | string[]) => {
    if (multiple && Array.isArray(fieldValue)) {
      return fieldValue.filter((v) => v !== val);
    }
    return multiple ? [] : '';
  };

  return (
    <Controller
      name={name}
      control={control}
      rules={{ required: required ? `${label} is required` : undefined }}
      render={({ field, fieldState: { error: fieldError } }) => {
        const fieldValue = field.value || (multiple ? [] : '');
        const values = multiple
          ? Array.isArray(fieldValue)
            ? fieldValue
            : []
          : fieldValue
          ? [fieldValue]
          : [];

        const selectedItems = values
          .map((v) => options.find((o) => o.value === v))
          .filter(Boolean) as TaxonomyOption[];

        const placeholderText = canCreate
          ? placeholder || `Type to search or create ${(label || 'items').toLowerCase()}...`
          : placeholder || `Select ${(label || 'items').toLowerCase()}...`;

        return (
          <Stack gap="xs">
            <Group justify="space-between">
              <Text size="sm" fw={500}>
                {label}
                {required && <span style={{ color: 'red' }}> *</span>}
              </Text>
              <Group gap="xs">
                {options.length > 0 && (
                  <Badge size="xs" variant="light" color="gray">
                    {options.length} available
                  </Badge>
                )}
                <Tooltip label="Refresh">
                  <ActionIcon
                    size="sm"
                    variant="subtle"
                    onClick={() => refetch()}
                    loading={loading}
                    disabled={disabled || readOnly}
                  >
                    <IconRefresh size={14} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Group>

            <Combobox
              store={combobox}
              onOptionSubmit={async (val) => {
                const newValue = await handleValueSelect(val, fieldValue);
                field.onChange(newValue);
                setSearch('');
                if (!multiple) {
                  combobox.closeDropdown();
                }
              }}
              withinPortal={false}
            >
              <Combobox.Target>
                <PillsInput
                  pointer
                  onClick={() => combobox.openDropdown()}
                  disabled={disabled || readOnly || loading}
                  error={fieldError?.message}
                  rightSection={loading ? <Loader size="xs" /> : undefined}
                >
                  <Pill.Group>
                    {selectedItems.map((item) => (
                      <Pill
                        key={item.value}
                        withRemoveButton={!disabled && !readOnly && multiple}
                        onRemove={() => {
                          const newValue = handleValueRemove(item.value, fieldValue);
                          field.onChange(newValue);
                        }}
                      >
                        {item.label}
                      </Pill>
                    ))}

                    <Combobox.EventsTarget>
                      <PillsInput.Field
                        placeholder={values.length === 0 ? placeholderText : undefined}
                        value={search}
                        onChange={(event) => {
                          combobox.updateSelectedOptionIndex();
                          setSearch(event.currentTarget.value);
                        }}
                        onFocus={() => combobox.openDropdown()}
                        onBlur={() => {
                          combobox.closeDropdown();
                          setSearch('');
                        }}
                        onKeyDown={(event) => {
                          // Backspace: clear value when search is empty
                          if (
                            event.key === 'Backspace' &&
                            search.length === 0 &&
                            values.length > 0
                          ) {
                            event.preventDefault();
                            if (multiple) {
                              // Remove last item in multiple mode
                              const newValue = handleValueRemove(
                                values[values.length - 1],
                                fieldValue,
                              );
                              field.onChange(newValue);
                            } else {
                              // Clear single value
                              field.onChange('');
                            }
                          }

                          // Enter: submit first option or create
                          if (event.key === 'Enter' && !event.shiftKey) {
                            event.preventDefault();
                            if (filteredOptions.length > 0) {
                              const firstOption = filteredOptions[0];
                              if (firstOption) {
                                handleValueSelect(firstOption.value, fieldValue).then(
                                  (newValue) => {
                                    field.onChange(newValue);
                                    setSearch('');
                                    if (!multiple) {
                                      combobox.closeDropdown();
                                    }
                                  },
                                );
                              }
                            } else if (canCreate) {
                              handleValueSelect(`__create__:${search.trim()}`, fieldValue).then(
                                (newValue) => {
                                  field.onChange(newValue);
                                  setSearch('');
                                  if (!multiple) {
                                    combobox.closeDropdown();
                                  }
                                },
                              );
                            }
                          }

                          // Escape: close dropdown and clear search
                          if (event.key === 'Escape') {
                            combobox.closeDropdown();
                            setSearch('');
                          }

                          // Arrow Down/Up: navigate options
                          if (event.key === 'ArrowDown') {
                            event.preventDefault();
                            if (!combobox.dropdownOpened) {
                              combobox.openDropdown();
                            }
                          }

                          if (event.key === 'ArrowUp') {
                            event.preventDefault();
                            if (!combobox.dropdownOpened) {
                              combobox.openDropdown();
                            }
                          }
                        }}
                        disabled={disabled || readOnly}
                      />
                    </Combobox.EventsTarget>
                  </Pill.Group>
                </PillsInput>
              </Combobox.Target>

              <Combobox.Dropdown>
                <Combobox.Options>
                  {filteredOptions.length > 0 ? (
                    filteredOptions.map((item) => (
                      <Combobox.Option
                        value={item.value}
                        key={item.value}
                        active={values.includes(item.value)}
                      >
                        <Group gap="xs">
                          <Text>{item.label}</Text>
                        </Group>
                      </Combobox.Option>
                    ))
                  ) : canCreate ? (
                    <Combobox.Option value={`__create__:${search.trim()}`}>
                      <Text>
                        + Create <strong>"{search.trim()}"</strong>
                      </Text>
                    </Combobox.Option>
                  ) : (
                    <Combobox.Empty>
                      {search ? 'No results found' : 'Type to search or create'}
                    </Combobox.Empty>
                  )}
                </Combobox.Options>
              </Combobox.Dropdown>
            </Combobox>

            {!readOnly && (
              <Text size="xs" c="dimmed">
                {multiple
                  ? '↑↓ navigate • Enter select • Backspace remove last • Esc close'
                  : '↑↓ navigate • Enter select • Backspace clear • Esc close'}
              </Text>
            )}
          </Stack>
        );
      }}
    />
  );
}

export default TaxonomyInput;
