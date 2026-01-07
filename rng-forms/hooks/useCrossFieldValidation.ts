'use client';

import { useEffect } from 'react';
import { useFormContext, type FieldValues } from 'react-hook-form';

/**
 * Cross-field validation rule
 */
export interface CrossFieldValidationRule<TValues = any> {
  /**
   * Fields that trigger this validation when they change
   */
  trigger: string[];
  /**
   * Validation function that receives all form values
   * Returns error message if validation fails, undefined if valid
   */
  validate: (values: TValues) => string | undefined;
  /**
   * Target field to show the error on
   */
  errorField: string;
}

/**
 * Hook for cross-field validation
 * Validates relationships between multiple fields
 *
 * @example
 * useCrossFieldValidation([
 *   {
 *     trigger: ['startDate', 'endDate'],
 *     validate: (values) => {
 *       if (values.endDate < values.startDate) {
 *         return 'End date must be after start date';
 *       }
 *     },
 *     errorField: 'endDate'
 *   },
 *   {
 *     trigger: ['password', 'confirmPassword'],
 *     validate: (values) => {
 *       if (values.password !== values.confirmPassword) {
 *         return 'Passwords must match';
 *       }
 *     },
 *     errorField: 'confirmPassword'
 *   }
 * ]);
 */
export function useCrossFieldValidation<TValues extends FieldValues = any>(
  rules: CrossFieldValidationRule<TValues>[],
) {
  const { watch, setError, clearErrors, getValues } = useFormContext<TValues>();

  useEffect(() => {
    // Get all unique trigger fields
    const allTriggers = new Set<string>();
    rules.forEach((rule) => rule.trigger.forEach((field) => allTriggers.add(field)));

    // Subscribe to all trigger fields
    const subscription = watch((_, { name }) => {
      if (!name) return;

      // Find rules that are triggered by this field
      const triggeredRules = rules.filter((rule) => rule.trigger.includes(name as string));

      triggeredRules.forEach((rule) => {
        const values = getValues();
        const error = rule.validate(values);

        if (error) {
          setError(rule.errorField as any, {
            type: 'cross-field',
            message: error,
          });
        } else {
          // Clear error only if it's a cross-field error
          const currentError = (getValues() as any)?.__errors?.[rule.errorField];
          if (currentError?.type === 'cross-field') {
            clearErrors(rule.errorField as any);
          }
        }
      });
    });

    // Run initial validation
    rules.forEach((rule) => {
      const values = getValues();
      const error = rule.validate(values);

      if (error) {
        setError(rule.errorField as any, {
          type: 'cross-field',
          message: error,
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [rules, watch, setError, clearErrors, getValues]);
}

/**
 * Common cross-field validation helpers
 */
export const crossFieldValidators = {
  /**
   * Validate that end date is after start date
   */
  dateRange: (
    startField: string,
    endField: string,
    message = 'End date must be after start date',
  ) => ({
    trigger: [startField, endField],
    validate: (values: any) => {
      const start = values[startField];
      const end = values[endField];
      if (start && end && new Date(end) < new Date(start)) {
        return message;
      }
      return undefined;
    },
    errorField: endField,
  }),

  /**
   * Validate that two fields match
   */
  mustMatch: (field1: string, field2: string, message = 'Fields must match') => ({
    trigger: [field1, field2],
    validate: (values: any) => {
      if (values[field1] !== values[field2]) {
        return message;
      }
      return undefined;
    },
    errorField: field2,
  }),

  /**
   * Validate that field value is less than another field
   */
  lessThan: (field1: string, field2: string, message?: string) => ({
    trigger: [field1, field2],
    validate: (values: any) => {
      const val1 = Number(values[field1]);
      const val2 = Number(values[field2]);
      if (!isNaN(val1) && !isNaN(val2) && val1 >= val2) {
        return message || `${field1} must be less than ${field2}`;
      }
      return undefined;
    },
    errorField: field1,
  }),

  /**
   * Validate that field value is greater than another field
   */
  greaterThan: (field1: string, field2: string, message?: string) => ({
    trigger: [field1, field2],
    validate: (values: any) => {
      const val1 = Number(values[field1]);
      const val2 = Number(values[field2]);
      if (!isNaN(val1) && !isNaN(val2) && val1 <= val2) {
        return message || `${field1} must be greater than ${field2}`;
      }
      return undefined;
    },
    errorField: field1,
  }),

  /**
   * Validate that at least one of multiple fields is filled
   */
  atLeastOne: (fields: string[], message = 'At least one field is required') => ({
    trigger: fields,
    validate: (values: any) => {
      const hasValue = fields.some((field) => {
        const value = values[field];
        return value !== undefined && value !== null && value !== '';
      });
      if (!hasValue) {
        return message;
      }
      return undefined;
    },
    errorField: fields[0]!, // Show error on first field
  }),

  /**
   * Conditional requirement: if field A has value, field B is required
   */
  conditionalRequired: (triggerField: string, requiredField: string, message?: string) => ({
    trigger: [triggerField, requiredField],
    validate: (values: any) => {
      const triggerValue = values[triggerField];
      const requiredValue = values[requiredField];

      const hasTrigger = triggerValue !== undefined && triggerValue !== null && triggerValue !== '';
      const hasRequired =
        requiredValue !== undefined && requiredValue !== null && requiredValue !== '';

      if (hasTrigger && !hasRequired) {
        return message || `${requiredField} is required when ${triggerField} is provided`;
      }
      return undefined;
    },
    errorField: requiredField,
  }),
};
