'use client';

import { globalLogger } from '@/lib';
import { useEffect, useState } from 'react';
import { useFormContext, type FieldValues } from 'react-hook-form';

/**
 * JSON replacer for serializing values like Date, Set, Map
 */
function jsonReplacer(key: string, value: any): any {
  if (value instanceof Date) {
    return { __type: 'Date', value: value.toISOString() };
  }
  if (value instanceof Set) {
    return { __type: 'Set', value: Array.from(value) };
  }
  if (value instanceof Map) {
    return { __type: 'Map', value: Array.from(value.entries()) };
  }
  return value;
}

/**
 * JSON reviver for deserializing values like Date, Set, Map
 */
function jsonReviver(key: string, value: any): any {
  if (value && typeof value === 'object' && value.__type) {
    switch (value.__type) {
      case 'Date':
        return new Date(value.value);
      case 'Set':
        return new Set(value.value);
      case 'Map':
        return new Map(value.value);
      default:
        return value;
    }
  }
  return value;
}

interface UseFormPersistenceOptions {
  /**
   * Key to use for localStorage
   */
  key: string;
  /**
   * Auto-save delay in milliseconds (default: 1000)
   */
  debounceMs?: number;
  /**
   * Enable auto-save on form changes (default: true)
   */
  autoSave?: boolean;
  /**
   * Enable auto-restore on mount (default: true)
   */
  autoRestore?: boolean;
}

/**
 * Hook for persisting form state to localStorage with automatic save/restore
 *
 * @example
 * const form = useForm({ defaultValues: {...} });
 * useFormPersistence({
 *   key: 'my-form',
 *   debounceMs: 500,
 * });
 */
export function useFormPersistence<TValues extends FieldValues>(
  options: UseFormPersistenceOptions,
) {
  const { key, debounceMs = 1000, autoSave = true, autoRestore = true } = options;
  const { watch, reset } = useFormContext<TValues>();
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Auto-restore from localStorage on mount
  useEffect(() => {
    if (!autoRestore) return;

    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const data = JSON.parse(stored, jsonReviver);
        reset(data, { keepDirty: false, keepValues: false });
      }
    } catch (err) {
      globalLogger.error(`Failed to restore form from localStorage key "${key}"`, { error: err });
    }
  }, [key, autoRestore, reset]);

  // Auto-save to localStorage on form changes
  useEffect(() => {
    if (!autoSave) return;

    const subscription = watch((data) => {
      // Debounce the save operation
      const timer = setTimeout(() => {
        try {
          const serialized = JSON.stringify(data, jsonReplacer);
          localStorage.setItem(key, serialized);
          setLastSaved(new Date());
        } catch (err) {
          globalLogger.error(`Failed to save form to localStorage key "${key}"`, { error: err });
        }
      }, debounceMs);

      return () => clearTimeout(timer);
    });

    return () => subscription.unsubscribe();
  }, [key, autoSave, debounceMs, watch]);

  /**
   * Manually save current form state to localStorage
   */
  const save = (data: TValues) => {
    try {
      const serialized = JSON.stringify(data, jsonReplacer);
      localStorage.setItem(key, serialized);
      setLastSaved(new Date());
    } catch (err) {
      globalLogger.error(`Failed to save form to localStorage key "${key}"`, { error: err });
      throw err;
    }
  };

  /**
   * Manually restore form state from localStorage
   */
  const restore = () => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const data = JSON.parse(stored, jsonReviver);
        reset(data, { keepDirty: false, keepValues: false });
        return data;
      }
      return null;
    } catch (err) {
      globalLogger.error(`Failed to restore form from localStorage key "${key}"`, { error: err });
      throw err;
    }
  };

  /**
   * Clear persisted form data from localStorage
   */
  const clear = () => {
    try {
      localStorage.removeItem(key);
      setLastSaved(null);
    } catch (err) {
      globalLogger.error(`Failed to clear form from localStorage key "${key}"`, { error: err });
      throw err;
    }
  };

  return { save, restore, clear, lastSaved };
}
