'use client';

import { ActionIcon, TextInput } from '@mantine/core';
import { IconSearch, IconX } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';

export interface UserSearchInputProps {
  value: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  disabled?: boolean;
}

/**
 * UserSearchInput - Debounced search input for user lookup
 */
export function UserSearchInput({
  value,
  onSearchChange,
  placeholder = 'Search by name, email, or role...',
  debounceMs = 300,
  disabled = false,
}: UserSearchInputProps) {
  const [localValue, setLocalValue] = useState(value);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      onSearchChange(localValue);
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [localValue, debounceMs, onSearchChange]);

  const handleClear = () => {
    setLocalValue('');
    onSearchChange('');
  };

  return (
    <TextInput
      placeholder={placeholder}
      leftSection={<IconSearch size={16} />}
      rightSection={
        localValue && (
          <ActionIcon size="sm" variant="subtle" onClick={handleClear} disabled={disabled}>
            <IconX size={14} />
          </ActionIcon>
        )
      }
      value={localValue}
      onChange={(e) => setLocalValue(e.currentTarget.value)}
      disabled={disabled}
    />
  );
}
