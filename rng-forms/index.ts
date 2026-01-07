/**
 * RNGForm - Schema-Driven Form Engine
 *
 * Main exports for the form library
 */

// Root component
export { default as RNGForm, type RNGFormProps } from './RNGForm';

// Hooks
export { asyncValidators, useAsyncValidation } from './hooks/useAsyncValidation';
export {
  crossFieldValidators,
  useCrossFieldValidation,
  type CrossFieldValidationRule,
} from './hooks/useCrossFieldValidation';
export { useDebounce, useDebouncedCallback } from './hooks/useDebounce';
export { useFieldLogic } from './hooks/useFieldLogic';
export { useFormHistory } from './hooks/useFormHistory';
export { useFormPersistence } from './hooks/useFormPersistence';

// Context
export { RNGContextProvider, useRNGContext } from './core/FormContext';

// Error Handling
export { FieldErrorBoundary } from './core/FieldErrorBoundary';
export { FormSubmissionHandler, type FormSubmissionOptions } from './utils/form-submission-handler';

// Components
export { AutoSaveIndicator } from './components/AutoSaveIndicator';
export { FormHistoryPanel } from './components/FormHistoryPanel';
export { default as ArrayFieldEnhanced } from './components/layouts/ArrayFieldEnhanced';
export { default as WizardLayoutEnhanced } from './components/layouts/WizardLayoutEnhanced';
export { default as DataGridEnhanced } from './components/special/DataGridEnhanced';

// Types
export * from './types/core';
export * from './types/values';

// DSL Factory
export { createFormBuilder } from './dsl/factory';
export { createFieldTemplate, fieldTemplates } from './dsl/templates';

// Registry (for advanced usage)
export { COMPONENT_REGISTRY } from './core/Registry';
