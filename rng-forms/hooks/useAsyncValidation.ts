'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useFormContext, type FieldValues, type Path } from 'react-hook-form';

interface AsyncValidationRule<TValues extends FieldValues> {
  /**
   * Field name to validate
   */
  field: Path<TValues>;
  /**
   * Async validation function that returns error message or undefined
   */
  validate: (value: any, allValues: TValues) => Promise<string | undefined>;
  /**
   * Debounce delay in milliseconds (default: 500)
   */
  debounceMs?: number;
  /**
   * Number of retries on network error (default: 2)
   */
  retries?: number;
  /**
   * Validate on blur only (default: false - validates on change)
   */
  validateOnBlur?: boolean;
}

interface AsyncValidationState {
  isValidating: boolean;
  error: string | undefined;
}

/**
 * Hook for async field validation with debouncing, retries, and loading states
 *
 * @example
 * useAsyncValidation([
 *   {
 *     field: 'username',
 *     validate: async (value) => {
 *       const response = await fetch(`/api/check-username/${value}`);
 *       const data = await response.json();
 *       return data.available ? undefined : 'Username already taken';
 *     },
 *     debounceMs: 500,
 *   },
 * ]);
 */
export function useAsyncValidation<TValues extends FieldValues>(
  rules: AsyncValidationRule<TValues>[],
): Record<string, AsyncValidationState> {
  const { watch, setError, clearErrors, getValues } = useFormContext<TValues>();
  const [validationStates, setValidationStates] = useState<Record<string, AsyncValidationState>>(
    () => {
      const initial: Record<string, AsyncValidationState> = {};
      rules.forEach((rule) => {
        initial[rule.field] = { isValidating: false, error: undefined };
      });
      return initial;
    },
  );

  const timeoutRefs = useRef<Record<string, NodeJS.Timeout>>({});
  const abortControllersRef = useRef<Record<string, AbortController>>({});

  const validateField = useCallback(
    async (rule: AsyncValidationRule<TValues>, value: any, attempt = 0) => {
      const fieldName = rule.field;

      // Cancel previous validation
      if (abortControllersRef.current[fieldName]) {
        abortControllersRef.current[fieldName].abort();
      }

      const controller = new AbortController();
      abortControllersRef.current[fieldName] = controller;

      setValidationStates((prev) => ({
        ...prev,
        [fieldName]: { isValidating: true, error: undefined },
      }));

      try {
        const allValues = getValues();
        const errorMessage = await rule.validate(value, allValues);

        // Check if validation was aborted
        if (controller.signal.aborted) {
          return;
        }

        if (errorMessage) {
          setError(fieldName, {
            type: 'async',
            message: errorMessage,
          });
          setValidationStates((prev) => ({
            ...prev,
            [fieldName]: { isValidating: false, error: errorMessage },
          }));
        } else {
          clearErrors(fieldName);
          setValidationStates((prev) => ({
            ...prev,
            [fieldName]: { isValidating: false, error: undefined },
          }));
        }
      } catch (error) {
        // Check if validation was aborted
        if (controller.signal.aborted) {
          return;
        }

        const retries = rule.retries ?? 2;
        if (attempt < retries) {
          // Retry with exponential backoff
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
          return validateField(rule, value, attempt + 1);
        }

        const errorMessage =
          error instanceof Error ? error.message : 'Validation failed. Please try again.';
        setError(fieldName, {
          type: 'async',
          message: errorMessage,
        });
        setValidationStates((prev) => ({
          ...prev,
          [fieldName]: { isValidating: false, error: errorMessage },
        }));
      }
    },
    [getValues, setError, clearErrors],
  );

  useEffect(() => {
    const subscriptions: (() => void)[] = [];

    rules.forEach((rule) => {
      const subscription = watch((values, { name }) => {
        // Only validate if this field changed
        if (name !== rule.field) return;

        const value = values[rule.field];
        const debounceMs = rule.debounceMs ?? 500;

        // Clear previous timeout
        if (timeoutRefs.current[rule.field]) {
          clearTimeout(timeoutRefs.current[rule.field]);
        }

        // Skip validation if validateOnBlur is true (will be handled separately)
        if (rule.validateOnBlur) return;

        // Debounce validation
        timeoutRefs.current[rule.field] = setTimeout(() => {
          validateField(rule, value);
        }, debounceMs);
      });

      subscriptions.push(() => subscription.unsubscribe());
    });

    return () => {
      subscriptions.forEach((unsub) => unsub());
      // Clear all timeouts
      Object.values(timeoutRefs.current).forEach(clearTimeout);
      // Abort all pending validations
      Object.values(abortControllersRef.current).forEach((controller) => controller.abort());
    };
  }, [rules, watch, validateField]);

  return validationStates;
}

/**
 * Common async validators for typical use cases
 */
export const asyncValidators = {
  /**
   * Check username availability (example template)
   */
  usernameAvailable: (apiUrl: string) => async (value: string) => {
    if (!value || value.length < 3) return undefined;
    const response = await fetch(`${apiUrl}?username=${encodeURIComponent(value)}`);
    const data = await response.json();
    return data.available ? undefined : 'Username already taken';
  },

  /**
   * Verify email doesn't exist (example template)
   */
  emailUnique: (apiUrl: string) => async (value: string) => {
    if (!value || !value.includes('@')) return undefined;
    const response = await fetch(`${apiUrl}?email=${encodeURIComponent(value)}`);
    const data = await response.json();
    return data.unique ? undefined : 'Email already registered';
  },

  /**
   * Validate against regex pattern
   */
  matchesPattern: (pattern: RegExp, message: string) => async (value: string) => {
    await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate API delay
    return pattern.test(value) ? undefined : message;
  },

  /**
   * Custom API validator
   */
  custom:
    (apiCall: (value: any) => Promise<{ valid: boolean; message?: string }>) =>
    async (value: any) => {
      const result = await apiCall(value);
      return result.valid ? undefined : result.message || 'Validation failed';
    },
};
