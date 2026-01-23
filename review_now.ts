/**
 * rng-firebase manual review file
 * Purpose: line-by-line senior engineer review
 */

// FILE: rng-forms/README.md

# rng-forms

Schema-driven form rendering utility built on Mantine UI + React Hook Form + Zod. Use it **only** for UI form composition; keep business logic and data access in services/hooks (rng-firebase).

## Core Architecture

- Schema model lives in [rng-forms/types/core.ts](rng-forms/types/core.ts): discriminated union of inputs, uploads, layouts, and metadata (dependencies, renderLogic, propsLogic, colProps, etc.).
- Rendering flow: `RNGForm` (form shell) → `FieldWrapper` (conditional logic, error mapping) → lazy component registry in [rng-forms/core/Registry.tsx](rng-forms/core/Registry.tsx) for code-split inputs/layouts → Mantine primitives.
- Conditional logic: `dependencies`, `renderLogic`, and `propsLogic` are resolved by [rng-forms/hooks/useFieldLogic.ts](rng-forms/hooks/useFieldLogic.ts); scope-aware watching avoids unnecessary re-renders.
- DSL: [rng-forms/dsl/factory.ts](rng-forms/dsl/factory.ts) exposes `createFormBuilder(zodSchema)` to generate schema items with path-safe helpers (scoped prefixes, array item scopes, wizard/section/group/array/data-grid builders). Reusable templates live in [rng-forms/dsl/templates.ts](rng-forms/dsl/templates.ts) (fullName, contactInfo, address, etc.).
- Component registry is lazy-loaded (React.lazy + Suspense) to keep bundles lean; see [rng-forms/core/Registry.tsx](rng-forms/core/Registry.tsx) for mapping.

## Usage Pattern

- Define a Zod schema and infer values; pass it to `createFormBuilder` and `RNGForm`.
- Pass `validationSchema` (Zod) and `schema.items` to `RNGForm`. All form-level props (submit/reset labels, readOnly, progress bar, field counter, externalErrors, requireChange, etc.) are on [rng-forms/RNGForm.tsx](rng-forms/RNGForm.tsx).
- Wire `onSubmit` to services/hooks (e.g., rng-firebase hooks). Avoid data access or side effects inside field components; keep them in pipeline services. Taxonomy input is the only built-in data fetcher (see below).

```tsx
import { z } from 'zod';
import RNGForm, { createFormBuilder } from 'rng-forms';

const schema = z.object({
  name: z.string().min(2),
  category: z.string().array().min(1),
});

const b = createFormBuilder(schema);

const formSchema = {
  items: [
    b.section('Details', [b.text('name', { label: 'Name', required: true })]),
    b.section('Taxonomy', [
      b.taxonomy('category', { label: 'Categories', collection: 'categories' }),
    ]),
  ],
};

<RNGForm schema={formSchema} validationSchema={schema} onSubmit={(values) => myService(values)} />;
```

## Field Types & Layouts

- Inputs: text/password/number/color/otp/mask/hidden; selection (select/multiSelect via `multiple`, checkbox, switch, radio, segmented, autocomplete, slider/range-slider); dates (date, date-range); rich-text; math; calculated.
- Uploads: image-upload (crop/compress/tune), pdf-upload (page ops), file-upload (extensions, drag/drop).
- Special: taxonomy (collection-backed), signature, geo (map), data-grid.
- Layouts: section (title/desc/collapsible), group (inline grouping), wizard (steps), array (repeating item schema with min/max/add/remove labels), data-grid. Use `colProps` per item for Mantine Grid placement.

## Validation

- Primary validation is Zod (required). Per-field `validation` props map to React Hook Form rules for quick guards.
- Async validation: [rng-forms/hooks/useAsyncValidation.ts](rng-forms/hooks/useAsyncValidation.ts) provides debounced, retryable validators with canned helpers (`usernameAvailable`, `emailUnique`, etc.).
- Cross-field validation: [rng-forms/hooks/useCrossFieldValidation.ts](rng-forms/hooks/useCrossFieldValidation.ts) watches trigger fields and sets errors on a target field (includes helpers like `dateRange`, `mustMatch`, `atLeastOne`).

## Conditional Logic & Dynamic Props

- Add `dependencies` to watch other fields (scoped or root via `!field`).
- `renderLogic(scope, root)` → boolean visibility; `propsLogic(scope, root)` → partial props overrides (e.g., disable when flags are false). Scope is auto-derived for nested/array items; can be overridden with `scopePrefix`.

## Taxonomy Field

- Type `taxonomy` uses [rng-forms/components/inputs/TaxonomyInput.tsx](rng-forms/components/inputs/TaxonomyInput.tsx); fetches options from `taxonomyService` (Firestore) and logs via `globalLogger`. Supports search, multi-select, refresh, and optional creatable entries (persist best-effort). Keep RBAC/business rules in services; this component is UI-only.

## Math & Calculated

- `math` uses a math scope for inline evaluation.
- `calculated` takes `calculation(values)` and optional `format`/`formatFn`; values are read-only display fields.

## Arrays, Wizards, and Layouts

- `array` wraps a nested item schema per row; `scope()` in the DSL prefixes nested paths safely.
- `wizard` uses `steps` with labels/descriptions; components are lazy-loaded.
- `section`/`group` provide structure; `data-grid` renders tabular read/edit layouts.

## Submission & UX

- `RNGForm` manages submit/reset state, success/error badges, optional confirmation before reset, progress bar, required field counter, error summary, externalErrors display, and readOnly/disabled harmonization (merges field-level + context-level flags).
- FormSubmissionHandler debounces submit, sets transient status, and surfaces `onSubmitSuccess`/`onSubmitError` callbacks.

## Extension Guidance

- Extend by adding new field components + registry entries; avoid mutating existing field contracts.
- Keep business logic, data fetching, and side effects out of components; route through services/hooks. rng-forms is for form UI composition only.


// FILE: rng-forms/RNGForm.tsx

'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Badge,
  Button,
  Container,
  Group,
  Loader,
  Modal,
  Progress,
  Stack,
  Text,
} from '@mantine/core';
import { IconAlertCircle, IconCheck, IconX } from '@tabler/icons-react';
import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  FormProvider,
  useForm,
  useWatch,
  type FieldValues,
  type SubmitHandler,
} from 'react-hook-form';
import { z } from 'zod';
import FieldWrapper from './core/FieldWrapper';
import { RNGContextProvider } from './core/FormContext';
import type { RNGFormItem, RNGFormSchema } from './types/core';
import { FormSubmissionHandler } from './utils/form-submission-handler';

export interface RNGFormProps<TValues extends FieldValues = any> {
  /**
   * Form schema defining all fields and layout
   */
  schema: RNGFormSchema<TValues>;
  /**
   * Zod validation schema (required)
   */
  validationSchema: z.ZodTypeAny;
  /**
   * Default form values
   */
  defaultValues?: TValues;
  /**
   * Form submission handler
   */
  onSubmit: SubmitHandler<TValues>;

  /**
   * Form submission error handler (optional)
   */
  onError?: (errors: any) => void;
  /**
   * Custom submit button label (default: "Submit")
   */
  submitLabel?: string;
  /**
   * Show reset button (default: true)
   */
  showReset?: boolean;
  /**
   * Custom reset button label (default: "Reset")
   */
  resetLabel?: string;
  /**
   * Container max width (default: "md")
   */
  maxWidth?: string | number;
  /**
   * Enable debug mode (default: false)
   */
  debug?: boolean;
  /**
   * Make form read-only (default: false)
   */
  readOnly?: boolean;
  /**
   * Custom className for form container
   */
  className?: string;
  /**
   * Optional callback on any value change
   */
  onValuesChange?: (values: TValues) => void | Promise<void>;
  /**
   * Show a simple progress bar based on filled fields (default: false)
   */
  showProgress?: boolean;
  /**
   * Optional header title and description
   */
  headerTitle?: string;
  headerDescription?: ReactNode;
  /**
   * Custom header content area (renders above fields)
   */
  headerContent?: ReactNode;
  /**
   * Custom footer content area (renders below buttons)
   */
  footerContent?: ReactNode;
  /**
   * If true (default), requires form data to be changed before allowing submit
   * If false, allows submit even with unchanged data
   * @default true
   */
  requireChange?: boolean;
  /**
   * Optional children (e.g., for cross-field validation hooks)
   */
  children?: ReactNode;
  /**
   * Show confirmation dialog before resetting the form
   * @default false
   */
  showResetConfirmation?: boolean;
  /**
   * Show error summary at the top of the form
   * @default false
   */
  showErrorSummary?: boolean;
  /**
   * External errors to display outside of field-level validation
   * Useful for server/auth errors that are not tied to specific fields
   */
  externalErrors?: string[];
  /**
   * Show required field counter (e.g., '3 of 10 required fields completed')
   * @default false
   */
  showFieldCounter?: boolean;
  /**
   * Callback fired after successful submission
   */
  onSubmitSuccess?: () => void;
  /**
   * Callback fired after submission error
   */
  onSubmitError?: (error: any) => void;
}

export default function RNGForm<TValues extends FieldValues = any>({
  schema,
  validationSchema,
  defaultValues,
  onSubmit,
  onError,
  submitLabel = 'Submit',
  showReset = true,
  resetLabel = 'Reset',
  maxWidth = 'md',
  debug = false,
  readOnly = false,
  className,
  onValuesChange,
  showProgress = false,
  headerTitle,
  headerDescription,
  headerContent,
  footerContent,
  requireChange = true,
  children,
  showResetConfirmation = false,
  showErrorSummary = false,
  externalErrors = [],
  showFieldCounter = false,
  onSubmitSuccess,
  onSubmitError,
}: RNGFormProps<TValues>) {
  const [showResetModal, setShowResetModal] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const submissionHandlerRef = useRef(new FormSubmissionHandler());

  const form = useForm<TValues>({
    mode: 'onBlur',
    defaultValues: (defaultValues || {}) as any,
    resolver: zodResolver(validationSchema),
  });

  const watchedValues = useWatch({ control: form.control }) as TValues;

  const handleSubmit = form.handleSubmit(
    async (data: any) => {
      const handler = submissionHandlerRef.current;
      const result = await handler.handle(
        data,
        async (values) => {
          try {
            setSubmitStatus('idle');
            await onSubmit(values as TValues);
            setSubmitStatus('success');
            if (onSubmitSuccess) onSubmitSuccess();
            // Reset status after 2 seconds
            setTimeout(() => setSubmitStatus('idle'), 2000);
            // Return Result type for compatibility
            return { ok: true, value: values };
          } catch (error) {
            setSubmitStatus('error');
            if (onSubmitError) onSubmitError(error);
            // Reset status after 3 seconds
            setTimeout(() => setSubmitStatus('idle'), 3000);
            throw error;
          }
        },
        {
          onSuccess: () => {
            // Additional success handling if needed
          },
          onSubmissionError: (error) => {
            setSubmitStatus('error');
            if (onSubmitError) onSubmitError(error);
            setTimeout(() => setSubmitStatus('idle'), 3000);
          },
          debounceMs: 300,
        },
      );
      return result;
    },
    async (errors) => {
      setSubmitStatus('error');
      if (onError) {
        await onError(errors);
      }
      // Reset status after 3 seconds
      setTimeout(() => setSubmitStatus('idle'), 3000);
    },
  );

  const handleReset = async () => {
    if (showResetConfirmation) {
      setShowResetModal(true);
    } else {
      form.reset();
    }
  };

  const confirmReset = () => {
    form.reset();
    setShowResetModal(false);
  };

  const completion = useMemo(() => {
    if (!showProgress) return 0;
    const namedItems = schema.items.filter((item) => 'name' in item);
    const total = namedItems.length || 1;
    const filled = namedItems.reduce((count, item) => {
      const name = (item as any).name as keyof TValues;
      const value = (watchedValues as any)?.[name];
      const hasValue = value !== undefined && value !== null && value !== '';
      return count + (hasValue ? 1 : 0);
    }, 0);
    return Math.min(100, Math.round((filled / total) * 100));
  }, [schema.items, showProgress, watchedValues]);

  // Count required fields
  const requiredFieldsCount = useMemo(() => {
    if (!showFieldCounter) return { total: 0, filled: 0 };
    const namedItems = schema.items.filter((item) => 'name' in item && (item as any).required);
    const total = namedItems.length;
    const filled = namedItems.reduce((count, item) => {
      const name = (item as any).name as keyof TValues;
      const value = (watchedValues as any)?.[name];
      const hasValue = value !== undefined && value !== null && value !== '';
      return count + (hasValue ? 1 : 0);
    }, 0);
    return { total, filled };
  }, [schema.items, showFieldCounter, watchedValues]);

  // Extract error messages for summary
  const errorMessages = useMemo(() => {
    if (!showErrorSummary) return [];
    const errors: Array<{ field: string; message: string }> = [];
    Object.entries(form.formState.errors).forEach(([field, error]) => {
      if (error && typeof error.message === 'string') {
        errors.push({ field, message: error.message });
      }
    });
    return errors;
  }, [showErrorSummary, form.formState.errors]);

  useEffect(() => {
    if (onValuesChange) {
      // Fire and forget when values change; async-safe via promise chaining
      void onValuesChange(watchedValues);
    }
  }, [onValuesChange, watchedValues]);

  useEffect(() => {
    return () => {
      // Cleanup submission handler on unmount
      submissionHandlerRef.current.reset();
    };
  }, []);

  const isSubmitting = form.formState.isSubmitting;
  const isDirty = form.formState.isDirty;
  const canSubmit = !readOnly && !isSubmitting && (requireChange !== false ? isDirty : true);

  const containerStyles = {
    paddingTop: 24,
    paddingBottom: 40,
    width: '100%',
    boxSizing: 'border-box' as const,
    maxWidth: typeof maxWidth === 'number' ? maxWidth : undefined,
  };

  return (
    <RNGContextProvider
      value={{
        readOnly,
        debug,
        isSubmitting,
      }}
    >
      <FormProvider {...form}>
        {children}
        <Container
          fluid
          size={typeof maxWidth === 'string' ? maxWidth : undefined}
          className={className}
          style={containerStyles}
        >
          <form onSubmit={handleSubmit} noValidate>
            <Stack gap="xl">
              {debug && (
                <Alert icon={<IconAlertCircle size={16} />} color="blue" title="Debug Mode">
                  Form is in debug mode. Watch values in console.log.
                </Alert>
              )}

              {(headerTitle || headerDescription || headerContent) && (
                <Stack gap={4}>
                  {(headerTitle || headerDescription) && (
                    <Stack gap={2}>
                      {headerTitle && (
                        <Text size="lg" fw={700}>
                          {headerTitle}
                        </Text>
                      )}
                      {headerDescription && (
                        <Text size="sm" c="dimmed">
                          {headerDescription}
                        </Text>
                      )}
                    </Stack>
                  )}
                  {headerContent}
                </Stack>
              )}

              {/* Error Summary */}
              {showErrorSummary && errorMessages.length > 0 && (
                <Alert
                  icon={<IconAlertCircle size={16} />}
                  title="Please fix the following errors"
                  color="red"
                  variant="light"
                >
                  <Stack gap="xs">
                    {errorMessages.map(({ field, message }) => (
                      <Text key={field} size="sm">
                        <strong>{field}:</strong> {message}
                      </Text>
                    ))}
                  </Stack>
                </Alert>
              )}

              {/* External Errors (server/auth level) */}
              {externalErrors.length > 0 && (
                <Alert
                  icon={<IconAlertCircle size={16} />}
                  title="There were issues submitting the form"
                  color="red"
                  variant="light"
                >
                  <Stack gap="xs">
                    {externalErrors.map((message, idx) => (
                      <Text key={idx} size="sm">
                        {message}
                      </Text>
                    ))}
                  </Stack>
                </Alert>
              )}

              {/* Required Field Counter */}
              {showFieldCounter && requiredFieldsCount.total > 0 && (
                <Group justify="space-between" align="center">
                  <Text size="sm" c="dimmed">
                    Required fields:
                  </Text>
                  <Badge
                    color={
                      requiredFieldsCount.filled === requiredFieldsCount.total ? 'green' : 'blue'
                    }
                    variant="light"
                  >
                    {requiredFieldsCount.filled} of {requiredFieldsCount.total} completed
                  </Badge>
                </Group>
              )}

              {showProgress && (
                <Stack gap={4}>
                  <Group justify="space-between">
                    <div style={{ fontWeight: 600 }}>Completion</div>
                    <div style={{ fontSize: 12, color: 'var(--mantine-color-dimmed)' }}>
                      {completion}%
                    </div>
                  </Group>
                  <Progress value={completion} size="sm" radius="xl" />
                </Stack>
              )}

              {/* Form Fields */}
              <Suspense
                fallback={
                  <Group gap="sm">
                    <Loader size="sm" />
                    <div>Loading form...</div>
                  </Group>
                }
              >
                <Stack gap="md">
                  {schema.items.map((item: RNGFormItem<TValues>, idx: number) => (
                    <FieldWrapper key={`${item.type}-${idx}`} item={item} />
                  ))}
                </Stack>
              </Suspense>

              <Group justify="flex-start" gap="md">
                <Button
                  type="submit"
                  loading={isSubmitting}
                  disabled={!canSubmit}
                  color={
                    submitStatus === 'success'
                      ? 'green'
                      : submitStatus === 'error'
                        ? 'red'
                        : undefined
                  }
                  leftSection={
                    submitStatus === 'success' ? (
                      <IconCheck size={16} />
                    ) : submitStatus === 'error' ? (
                      <IconX size={16} />
                    ) : undefined
                  }
                >
                  {submitStatus === 'success'
                    ? 'Success!'
                    : submitStatus === 'error'
                      ? 'Error'
                      : submitLabel}
                </Button>
                {showReset && (
                  <Button
                    type="button"
                    variant="subtle"
                    onClick={handleReset}
                    disabled={readOnly || isSubmitting}
                  >
                    {resetLabel}
                  </Button>
                )}
              </Group>

              {footerContent}
            </Stack>
          </form>
        </Container>

        {/* Reset Confirmation Modal */}
        <Modal
          opened={showResetModal}
          onClose={() => setShowResetModal(false)}
          title="Confirm Reset"
          centered
        >
          <Stack gap="md">
            <Text size="sm">
              Are you sure you want to reset the form? All unsaved changes will be lost.
            </Text>
            <Group justify="flex-end" gap="sm">
              <Button variant="subtle" onClick={() => setShowResetModal(false)}>
                Cancel
              </Button>
              <Button color="red" onClick={confirmReset}>
                Reset Form
              </Button>
            </Group>
          </Stack>
        </Modal>
      </FormProvider>
    </RNGContextProvider>
  );
}


// FILE: rng-forms/components/AutoSaveIndicator.tsx

'use client';

import { Badge, Text } from '@mantine/core';
import { useEffect, useState } from 'react';

interface AutoSaveIndicatorProps {
  /**
   * The timestamp of the last save
   */
  lastSaved: Date | null;
  /**
   * Custom label prefix (default: "Saved")
   */
  label?: string;
  /**
   * Show as badge or plain text (default: badge)
   */
  variant?: 'badge' | 'text';
}

/**
 * Displays "Saved X minutes ago" indicator with live updates
 *
 * @example
 * const { lastSaved } = useFormPersistence({ key: 'my-form' });
 * <AutoSaveIndicator lastSaved={lastSaved} />
 */
export function AutoSaveIndicator({
  lastSaved,
  label = 'Saved',
  variant = 'badge',
}: AutoSaveIndicatorProps) {
  const [timeAgo, setTimeAgo] = useState<string>('');

  useEffect(() => {
    if (!lastSaved) {
      return;
    }

    const updateTimeAgo = () => {
      const now = new Date();
      const diffMs = now.getTime() - lastSaved.getTime();
      const diffSeconds = Math.floor(diffMs / 1000);
      const diffMinutes = Math.floor(diffSeconds / 60);
      const diffHours = Math.floor(diffMinutes / 60);

      if (diffSeconds < 10) {
        setTimeAgo('just now');
      } else if (diffSeconds < 60) {
        setTimeAgo(`${diffSeconds} seconds ago`);
      } else if (diffMinutes < 60) {
        setTimeAgo(`${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`);
      } else if (diffHours < 24) {
        setTimeAgo(`${diffHours} hour${diffHours > 1 ? 's' : ''} ago`);
      } else {
        setTimeAgo(lastSaved.toLocaleDateString());
      }
    };

    updateTimeAgo();

    // Update every 10 seconds
    const interval = setInterval(updateTimeAgo, 10000);

    return () => clearInterval(interval);
  }, [lastSaved]);

  if (!lastSaved || !timeAgo) {
    return null;
  }

  const displayText = `${label} ${timeAgo}`;

  if (variant === 'text') {
    return (
      <Text size="xs" c="dimmed">
        {displayText}
      </Text>
    );
  }

  return (
    <Badge variant="light" color="green" size="sm">
      {displayText}
    </Badge>
  );
}


// FILE: rng-forms/components/FormHistoryPanel.tsx

import {
  ActionIcon,
  Badge,
  Group,
  Paper,
  ScrollArea,
  Stack,
  Text,
  Timeline,
  Tooltip,
} from '@mantine/core';
import { IconArrowBackUp, IconArrowForwardUp, IconHistory, IconTrash } from '@tabler/icons-react';

interface HistoryEntry {
  values: any;
  timestamp: Date;
}

interface FormHistoryPanelProps {
  /**
   * History entries from useFormHistory
   */
  history: HistoryEntry[];
  /**
   * Current history index
   */
  currentIndex: number;
  /**
   * Callback to navigate to specific history entry
   */
  onGoToIndex: (index: number) => void;
  /**
   * Callback to undo
   */
  onUndo: () => void;
  /**
   * Callback to redo
   */
  onRedo: () => void;
  /**
   * Whether undo is available
   */
  canUndo: boolean;
  /**
   * Whether redo is available
   */
  canRedo: boolean;
  /**
   * Callback to clear history
   */
  onClearHistory: () => void;
  /**
   * Maximum height of the panel (default: 400px)
   */
  maxHeight?: number;
}

/**
 * Visual history timeline panel showing form changes with undo/redo controls
 *
 * @example
 * const historyState = useFormHistory();
 * <FormHistoryPanel {...historyState} />
 */
export function FormHistoryPanel({
  history,
  currentIndex,
  onGoToIndex,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onClearHistory,
  maxHeight = 400,
}: FormHistoryPanelProps) {
  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);

    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    return date.toLocaleTimeString();
  };

  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Group gap="xs">
            <IconHistory size={20} />
            <Text fw={600}>Form History</Text>
            <Badge variant="light" size="sm">
              {history.length} entries
            </Badge>
          </Group>
          <Group gap="xs">
            <Tooltip label="Undo (Ctrl+Z)">
              <ActionIcon variant="subtle" onClick={onUndo} disabled={!canUndo} aria-label="Undo">
                <IconArrowBackUp size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Redo (Ctrl+Y)">
              <ActionIcon variant="subtle" onClick={onRedo} disabled={!canRedo} aria-label="Redo">
                <IconArrowForwardUp size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Clear History">
              <ActionIcon
                variant="subtle"
                color="red"
                onClick={onClearHistory}
                disabled={history.length <= 1}
                aria-label="Clear history"
              >
                <IconTrash size={18} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>

        <ScrollArea h={maxHeight}>
          <Timeline active={currentIndex} bulletSize={24} lineWidth={2}>
            {history.map((entry, index) => {
              const isCurrent = index === currentIndex;
              const isPast = index < currentIndex;

              return (
                <Timeline.Item
                  key={index}
                  bullet={
                    <Text size="xs" fw={isCurrent ? 700 : 400}>
                      {index + 1}
                    </Text>
                  }
                  title={
                    <Group gap="xs">
                      <Text size="sm" fw={isCurrent ? 600 : 400} c={isCurrent ? 'blue' : undefined}>
                        {isCurrent ? 'Current State' : `Change ${index + 1}`}
                      </Text>
                      {isCurrent && (
                        <Badge size="xs" variant="filled">
                          Active
                        </Badge>
                      )}
                    </Group>
                  }
                  style={{
                    cursor: 'pointer',
                    opacity: isPast || isCurrent ? 1 : 0.5,
                  }}
                  onClick={() => onGoToIndex(index)}
                >
                  <Text size="xs" c="dimmed">
                    {formatTime(entry.timestamp)}
                  </Text>
                </Timeline.Item>
              );
            })}
          </Timeline>
        </ScrollArea>
      </Stack>
    </Paper>
  );
}


// FILE: rng-forms/components/editors/ImageEditor/CropperDialog.tsx

'use client';

import { Button, Group, Modal, Stack } from '@mantine/core';
import { useEffect, useRef, useState } from 'react';
import { Cropper } from 'react-advanced-cropper';
import 'react-advanced-cropper/dist/style.css';

interface CropperDialogProps {
  file: File;
  onClose: () => void;
  onCrop: (croppedFile: File) => void;
}

const CropperDialog = ({ file, onClose, onCrop }: CropperDialogProps) => {
  const [src, setSrc] = useState<string>('');
  const cropperRef = useRef<any>(null);

  useEffect(() => {
    const reader = new FileReader();
    reader.onload = (e) => setSrc(e.target?.result as string);
    reader.readAsDataURL(file);
  }, [file]);

  const handleCrop = () => {
    if (!cropperRef.current) return;

    const canvas = cropperRef.current.getCanvas();
    if (canvas) {
      canvas.toBlob((blob: Blob) => {
        if (blob) {
          const croppedFile = new File([blob], file.name, { type: file.type });
          onCrop(croppedFile);
        }
      });
    }
  };

  return (
    <Modal opened={true} onClose={onClose} title="Crop Image" size="xl" centered>
      <Stack gap="md">
        <div style={{ height: '400px', overflow: 'hidden' }}>
          {src && <Cropper ref={cropperRef} src={src} />}
        </div>
        <Group justify="flex-end">
          <Button onClick={onClose} variant="light">
            Cancel
          </Button>
          <Button onClick={handleCrop}>Confirm Crop</Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export default CropperDialog;


// FILE: rng-forms/components/editors/ImageEditor/ImageCanvas.tsx

'use client';

import { useEffect, useRef } from 'react';

interface ImageCanvasProps {
  file: File;
  brightness: number;
  contrast: number;
  saturation: number;
  rotation: number;
  flipX: boolean;
  flipY: boolean;
}

// Canvas-based preview so filters apply only to the image, not the surrounding UI
const ImageCanvas = ({
  file,
  brightness,
  contrast,
  saturation,
  rotation,
  flipX,
  flipY,
}: ImageCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let revokedUrl: string | null = null;
    const img = new Image();
    const url = URL.createObjectURL(file);
    revokedUrl = url;
    img.src = url;

    img.onload = () => {
      const cw = canvas.clientWidth || 600;
      const ch = canvas.clientHeight || 420;
      // Fit image into canvas while preserving aspect ratio
      const scale = Math.min(cw / img.width, ch / img.height);
      const drawW = img.width * scale;
      const drawH = img.height * scale;

      canvas.width = cw;
      canvas.height = ch;

      ctx.save();
      ctx.clearRect(0, 0, cw, ch);

      // Position at center
      ctx.translate(cw / 2, ch / 2);
      // Rotation and flips
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);

      // Filters
      const bright = 1 + brightness / 100;
      const cont = 1 + contrast / 100;
      const sat = 1 + saturation / 100;
      ctx.filter = `brightness(${bright}) contrast(${cont}) saturate(${sat})`;

      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();
    };

    return () => {
      if (revokedUrl) URL.revokeObjectURL(revokedUrl);
    };
  }, [file, brightness, contrast, saturation, rotation, flipX, flipY]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '420px',
        border: '1px solid #ccc',
        borderRadius: '8px',
        backgroundColor: '#f5f5f5',
      }}
    />
  );
};

export default ImageCanvas;


// FILE: rng-forms/components/editors/ImageEditor/ImageToolbar.tsx

'use client';

import { Button, Group, Slider, Stack } from '@mantine/core';
import {
  IconCrop,
  IconFlipHorizontal,
  IconFlipVertical,
  IconRotateClockwise,
} from '@tabler/icons-react';
import { useCallback, useState } from 'react';
import { useDebouncedCallback } from '../../../hooks/useDebounce';

interface ImageToolbarProps {
  brightness: number;
  onBrightnessChange: (value: number) => void;
  enableBrightness: boolean;
  contrast: number;
  onContrastChange: (value: number) => void;
  enableContrast: boolean;
  saturation: number;
  onSaturationChange: (value: number) => void;
  enableSaturation: boolean;
  rotation: number;
  onRotate: (degrees: 90 | 180 | 270) => void;
  enableRotation: boolean;
  flipX: boolean;
  flipY: boolean;
  onFlip: (axis: 'x' | 'y') => void;
  enableFlip: boolean;
  onCrop: () => void;
  enableCrop: boolean;
  disabled: boolean;
}

const ImageToolbar = ({
  brightness,
  onBrightnessChange,
  enableBrightness,
  contrast,
  onContrastChange,
  enableContrast,
  saturation,
  onSaturationChange,
  enableSaturation,
  rotation,
  onRotate,
  enableRotation,
  flipX,
  flipY,
  onFlip,
  enableFlip,
  onCrop,
  enableCrop,
  disabled,
}: ImageToolbarProps) => {
  // Local state for immediate UI feedback
  const [localBrightness, setLocalBrightness] = useState(brightness);
  const [localContrast, setLocalContrast] = useState(contrast);
  const [localSaturation, setLocalSaturation] = useState(saturation);

  // Debounced callbacks that actually update the image (with 150ms delay for smooth feel)
  const debouncedBrightnessChange = useDebouncedCallback(onBrightnessChange, 150);
  const debouncedContrastChange = useDebouncedCallback(onContrastChange, 150);
  const debouncedSaturationChange = useDebouncedCallback(onSaturationChange, 150);

  // Handle brightness change: update local state immediately, debounce the callback
  const handleBrightnessChange = useCallback(
    (value: number) => {
      setLocalBrightness(value);
      debouncedBrightnessChange(value);
    },
    [debouncedBrightnessChange],
  );

  // Handle contrast change: update local state immediately, debounce the callback
  const handleContrastChange = useCallback(
    (value: number) => {
      setLocalContrast(value);
      debouncedContrastChange(value);
    },
    [debouncedContrastChange],
  );

  // Handle saturation change: update local state immediately, debounce the callback
  const handleSaturationChange = useCallback(
    (value: number) => {
      setLocalSaturation(value);
      debouncedSaturationChange(value);
    },
    [debouncedSaturationChange],
  );
  return (
    <Stack gap="md">
      {enableBrightness && (
        <div>
          <label
            style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '0.875rem' }}
          >
            Brightness: {localBrightness}
          </label>
          <Slider
            min={-100}
            max={100}
            value={localBrightness}
            onChange={handleBrightnessChange}
            disabled={disabled}
            marks={[
              { value: -100, label: '-100' },
              { value: 0, label: '0' },
              { value: 100, label: '100' },
            ]}
          />
        </div>
      )}

      {enableContrast && (
        <div>
          <label
            style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '0.875rem' }}
          >
            Contrast: {localContrast}
          </label>
          <Slider
            min={-100}
            max={100}
            value={localContrast}
            onChange={handleContrastChange}
            disabled={disabled}
            marks={[
              { value: -100, label: '-100' },
              { value: 0, label: '0' },
              { value: 100, label: '100' },
            ]}
          />
        </div>
      )}

      {enableSaturation && (
        <div>
          <label
            style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '0.875rem' }}
          >
            Saturation: {localSaturation}
          </label>
          <Slider
            min={-100}
            max={100}
            value={localSaturation}
            onChange={handleSaturationChange}
            disabled={disabled}
            marks={[
              { value: -100, label: '-100' },
              { value: 0, label: '0' },
              { value: 100, label: '100' },
            ]}
          />
        </div>
      )}

      {enableRotation && (
        <Group justify="flex-start">
          <label style={{ fontWeight: 500 }}>Rotation:</label>
          <Button
            onClick={() => onRotate(90)}
            disabled={disabled}
            variant="light"
            leftSection={<IconRotateClockwise size={16} />}
          >
            90°
          </Button>
          <Button
            onClick={() => onRotate(180)}
            disabled={disabled}
            variant="light"
            leftSection={<IconRotateClockwise size={16} />}
          >
            180°
          </Button>
          <Button
            onClick={() => onRotate(270)}
            disabled={disabled}
            variant="light"
            leftSection={<IconRotateClockwise size={16} />}
          >
            270°
          </Button>
        </Group>
      )}

      {enableFlip && (
        <Group justify="flex-start">
          <label style={{ fontWeight: 500 }}>Flip:</label>
          <Button
            onClick={() => onFlip('x')}
            disabled={disabled}
            variant={flipX ? 'filled' : 'light'}
            leftSection={<IconFlipHorizontal size={16} />}
          >
            Horizontal
          </Button>
          <Button
            onClick={() => onFlip('y')}
            disabled={disabled}
            variant={flipY ? 'filled' : 'light'}
            leftSection={<IconFlipVertical size={16} />}
          >
            Vertical
          </Button>
        </Group>
      )}

      {enableCrop && (
        <Button
          onClick={onCrop}
          disabled={disabled}
          variant="light"
          leftSection={<IconCrop size={16} />}
        >
          Crop
        </Button>
      )}
    </Stack>
  );
};

export default ImageToolbar;


// FILE: rng-forms/components/editors/PDFEditor/PDFEditorModal.tsx

'use client';

import { Button, Group, Modal, Stack, Text } from '@mantine/core';
import { useState } from 'react';
import { usePDFPages } from '../../../hooks/usePDFPages';
import PDFPages from './PDFPages';

interface PDFEditorModalProps {
  file: File;
  onSave: (editedFile: File) => void;
  onCancel: () => void;
  enablePageDeletion?: boolean;
  enablePageReordering?: boolean;
  enablePageRotation?: boolean;
}

const PDFEditorModal = ({
  file,
  onSave,
  onCancel,
  enablePageDeletion = true,
  enablePageReordering = true,
  enablePageRotation = true,
}: PDFEditorModalProps) => {
  const [isSaving, setIsSaving] = useState(false);
  const { pages, rotatePage, deletePage, reorderPages, undo, redo, canUndo, canRedo, exportPDF } =
    usePDFPages(file);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const editedFile = await exportPDF();
      onSave(editedFile);
    } finally {
      setIsSaving(false);
    }
  };

  const visiblePageCount = pages.filter((p) => !p.deleted).length;

  return (
    <Modal
      opened={true}
      onClose={onCancel}
      title="Edit PDF"
      size="90vw"
      fullScreen={false}
      centered
      styles={{
        content: {
          maxHeight: '95vh',
          display: 'flex',
          flexDirection: 'column',
          width: '90vw',
        },
        body: {
          maxHeight: '85vh',
          overflow: 'auto',
        },
      }}
    >
      <Stack gap="md" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header minimal */}
        <Group justify="space-between" mb="xs">
          <Text fw={600}>
            Pages: {visiblePageCount} / {pages.length}
          </Text>
          <Group gap="xs">
            <Button size="xs" variant="light" onClick={undo} disabled={!canUndo || isSaving}>
              ↶ Undo
            </Button>
            <Button size="xs" variant="light" onClick={redo} disabled={!canRedo || isSaving}>
              ↷ Redo
            </Button>
          </Group>
        </Group>

        {/* Pages display - scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {pages.length > 0 ? (
            <PDFPages
              file={file}
              pages={pages}
              onRotatePage={(idx) => rotatePage(idx, 90)}
              onDeletePage={deletePage}
              onReorderPages={reorderPages}
              enableRotation={enablePageRotation}
              enableDeletion={enablePageDeletion}
              enableReordering={enablePageReordering}
              disabled={isSaving}
            />
          ) : (
            <Stack align="center" justify="center" py="xl">
              <Text c="dimmed">Loading PDF pages...</Text>
            </Stack>
          )}
        </div>

        {/* Action buttons */}
        <Group justify="flex-end" gap="sm">
          <Button onClick={onCancel} disabled={isSaving} variant="light">
            Cancel
          </Button>
          <Button onClick={handleSave} loading={isSaving}>
            Save & Export
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export default PDFEditorModal;


// FILE: rng-forms/components/editors/PDFEditor/PDFPages.tsx

'use client';

import { globalLogger } from '@/lib';
import {
  ActionIcon,
  Center,
  Group,
  Loader,
  Modal,
  SimpleGrid,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import * as pdfjsLib from 'pdfjs-dist';
import { useEffect, useState } from 'react';
import type { PDFPageState } from '../../../hooks/usePDFPages';

// Set up PDF.js worker (Vite-safe)
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).href;
}

interface PDFPagesProps {
  file: File;
  pages: PDFPageState[];
  onRotatePage: (pageIndex: number) => void;
  onDeletePage: (pageIndex: number) => void;
  onReorderPages: (fromIndex: number, toIndex: number) => void;
  enableRotation?: boolean;
  enableDeletion?: boolean;
  enableReordering?: boolean;
  disabled?: boolean;
}

interface RenderedPage {
  index: number;
  dataUrl: string;
  rotation: number;
}

const PDFPages = ({
  file,
  pages,
  onRotatePage,
  onDeletePage,
  onReorderPages,
  enableRotation = true,
  enableDeletion = true,
  enableReordering = true,
  disabled = false,
}: PDFPagesProps) => {
  const [renderedPages, setRenderedPages] = useState<RenderedPage[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [draggedPageId, setDraggedPageId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  // Render PDF pages as canvas/images
  useEffect(() => {
    const renderPages = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const pdf = await pdfjsLib.getDocument(await file.arrayBuffer()).promise;
        const rendered: RenderedPage[] = [];

        for (let i = 1; i <= pdf.numPages; i++) {
          try {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');

            if (!context) {
              globalLogger.warn(`Failed to get canvas context for page ${i}`);
              continue;
            }

            canvas.width = viewport.width;
            canvas.height = viewport.height;

            await page.render({
              canvasContext: context,
              viewport: viewport,
              canvas: canvas,
            }).promise;

            const dataUrl = canvas.toDataURL('image/png');
            const pageState = pages.find((p) => p.index === i - 1);
            rendered.push({
              index: i - 1,
              dataUrl,
              rotation: pageState?.rotation || 0,
            });
          } catch (pageError) {
            globalLogger.error(`Error rendering page ${i}:`, { error: pageError });
          }
        }

        setRenderedPages(rendered);
        if (rendered.length === 0 && pdf.numPages > 0) {
          setError('No pages could be rendered');
        }
      } catch (error) {
        globalLogger.error('Error rendering PDF pages:', { error });
        setError('Failed to load PDF pages');
      } finally {
        setIsLoading(false);
      }
    };

    renderPages();
  }, [file]);

  const orderMap = pages.reduce<Record<number, number>>((acc, page, order) => {
    acc[page.index] = order;
    return acc;
  }, {});

  const visiblePages = renderedPages
    .filter((p) => !pages.find((page) => page.index === p.index && page.deleted))
    .sort((a, b) => (orderMap[a.index] ?? 0) - (orderMap[b.index] ?? 0));

  if (isLoading) {
    return (
      <Stack gap="md" align="center" py="xl">
        <Loader size="sm" />
        <Text size="sm" c="dimmed">
          Rendering PDF pages...
        </Text>
      </Stack>
    );
  }

  if (error) {
    return (
      <Stack gap="md" align="center" py="xl">
        <Text size="sm" c="red">
          {error}
        </Text>
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <div>
        <Text size="sm" fw={500} mb="sm">
          Pages ({visiblePages.length})
        </Text>
        <Text size="xs" c="dimmed">
          {enableReordering && 'Drag to reorder • '}
          {enableRotation && 'Rotate 90° • '}
          {enableDeletion && 'Delete page'}
        </Text>
      </div>

      {visiblePages.length > 0 ? (
        <SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 5 }} spacing="sm">
          {visiblePages.map((renderedPage, idx) => {
            const rotation = pages.find((p) => p.index === renderedPage.index)?.rotation || 0;
            return (
              <div
                key={`${renderedPage.index}-${pages[renderedPage.index]?.rotation || 0}`}
                draggable={enableReordering && !disabled}
                onDragStart={() => {
                  setDraggedIndex(idx);
                  setDraggedPageId(renderedPage.index);
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (draggedIndex !== null && draggedIndex !== idx && draggedPageId !== null) {
                    const fromPage = visiblePages[draggedIndex];
                    const toPage = visiblePages[idx];
                    if (fromPage && toPage) {
                      onReorderPages(fromPage.index, toPage.index);
                    }
                  }
                  setDraggedIndex(null);
                  setDraggedPageId(null);
                }}
                onDragEnd={() => {
                  setDraggedIndex(null);
                  setDraggedPageId(null);
                }}
                onClick={() => setPreviewIndex(renderedPage.index)}
                style={{
                  position: 'relative',
                  borderRadius: '8px',
                  border: `2px solid ${draggedIndex === idx ? '#1971c2' : '#ddd'}`,
                  backgroundColor: '#f5f5f5',
                  cursor: enableReordering && !disabled ? 'move' : 'pointer',
                  opacity: draggedIndex === idx ? 0.7 : 1,
                  transition: 'all 0.2s ease',
                  aspectRatio: '1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {/* Page thumbnail */}
                <img
                  src={renderedPage.dataUrl}
                  alt={`Page ${renderedPage.index + 1}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    backgroundColor: '#f5f5f5',
                    transform: `rotate(${rotation}deg)`,
                    transition: 'transform 0.3s ease',
                  }}
                />

                {/* Page number overlay */}
                <div
                  style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    color: 'white',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                  }}
                >
                  {renderedPage.index + 1}
                </div>

                {/* Page controls */}
                <Group
                  gap={4}
                  style={{
                    position: 'absolute',
                    bottom: '4px',
                    left: '4px',
                    right: '4px',
                  }}
                >
                  {enableRotation && (
                    <Tooltip label="Rotate 90°">
                      <ActionIcon
                        size="sm"
                        variant="light"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRotatePage(renderedPage.index);
                        }}
                        disabled={disabled}
                      >
                        ↻
                      </ActionIcon>
                    </Tooltip>
                  )}
                  {enableDeletion && (
                    <Tooltip label="Delete page">
                      <ActionIcon
                        size="sm"
                        color="red"
                        variant="light"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeletePage(renderedPage.index);
                        }}
                        disabled={disabled}
                        ml="auto"
                      >
                        <IconTrash size={14} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                </Group>
              </div>
            );
          })}
        </SimpleGrid>
      ) : (
        <Center py="xl">
          <Text size="sm" c="dimmed">
            All pages deleted
          </Text>
        </Center>
      )}

      <Modal
        opened={previewIndex !== null}
        onClose={() => setPreviewIndex(null)}
        size="90vw"
        radius="md"
        title={previewIndex !== null ? `Page ${previewIndex + 1}` : 'Page preview'}
        styles={{ body: { paddingTop: 0 } }}
      >
        {previewIndex !== null && (
          <Center>
            <img
              src={renderedPages.find((p) => p.index === previewIndex)?.dataUrl}
              alt={`Page ${previewIndex + 1}`}
              style={{
                maxWidth: '100%',
                maxHeight: '80vh',
                objectFit: 'contain',
              }}
            />
          </Center>
        )}
      </Modal>
    </Stack>
  );
};

export default PDFPages;


// FILE: rng-forms/components/inputs/CalculatedField.tsx

'use client';

import { Paper, Stack, Text } from '@mantine/core';
import { useEffect, useMemo } from 'react';
import { useFormContext, useWatch, type Control, type FieldValues } from 'react-hook-form';
import type { CalculatedInputItem } from '../../types/core';

interface BaseFieldProps<TValues extends FieldValues> {
  control: Control<TValues>;
  error?: string;
}

export default function CalculatedField<TValues extends FieldValues>(
  props: CalculatedInputItem<TValues> & BaseFieldProps<TValues>,
) {
  const { control, label, description, name } = props;
  const { setValue } = useFormContext<TValues>();

  // Watch all values in the form to auto-update calculated field
  const formValues = useWatch({ control }) as TValues;

  const calculation = (props as any).calculation as (values: TValues) => string | number;
  const formatFn = (props as any).formatFn as ((value: string | number) => string) | undefined;
  const format = (props as any).format;

  const { rawResult, displayValue, isError } = useMemo(() => {
    try {
      if (!calculation || typeof calculation !== 'function') {
        return { rawResult: null, displayValue: 'Invalid calculation function', isError: true };
      }

      // Determine the correct scope for calculation
      // If name is like "items.0.total", we need to pass the item at index 0
      // If name is like "grandTotal", we pass the full form values
      let scopedValues: any = formValues;
      const nameParts = String(name).split('.');

      if (nameParts.length > 1) {
        // Navigate to the parent scope (e.g., for "items.0.total", get items[0])
        const parentPath = nameParts.slice(0, -1);
        let current: any = formValues;

        for (const part of parentPath) {
          if (current === undefined || current === null) break;
          current = current[part];
        }

        scopedValues = current || {};
      }

      const result = calculation(scopedValues);

      if (formatFn && typeof formatFn === 'function') {
        return { rawResult: result, displayValue: formatFn(result), isError: false };
      }

      let formatted: any = result;
      if (format && typeof result === 'number') {
        if (format.type === 'percent') {
          formatted = `${(result * 100).toFixed(format.decimals ?? 2)}%`;
        } else if (format.type === 'currency') {
          const locale = format.locale ?? 'en-US';
          const currency = format.currency ?? 'USD';
          formatted = new Intl.NumberFormat(locale, {
            style: 'currency',
            currency,
            minimumFractionDigits: format.decimals ?? 2,
            maximumFractionDigits: format.decimals ?? 2,
          }).format(result);
        } else if (format.type === 'decimal') {
          formatted = result.toFixed(format.decimals ?? 2);
        }
      }
      return { rawResult: result, displayValue: formatted, isError: false };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Calculation error';
      return { rawResult: null, displayValue: `Error: ${message}`, isError: true };
    }
  }, [calculation, formValues, formatFn, format]);

  useEffect(() => {
    if (isError) return;
    if (rawResult === undefined || rawResult === null) return;
    setValue(name as any, rawResult as any, { shouldDirty: false, shouldValidate: false });
  }, [isError, name, rawResult, setValue]);

  return (
    <Stack gap="sm">
      {label && (
        <Text size="sm" fw={600}>
          {label}
        </Text>
      )}

      <Paper p="md" radius="md" withBorder bg="var(--mantine-color-gray-0)">
        <Text size="sm" fw={500}>
          {displayValue !== null ? displayValue : '—'}
        </Text>
      </Paper>

      {description && (
        <Text size="xs" c="dimmed">
          {description}
        </Text>
      )}
    </Stack>
  );
}


// FILE: rng-forms/components/inputs/DateInput.tsx

'use client';

import { DatePickerInput, DateInput as MantineDateInput } from '@mantine/dates';
import { isValid, parseISO } from 'date-fns';
import { useController, type Control, type FieldValues } from 'react-hook-form';
import type { DateInputItem, DateRangeInputItem } from '../../types/core';

interface BaseFieldProps<TValues extends FieldValues> {
  control: Control<TValues>;
  error?: string;
}

export function DateInputField<TValues extends FieldValues>(
  props: DateInputItem<TValues> & BaseFieldProps<TValues>,
) {
  const {
    control,
    name,
    label,
    description,
    placeholder,
    disabled,
    required,
    error,
    clearable,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    type: _,
    ...rest
  } = props;
  const { field, fieldState } = useController({ name, control });
  const mergedError = error ?? fieldState.error?.message;

  // Derive local value from field value
  const getLocalValue = (): Date | null => {
    const val = field.value as any;
    if (!val) return null;

    if (val instanceof Date) {
      return isValid(val) ? val : null;
    } else if (typeof val === 'string') {
      const parsed = parseISO(val);
      return isValid(parsed) ? parsed : null;
    }
    return null;
  };

  const localValue = getLocalValue();

  const handleChange = (value: Date | string | null) => {
    let dateValue: Date | null = null;

    if (value instanceof Date) {
      dateValue = isValid(value) ? value : null;
    } else if (typeof value === 'string' && value) {
      // Parse dd-mm-yyyy format
      const ddmmyyyyPattern = /^(\d{2})-(\d{2})-(\d{4})$/;
      const match = value.match(ddmmyyyyPattern);

      if (match) {
        const day = parseInt(match[1]!, 10);
        const month = parseInt(match[2]!, 10) - 1; // Month is 0-indexed
        const year = parseInt(match[3]!, 10);
        const parsedDate = new Date(year, month, day);

        if (
          isValid(parsedDate) &&
          parsedDate.getDate() === day &&
          parsedDate.getMonth() === month &&
          parsedDate.getFullYear() === year
        ) {
          dateValue = parsedDate;
        }
      } else {
        // Try parsing as ISO string or other formats
        const parsedISO = parseISO(value);
        if (isValid(parsedISO)) {
          dateValue = parsedISO;
        } else {
          const parsedDate = new Date(value);
          if (isValid(parsedDate)) {
            dateValue = parsedDate;
          }
        }
      }
    }

    field.onChange(dateValue);
  };

  return (
    <MantineDateInput
      {...rest}
      label={label}
      description={description}
      placeholder={placeholder || 'dd-mm-yyyy'}
      disabled={disabled}
      required={required}
      error={mergedError}
      clearable={clearable !== false}
      valueFormat="DD-MM-YYYY"
      value={localValue}
      onChange={handleChange as any}
      onBlur={field.onBlur}
    />
  );
}

export function DateRangeInputField<TValues extends FieldValues>(
  props: DateRangeInputItem<TValues> & BaseFieldProps<TValues>,
) {
  const {
    control,
    name,
    label,
    description,
    placeholder,
    disabled,
    required,
    error,
    clearable,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    type: _,
    ...rest
  } = props;
  const { field, fieldState } = useController({ name, control });
  const mergedError = error ?? fieldState.error?.message;

  // Derive local value from field value
  const getLocalValue = (): [Date | null, Date | null] => {
    const val = field.value as any;
    if (!val) return [null, null];

    const parseDate = (v: any): Date | null => {
      if (!v) return null;
      if (v instanceof Date) {
        return isValid(v) ? v : null;
      }
      if (typeof v === 'string') {
        const parsed = parseISO(v);
        return isValid(parsed) ? parsed : null;
      }
      return null;
    };

    if (Array.isArray(val) && val.length === 2) {
      const start = parseDate(val[0]);
      const end = parseDate(val[1]);
      return [start, end];
    }
    return [null, null];
  };

  const localValue = getLocalValue();

  const handleChange = (dates: [Date | null, Date | null] | null) => {
    field.onChange(dates);
  };

  return (
    <DatePickerInput
      {...rest}
      type="range"
      label={label}
      description={description}
      placeholder={placeholder || 'Pick dates'}
      disabled={disabled}
      required={required}
      error={mergedError}
      clearable={clearable !== false}
      valueFormat="DD MMM YYYY"
      value={localValue[0] || localValue[1] ? localValue : undefined}
      onChange={handleChange as any}
      onBlur={field.onBlur}
    />
  );
}

export default DateInputField;


// FILE: rng-forms/components/inputs/MathInputField.tsx

'use client';

import { Autocomplete, Button, Group, Stack, Text } from '@mantine/core';
import { evaluate } from 'mathjs';
import { useMemo, useState } from 'react';
import { useController, useFormContext, type Control, type FieldValues } from 'react-hook-form';
import type { MathInputItem } from '../../types/core';

interface BaseFieldProps<TValues extends FieldValues> {
  control: Control<TValues>;
  error?: string;
}

// Common mathjs functions
const MATH_FUNCTIONS = [
  'sqrt',
  'pow',
  'abs',
  'floor',
  'ceil',
  'round',
  'sin',
  'cos',
  'tan',
  'asin',
  'acos',
  'atan',
  'sinh',
  'cosh',
  'tanh',
  'exp',
  'log',
  'log10',
  'min',
  'max',
  'sum',
  'mean',
  'median',
  'std',
  'var',
];

const OPERATORS = ['+', '-', '*', '/', '%', '^', '**', '(', ')'];

export default function MathInputField<TValues extends FieldValues>(
  props: MathInputItem<TValues> & BaseFieldProps<TValues>,
) {
  const { control, name, label, description, disabled, error } = props;
  const formContext = useFormContext<TValues>();
  const { field, fieldState } = useController({ name, control });
  const mergedError = error ?? fieldState.error?.message;
  const [expression, setExpression] = useState<string>('');
  const [result, setResult] = useState<string | number | null>(null);

  // Get all field names from the form
  const fieldNames = useMemo(() => {
    const values = formContext.getValues();
    return Object.keys(values || {});
  }, [formContext]);

  // Generate autocomplete suggestions based on cursor position
  const autocompleteSuggestions = useMemo(() => {
    const suggestions = new Set<string>();

    // Add field names
    fieldNames.forEach((name) => suggestions.add(name));

    // Add math functions
    MATH_FUNCTIONS.forEach((fn) => suggestions.add(`${fn}(`));

    // Add operators
    OPERATORS.forEach((op) => suggestions.add(op));

    return Array.from(suggestions).sort();
  }, [fieldNames]);

  const handleEvaluate = () => {
    try {
      const context = (props as any).scope || {};
      const values = formContext.getValues();
      const fullContext = { ...values, ...context };
      const evaluated = evaluate(expression, fullContext);
      setResult(evaluated);
      field.onChange(evaluated);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid expression';
      setResult(`Error: ${message}`);
    }
  };

  const getFieldNameHint = () => {
    const availableFields = fieldNames.join(', ');
    return availableFields ? `Available fields: ${availableFields}` : '';
  };

  return (
    <Stack gap="sm">
      {label && (
        <Text size="sm" fw={600}>
          {label}
        </Text>
      )}

      <Autocomplete
        placeholder="e.g., price * quantity or sqrt(16)"
        data={autocompleteSuggestions}
        value={expression}
        onChange={(val) => setExpression(val)}
        disabled={disabled}
        maxDropdownHeight={200}
        limit={10}
        error={typeof result === 'string' && result.startsWith('Error')}
      />

      {fieldNames.length > 0 && (
        <Text size="xs" c="dimmed" lineClamp={2}>
          {getFieldNameHint()}
        </Text>
      )}

      <Stack gap={6}>
        <Text size="xs" c="gray" fw={500}>
          Common functions: {MATH_FUNCTIONS.slice(0, 8).join(', ')}...
        </Text>
        <Text size="xs" c="gray" fw={500}>
          Operators: {OPERATORS.join(' ')}
        </Text>
      </Stack>

      <Group gap="sm">
        <Button size="sm" onClick={handleEvaluate} disabled={disabled}>
          Evaluate
        </Button>
        {result !== null && (
          <Text size="sm" fw={500}>
            = {typeof result === 'number' ? result.toFixed(6) : result}
          </Text>
        )}
      </Group>

      {description && (
        <Text size="xs" c="dimmed">
          {description}
        </Text>
      )}
      {mergedError && (
        <Text size="xs" c="red">
          {mergedError}
        </Text>
      )}
    </Stack>
  );
}


// FILE: rng-forms/components/inputs/SelectionInputs.tsx

'use client';

import {
  Loader,
  Autocomplete as MantineAutocomplete,
  Checkbox as MantineCheckbox,
  MultiSelect as MantineMultiSelect,
  RangeSlider as MantineRangeSlider,
  Select as MantineSelect,
  Slider as MantineSlider,
  Switch as MantineSwitch,
  Radio,
  SegmentedControl,
} from '@mantine/core';
import { useEffect, useMemo, useState } from 'react';
import { useController, type Control, type FieldValues } from 'react-hook-form';
import type {
  AutocompleteInputItem,
  CheckboxInputItem,
  RadioInputItem,
  RangeSliderInputItem,
  SegmentedInputItem,
  SelectInputItem,
  SliderInputItem,
  SwitchInputItem,
} from '../../types/core';

interface BaseFieldProps<TValues extends FieldValues> {
  control: Control<TValues>;
  error?: string;
}

type Option = { label: string; value: string };

type OptionsSource = string[] | Option[] | (() => Promise<Option[]>);

const normalizeOptions = (options: OptionsSource): Option[] => {
  if (Array.isArray(options)) {
    if (options.length === 0) return [];
    if (typeof options[0] === 'string') {
      return (options as string[]).map((v) => ({ label: v, value: v }));
    }
    return options as Option[];
  }
  return [];
};

function useAsyncOptions(source?: OptionsSource) {
  const [data, setData] = useState<Option[]>(
    source && Array.isArray(source) ? normalizeOptions(source) : [],
  );
  const [loading, setLoading] = useState(() => typeof source === 'function');

  useEffect(() => {
    if (typeof source === 'function') {
      let active = true;
      source()
        .then((res) => {
          if (active) setData(normalizeOptions(res));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }
    return undefined;
  }, [source]);

  return { data, loading };
}

export function SelectField<TValues extends FieldValues>(
  props: SelectInputItem<TValues> & BaseFieldProps<TValues>,
) {
  const {
    control,
    name,
    label,
    description,
    placeholder,
    disabled,
    required,
    options,
    searchable,
    clearable,
    multiple,
    error,
    ...rest
  } = props;
  const { field, fieldState } = useController({ name, control });
  const mergedError = error ?? fieldState.error?.message;
  const { data, loading } = useAsyncOptions(options);

  if (multiple) {
    return (
      <MantineMultiSelect
        {...rest}
        {...field}
        data={data}
        label={label}
        description={description}
        placeholder={placeholder}
        disabled={disabled || loading}
        required={required}
        searchable={searchable}
        clearable={clearable}
        error={mergedError}
        rightSection={loading ? <Loader size="xs" /> : undefined}
      />
    );
  }

  return (
    <MantineSelect
      {...rest}
      {...field}
      data={data}
      label={label}
      description={description}
      placeholder={placeholder}
      disabled={disabled || loading}
      required={required}
      searchable={searchable}
      clearable={clearable}
      error={mergedError}
      rightSection={loading ? <Loader size="xs" /> : undefined}
    />
  );
}

export function SegmentedField<TValues extends FieldValues>(
  props: SegmentedInputItem<TValues> & BaseFieldProps<TValues>,
) {
  const {
    control,
    name,
    label,
    description,
    disabled,
    required,
    options,
    fullWidth,
    error,
    ...rest
  } = props;
  const { field, fieldState } = useController({ name, control });
  const mergedError = error ?? fieldState.error?.message;
  const data = useMemo(() => normalizeOptions(options), [options]);

  return (
    <div>
      {label && <div style={{ marginBottom: 6 }}>{label}</div>}
      <SegmentedControl
        {...rest}
        data={data}
        value={field.value}
        onChange={field.onChange}
        disabled={disabled}
        fullWidth={fullWidth}
        aria-label={label || 'Segmented control'}
        aria-required={!!required}
        role="radiogroup"
      />
      {description && (
        <div style={{ color: '#666', fontSize: '0.9rem', marginTop: 4 }}>{description}</div>
      )}
      {mergedError && (
        <div style={{ color: 'red', fontSize: '0.85rem', marginTop: 4 }} role="alert">
          {mergedError}
        </div>
      )}
    </div>
  );
}

export function SwitchField<TValues extends FieldValues>(
  props: SwitchInputItem<TValues> & BaseFieldProps<TValues>,
) {
  const {
    control,
    name,
    label,
    description,
    disabled,
    required,
    onLabel,
    offLabel,
    error,
    ...rest
  } = props;
  const { field, fieldState } = useController({ name, control });
  const mergedError = error ?? fieldState.error?.message;

  return (
    <MantineSwitch
      {...rest}
      label={label}
      description={description}
      checked={!!field.value}
      onChange={(event) => field.onChange(event.currentTarget.checked)}
      disabled={disabled}
      required={required}
      onLabel={onLabel}
      offLabel={offLabel}
      error={mergedError}
      aria-label={!label ? name : undefined}
      aria-required={required}
      aria-invalid={!!mergedError}
    />
  );
}

export function CheckboxField<TValues extends FieldValues>(
  props: CheckboxInputItem<TValues> & BaseFieldProps<TValues>,
) {
  const { control, name, label, description, disabled, required, labelPosition, error, ...rest } =
    props;
  const { field, fieldState } = useController({ name, control });
  const mergedError = error ?? fieldState.error?.message;

  return (
    <MantineCheckbox
      {...rest}
      label={label}
      description={description}
      checked={!!field.value}
      onChange={(event) => field.onChange(event.currentTarget.checked)}
      disabled={disabled}
      required={required}
      labelPosition={labelPosition}
      error={mergedError}
      aria-label={!label ? name : undefined}
      aria-required={required}
      aria-invalid={!!mergedError}
    />
  );
}

export function RadioField<TValues extends FieldValues>(
  props: RadioInputItem<TValues> & BaseFieldProps<TValues>,
) {
  const {
    control,
    name,
    label,
    description,
    disabled,
    required,
    options,
    orientation = 'vertical',
    error,
    ...rest
  } = props;
  const { field, fieldState } = useController({ name, control });
  const mergedError = error ?? fieldState.error?.message;
  const data = useMemo(() => normalizeOptions(options), [options]);

  return (
    <Radio.Group
      {...rest}
      label={label}
      description={description}
      value={field.value}
      onChange={field.onChange}
      required={required}
      error={mergedError}
      aria-label={!label ? name : undefined}
      aria-required={required}
    >
      <div
        role="radiogroup"
        aria-invalid={!!mergedError}
        style={{
          display: 'flex',
          flexDirection: orientation === 'horizontal' ? 'row' : 'column',
          gap: 8,
        }}
      >
        {data.map((opt) => (
          <Radio key={opt.value} value={opt.value} label={opt.label} disabled={disabled} />
        ))}
      </div>
    </Radio.Group>
  );
}

export function AutocompleteField<TValues extends FieldValues>(
  props: AutocompleteInputItem<TValues> & BaseFieldProps<TValues>,
) {
  const {
    control,
    name,
    label,
    description,
    placeholder,
    disabled,
    required,
    options,
    error,
    ...rest
  } = props;
  const { field, fieldState } = useController({ name, control });
  const mergedError = error ?? fieldState.error?.message;
  const { data, loading } = useAsyncOptions(options);

  // Note: Mantine Autocomplete is single-value; `multiple` handled elsewhere if needed.
  return (
    <MantineAutocomplete
      {...rest}
      {...field}
      data={data}
      label={label}
      description={description}
      placeholder={placeholder}
      disabled={disabled || loading}
      required={required}
      error={mergedError}
      rightSection={loading ? <Loader size="xs" /> : undefined}
    />
  );
}

export function SliderField<TValues extends FieldValues>(
  props: SliderInputItem<TValues> & BaseFieldProps<TValues>,
) {
  const { control, name, label, description, disabled, min, max, step, error } = props;
  const { field, fieldState } = useController({ name, control });
  const mergedError = error ?? fieldState.error?.message;

  return (
    <div>
      {label && <div style={{ marginBottom: 6 }}>{label}</div>}
      <MantineSlider
        value={field.value ?? 0}
        onChange={field.onChange}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        aria-label={label || name}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={field.value ?? 0}
        aria-invalid={!!mergedError}
      />
      {description && (
        <div style={{ color: '#666', fontSize: '0.9rem', marginTop: 4 }}>{description}</div>
      )}
      {mergedError && (
        <div role="alert" style={{ color: 'red', fontSize: '0.85rem', marginTop: 4 }}>
          {mergedError}
        </div>
      )}
    </div>
  );
}

export function RangeSliderField<TValues extends FieldValues>(
  props: RangeSliderInputItem<TValues> & BaseFieldProps<TValues>,
) {
  const {
    control,
    name,
    label,
    description,
    disabled,
    required: _required,
    min,
    max,
    step,
    error,
  } = props;
  void _required;
  const { field, fieldState } = useController({ name, control });
  const mergedError = error ?? fieldState.error?.message;

  return (
    <div>
      {label && <div style={{ marginBottom: 6 }}>{label}</div>}
      <MantineRangeSlider
        value={field.value ?? [0, 0]}
        onChange={field.onChange}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        aria-label={label || name}
        aria-valuemin={min}
        aria-valuemax={max}
      />
      {description && (
        <div style={{ color: '#666', fontSize: '0.9rem', marginTop: 4 }}>{description}</div>
      )}
      {mergedError && (
        <div role="alert" style={{ color: 'red', fontSize: '0.85rem', marginTop: 4 }}>
          {mergedError}
        </div>
      )}
    </div>
  );
}


// FILE: rng-forms/components/inputs/StandardInputs.tsx

'use client';

import {
  ColorInput as MantineColorInput,
  NumberInput as MantineNumberInput,
  PasswordInput as MantinePasswordInput,
  TextInput as MantineTextInput,
  PinInput,
  Textarea,
} from '@mantine/core';
import { evaluate } from 'mathjs';

import { useRef } from 'react';
import { useController, type Control, type FieldValues } from 'react-hook-form';
import type {
  ColorInputItem,
  HiddenInputItem,
  MaskInputItem,
  NumberInputItem,
  OTPInputItem,
  PasswordInputItem,
  TextInputItem,
} from '../../types/core';

interface BaseFieldProps<TValues extends FieldValues> {
  control: Control<TValues>;
  error?: string;
}

export function TextInputField<TValues extends FieldValues>(
  props: TextInputItem<TValues> & BaseFieldProps<TValues>,
) {
  const {
    control,
    name,
    label,
    description,
    placeholder,
    disabled,
    required,
    multiline,
    rows,
    resize = 'vertical',
    maxLength,
    autoFocus,
    error,
    ...rest
  } = props;
  const { field, fieldState } = useController({ name, control });
  // Ensure value is always a string for controlled input
  const safeValue = field.value ?? '';
  const mergedError = error ?? fieldState.error?.message;

  // Character counter for maxLength
  const currentLength = typeof field.value === 'string' ? field.value.length : 0;
  const showCounter = maxLength !== undefined && maxLength > 0;
  const descriptionWithCounter = showCounter
    ? `${description || ''}${description ? ' | ' : ''}${currentLength}/${maxLength}`
    : description;

  if (multiline) {
    return (
      <Textarea
        {...field}
        {...rest}
        value={safeValue}
        label={label}
        description={descriptionWithCounter}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        minRows={rows}
        maxLength={maxLength}
        error={mergedError}
        autosize={false}
        style={{ resize }}
        autoFocus={autoFocus}
      />
    );
  }

  return (
    <MantineTextInput
      {...field}
      {...rest}
      value={safeValue}
      label={label}
      description={descriptionWithCounter}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      maxLength={maxLength}
      error={mergedError}
      autoFocus={autoFocus}
    />
  );
}

export function PasswordInputField<TValues extends FieldValues>(
  props: PasswordInputItem<TValues> & BaseFieldProps<TValues>,
) {
  const {
    control,
    name,
    label,
    description,
    placeholder,
    disabled,
    required,
    showStrength = false,
    error,
    ...rest
  } = props;
  const { field, fieldState } = useController({ name, control });
  // Ensure value is always a string for controlled input
  const safeValue = field.value ?? '';
  const mergedError = error ?? fieldState.error?.message;
  const password = (field.value as string) || '';

  // Calculate password strength
  const calculateStrength = (
    pwd: string,
  ): { level: 0 | 1 | 2 | 3; label: string; color: string } => {
    if (!pwd) return { level: 0, label: 'None', color: '#999' };

    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[^a-zA-Z\d]/.test(pwd)) score++;

    if (score <= 1) return { level: 1, label: 'Weak', color: '#ff6b6b' };
    if (score <= 2) return { level: 1, label: 'Fair', color: '#ffa94d' };
    if (score <= 3) return { level: 2, label: 'Good', color: '#ffd43b' };
    return { level: 3, label: 'Strong', color: '#51cf66' };
  };

  const strength = calculateStrength(password);

  return (
    <div>
      <MantinePasswordInput
        {...field}
        {...rest}
        value={safeValue}
        label={label}
        description={description}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        error={mergedError}
      />
      {showStrength && password && (
        <div style={{ marginTop: 8 }}>
          <div
            style={{
              height: 6,
              backgroundColor: '#eee',
              borderRadius: 4,
              overflow: 'hidden',
              marginBottom: 4,
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${((strength.level + 1) / 4) * 100}%`,
                backgroundColor: strength.color,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          <div
            style={{
              fontSize: '0.85rem',
              color: strength.color,
              fontWeight: 600,
            }}
          >
            Strength: {strength.label}
          </div>
        </div>
      )}
    </div>
  );
}

export function NumberInputField<TValues extends FieldValues>(
  props: NumberInputItem<TValues> & BaseFieldProps<TValues>,
) {
  const {
    control,
    name,
    label,
    description,
    placeholder,
    disabled,
    required,
    type: _type,
    enableMath,
    formatOptions,
    autoFocus,
    error,
    ...rest
  } = props;
  void _type;
  const { field, fieldState } = useController({ name, control });
  const mergedError = error ?? fieldState.error?.message;
  const lastValidValue = useRef<number | string | null>(null);

  const locale = 'en-IN';
  const style = formatOptions?.style;

  const currencySymbol =
    style === 'currency' && formatOptions?.currency
      ? new Intl.NumberFormat(locale, { style: 'currency', currency: formatOptions.currency })
          .formatToParts(1)
          .find((p) => p.type === 'currency')?.value
      : undefined;

  const rightSection = (() => {
    if (style === 'unit') return formatOptions?.unit;
    if (style === 'percent') return '%';
    return undefined;
  })();

  const handleBlur = () => {
    if (!enableMath) return;
    const value = field.value as unknown;
    if (value === undefined || value === null || value === '') return;
    try {
      const computed = typeof value === 'number' ? value : evaluate(String(value));
      if (typeof computed === 'number' && Number.isFinite(computed)) {
        lastValidValue.current = computed;
        field.onChange(computed);
      }
    } catch {
      if (lastValidValue.current !== null) {
        field.onChange(lastValidValue.current);
      }
    }
  };

  // When math is enabled, use TextInput for free text entry with labels/description
  if (enableMath) {
    return (
      <MantineTextInput
        {...rest}
        {...field}
        label={label}
        description={description}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        error={mergedError}
        type="text"
        autoFocus={autoFocus}
        onChange={(event) => field.onChange(event.target.value)}
        onBlur={() => {
          handleBlur();
          field.onBlur();
        }}
      />
    );
  }

  return (
    <MantineNumberInput
      {...rest}
      {...field}
      value={field.value ?? ''}
      label={label}
      description={description}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      error={mergedError}
      leftSection={currencySymbol}
      rightSection={rightSection}
      autoFocus={autoFocus}
      thousandSeparator=","
      decimalSeparator="."
      onChange={(val) => field.onChange(val ?? '')}
      onBlur={() => {
        field.onBlur();
      }}
    />
  );
}

export function HiddenInputField<TValues extends FieldValues>(
  props: HiddenInputItem<TValues> & BaseFieldProps<TValues>,
) {
  const { control, name } = props;
  const { field } = useController({ name, control });
  return <input type="hidden" {...field} />;
}

export function MaskInputField<TValues extends FieldValues>(
  props: MaskInputItem<TValues> & BaseFieldProps<TValues>,
) {
  const { control, name, label, description, placeholder, disabled, required, error, mask } = props;
  const { field, fieldState } = useController({ name, control });
  const mergedError = error ?? fieldState.error?.message;

  const applyMask = (rawValue: string) => {
    if (!mask) return rawValue;
    let valueIndex = 0;
    let masked = '';

    for (let i = 0; i < mask.length; i++) {
      const maskChar = mask[i];

      if (maskChar === '#') {
        while (valueIndex < rawValue.length && !/\d/.test(rawValue[valueIndex] ?? '')) {
          valueIndex++;
        }
        if (valueIndex < rawValue.length && /\d/.test(rawValue[valueIndex] ?? '')) {
          masked += rawValue[valueIndex] ?? '';
          valueIndex++;
        } else {
          break;
        }
      } else if (maskChar === 'X') {
        while (valueIndex < rawValue.length && !/[a-zA-Z]/.test(rawValue[valueIndex] ?? '')) {
          valueIndex++;
        }
        if (valueIndex < rawValue.length && /[a-zA-Z]/.test(rawValue[valueIndex] ?? '')) {
          masked += rawValue[valueIndex] ?? '';
          valueIndex++;
        } else {
          break;
        }
      } else if (maskChar === '*') {
        if (valueIndex < rawValue.length) {
          masked += rawValue[valueIndex];
          valueIndex++;
        } else {
          break;
        }
      } else {
        masked += maskChar;
        if (rawValue[valueIndex] === maskChar) {
          valueIndex++;
        }
      }
    }

    return masked;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = applyMask(e.target.value);
    field.onChange(value);
  };

  return (
    <MantineTextInput
      {...field}
      label={label}
      description={description}
      placeholder={placeholder || mask}
      disabled={disabled}
      required={required}
      error={mergedError}
      onChange={handleChange}
      aria-label={label || 'Masked input'}
      aria-required={required}
      aria-invalid={!!mergedError}
      inputMode="text"
    />
  );
}

export function ColorInputField<TValues extends FieldValues>(
  props: ColorInputItem<TValues> & BaseFieldProps<TValues>,
) {
  const {
    control,
    name,
    label,
    description,
    placeholder,
    disabled,
    required,
    error,
    type: _type,
    ...rest
  } = props;
  void _type;
  const { field, fieldState } = useController({ name, control });
  const mergedError = error ?? fieldState.error?.message;

  return (
    <MantineColorInput
      {...field}
      {...rest}
      label={label}
      description={description}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      error={mergedError}
      aria-label={label || 'Color picker'}
      aria-required={required}
      aria-invalid={!!mergedError}
    />
  );
}

export function OTPInputField<TValues extends FieldValues>(
  props: OTPInputItem<TValues> & BaseFieldProps<TValues>,
) {
  const { control, name, disabled, length = 4, error, label, description, required } = props;
  const { field, fieldState } = useController({ name, control });
  const mergedError = error ?? fieldState.error?.message;

  return (
    <div>
      {label && (
        <label
          htmlFor={name}
          style={{
            display: 'block',
            marginBottom: 8,
            fontSize: '0.9rem',
            fontWeight: 500,
          }}
        >
          {label}
          {required && <span style={{ color: 'red', marginLeft: 4 }}>*</span>}
        </label>
      )}
      {description && (
        <div
          style={{
            color: '#666',
            fontSize: '0.85rem',
            marginBottom: 8,
          }}
        >
          {description}
        </div>
      )}
      <PinInput
        length={length}
        value={field.value ?? ''}
        onChange={field.onChange}
        onBlur={field.onBlur}
        disabled={disabled}
        aria-label={label || 'OTP Input'}
        aria-required={required}
        aria-invalid={!!mergedError}
        aria-describedby={mergedError ? `${name}-error` : undefined}
      />
      {mergedError && (
        <div
          id={`${name}-error`}
          role="alert"
          style={{ color: 'red', fontSize: '0.85rem', marginTop: 4 }}
        >
          {mergedError}
        </div>
      )}
    </div>
  );
}


// FILE: rng-forms/components/inputs/TaxonomyInput.tsx

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


// FILE: rng-forms/components/inputs/UploadInputs/FileInput.tsx

'use client';

import { ActionIcon, Button, Group, Progress, Stack, Text, Tooltip } from '@mantine/core';
import { IconFile, IconTrash, IconUpload } from '@tabler/icons-react';
import { nanoid } from 'nanoid';
import { useCallback, useRef, useState } from 'react';
import { useController, type Control, type FieldValues } from 'react-hook-form';
import type { FileInputItem } from '../../../types';

interface FileUploadItem {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

interface BaseFieldProps<TValues extends FieldValues> {
  control: Control<TValues>;
  error?: string;
  disabled?: boolean;
  readOnly?: boolean;
}

export function FileInputField<TValues extends FieldValues>(
  props: FileInputItem<TValues> & BaseFieldProps<TValues>,
) {
  const {
    control,
    name,
    label,
    description,
    required,
    disabled = false,
    readOnly = false,
    error,
    maxSizeMB = 10,
    allowedExtensions = [],
    allowMultiple = true,
    allowDragDrop = true,
  } = props;

  const { field, fieldState } = useController({ name, control });
  const mergedError = error ?? fieldState.error?.message;

  const [files, setFiles] = useState<FileUploadItem[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback(
    (file: File): boolean => {
      const maxSize = maxSizeMB * 1024 * 1024;
      if (file.size > maxSize) {
        return false;
      }

      if (allowedExtensions.length > 0) {
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (!ext || !allowedExtensions.includes(ext)) {
          return false;
        }
      }

      return true;
    },
    [maxSizeMB, allowedExtensions],
  );

  const handleFiles = useCallback(
    (newFiles: File[]) => {
      const validated = newFiles.filter(validateFile);
      if (!allowMultiple) {
        setFiles(
          validated.slice(0, 1).map((file) => ({
            id: nanoid(),
            file,
            progress: 0,
            status: 'pending' as const,
          })),
        );
      } else {
        setFiles((prev) => [
          ...prev,
          ...validated.map((file) => ({
            id: nanoid(),
            file,
            progress: 0,
            status: 'pending' as const,
          })),
        ]);
      }

      const fileNames = validated.map((f) => f.name);
      field.onChange(allowMultiple ? fileNames : fileNames[0]);
    },
    [validateFile, allowMultiple, field],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleFiles(Array.from(e.target.files));
      }
    },
    [handleFiles],
  );

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (allowDragDrop && e.dataTransfer.files) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleMoveFile = useCallback(
    (fromIndex: number, toIndex: number) => {
      const newFiles = [...files];
      const [removed] = newFiles.splice(fromIndex, 1);
      if (removed) {
        newFiles.splice(toIndex, 0, removed);
        setFiles(newFiles);
        field.onChange(newFiles.map((f) => f.file.name));
      }
    },
    [files, field],
  );

  const removeFile = useCallback(
    (fileId: string) => {
      const newFiles = files.filter((f) => f.id !== fileId);
      setFiles(newFiles);
      field.onChange(newFiles.map((f) => f.file.name));
    },
    [files, field],
  );

  return (
    <Stack gap="xs">
      <div>
        {label && (
          <div style={{ fontWeight: 500, marginBottom: 4 }}>
            {label}
            {required && <span style={{ color: 'red' }}>*</span>}
          </div>
        )}
        {description && <div style={{ fontSize: '0.875rem', color: '#666' }}>{description}</div>}
      </div>

      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragActive ? '#339af0' : '#ddd'}`,
          borderRadius: '8px',
          padding: '24px',
          textAlign: 'center',
          backgroundColor: dragActive ? '#f0f8ff' : '#fafafa',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={allowMultiple}
          onChange={handleFileChange}
          disabled={disabled || readOnly}
          style={{ display: 'none' }}
          accept={
            allowedExtensions.length > 0
              ? allowedExtensions.map((ext) => `.${ext}`).join(',')
              : undefined
          }
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || readOnly}
          leftSection={<IconUpload size={16} />}
          variant="light"
        >
          Click to browse or drag files
        </Button>
        {allowDragDrop && (
          <Text size="sm" c="dimmed" mt="xs">
            or drag and drop files here
          </Text>
        )}
      </div>

      {files.length > 0 && (
        <Stack gap="sm">
          <Text size="sm" fw={500}>
            Files ({files.length})
          </Text>
          {files.map((file, index) => (
            <div
              key={file.id}
              style={{
                border: '1px solid #ddd',
                borderRadius: '6px',
                padding: '12px',
                backgroundColor: '#fafafa',
              }}
            >
              <Group justify="space-between" mb="xs">
                <Group gap="xs">
                  <IconFile size={16} />
                  <div>
                    <Text size="sm" fw={500}>
                      {file.file.name}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {(file.file.size / 1024).toFixed(2)} KB
                    </Text>
                  </div>
                </Group>
                <Group gap={4}>
                  {allowMultiple && index > 0 && (
                    <Tooltip label="Move up">
                      <ActionIcon
                        size="sm"
                        variant="light"
                        onClick={() => handleMoveFile(index, index - 1)}
                      >
                        ↑
                      </ActionIcon>
                    </Tooltip>
                  )}
                  {allowMultiple && index < files.length - 1 && (
                    <Tooltip label="Move down">
                      <ActionIcon
                        size="sm"
                        variant="light"
                        onClick={() => handleMoveFile(index, index + 1)}
                      >
                        ↓
                      </ActionIcon>
                    </Tooltip>
                  )}
                  <Button
                    onClick={() => removeFile(file.id)}
                    disabled={disabled || readOnly}
                    variant="subtle"
                    color="red"
                    size="xs"
                    leftSection={<IconTrash size={14} />}
                  >
                    Remove
                  </Button>
                </Group>
              </Group>
              {file.progress > 0 && file.progress < 100 && (
                <Progress value={file.progress} size="sm" />
              )}
            </div>
          ))}
        </Stack>
      )}

      {mergedError && (
        <Text size="sm" c="red">
          {mergedError}
        </Text>
      )}
    </Stack>
  );
}


// FILE: rng-forms/components/inputs/UploadInputs/ImageInput.tsx

'use client';

import { globalLogger } from '@/lib';
import { ActionIcon, Button, Group, Modal, SimpleGrid, Stack, Text, Tooltip } from '@mantine/core';
import { IconPhoto, IconX } from '@tabler/icons-react';
import { nanoid } from 'nanoid';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useController, type Control, type FieldValues } from 'react-hook-form';
import { useImageManipulation } from '../../../hooks/useImageManipulation';
import type { ImageInputItem } from '../../../types';
import CropperDialog from '../../editors/ImageEditor/CropperDialog';
import ImageCanvas from '../../editors/ImageEditor/ImageCanvas';
import ImageToolbar from '../../editors/ImageEditor/ImageToolbar';

interface ImageFileItem {
  id: string;
  file: File;
  preview: string;
}

interface BaseFieldProps<TValues extends FieldValues> {
  control: Control<TValues>;
  error?: string;
  disabled?: boolean;
  readOnly?: boolean;
}

export function ImageInputField<TValues extends FieldValues>(
  props: ImageInputItem<TValues> & BaseFieldProps<TValues>,
) {
  const {
    control,
    name,
    label,
    description,
    required,
    disabled = false,
    readOnly = false,
    error,
    maxSizeMB = 10,
    acceptedFormats = ['jpg', 'jpeg', 'png', 'webp'],
    enableCrop = true,
    enableBrightness = true,
    enableContrast = true,
    enableSaturation = true,
    enableRotation = true,
    enableFlip = true,
    allowMultiple = false,
    compressQuality = 0.8,
    outputFormat = 'webp',
  } = props;

  const { field, fieldState } = useController({ name, control });
  const mergedError = error ?? fieldState.error?.message;

  const [images, setImages] = useState<ImageFileItem[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editingFile = images.find((img) => img.id === editingId);

  const {
    brightness,
    adjustBrightness,
    contrast,
    adjustContrast,
    saturation,
    adjustSaturation,
    rotation,
    rotate,
    flipX,
    flipY,
    flip,
    undo,
    redo,
    canUndo,
    canRedo,
    resetAll,
    exportImage,
  } = useImageManipulation(editingFile?.file || null);

  const normalizedFormats = useMemo(
    () =>
      acceptedFormats.map((fmt) => {
        const f = fmt.trim().toLowerCase();
        if (!f) return '';
        if (f.includes('/')) return f; // mime type
        if (f.startsWith('.')) return f;
        return `.${f}`;
      }),
    [acceptedFormats],
  );

  const setFieldFromImages = useCallback(
    (nextImages: ImageFileItem[]) => {
      const value = allowMultiple
        ? nextImages.map((img) => img.preview)
        : nextImages[0]?.preview || '';
      field.onChange(value);
    },
    [allowMultiple, field],
  );

  const validateFile = useCallback(
    (file: File): boolean => {
      const maxSize = maxSizeMB * 1024 * 1024;
      if (file.size > maxSize) {
        return false;
      }

      const ext = file.name.split('.').pop()?.toLowerCase();
      const extWithDot = ext ? `.${ext}` : '';
      const mime = file.type?.toLowerCase();

      const matchesMime = mime ? normalizedFormats.includes(mime) : false;
      const matchesExt = extWithDot ? normalizedFormats.includes(extWithDot) : false;

      if (normalizedFormats.length > 0 && !matchesMime && !matchesExt) {
        return false;
      }

      return true;
    },
    [maxSizeMB, normalizedFormats],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files ? Array.from(e.target.files) : [];
      if (files.length === 0) return;

      const validFiles = files.filter(validateFile);
      if (!allowMultiple) {
        validFiles.length = 1;
      }

      validFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const preview = event.target?.result as string;
          const imageItem: ImageFileItem = {
            id: nanoid(),
            file,
            preview,
          };
          setImages((prev) => {
            const next = [...prev, imageItem];
            setFieldFromImages(next);
            return next;
          });
        };
        reader.readAsDataURL(file);
      });
    },
    [validateFile, setFieldFromImages],
  );

  const handleEditImage = useCallback((id: string) => {
    setEditingId(id);
    setIsEditing(true);
  }, []);

  const applyFileToState = useCallback(
    (fileToApply: File) =>
      new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const preview = event.target?.result as string;
          setImages((prev) => {
            const next = prev.map((img) =>
              img.id === editingId ? { ...img, file: fileToApply, preview } : img,
            );
            setFieldFromImages(next);
            return next;
          });
          resolve();
        };
        reader.readAsDataURL(fileToApply);
      }),
    [editingId, setFieldFromImages],
  );

  const handleSaveImage = useCallback(async () => {
    if (!editingId) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      globalLogger.debug('Starting save with filters:', {
        brightness,
        contrast,
        saturation,
        rotation,
        flipX,
        flipY,
      });
      const editedFile = await exportImage(outputFormat, compressQuality);
      globalLogger.debug('Exported file:', {
        name: editedFile.name,
        size: editedFile.size,
        type: editedFile.type,
      });
      await applyFileToState(editedFile);
      globalLogger.debug('Applied to state, closing modal');
      setIsEditing(false);
      setEditingId(null);
      setSaveError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save image';
      setSaveError(msg);
      globalLogger.error('Save error:', { error: err });
    } finally {
      setIsSaving(false);
    }
  }, [
    applyFileToState,
    compressQuality,
    editingId,
    exportImage,
    outputFormat,
    brightness,
    contrast,
    saturation,
    rotation,
    flipX,
    flipY,
  ]);

  const handleApplyCrop = useCallback(
    async (croppedFile: File) => {
      if (!editingId) return;
      await applyFileToState(croppedFile);
      setIsCropping(false);
    },
    [applyFileToState, editingId],
  );

  const handleRemoveImage = useCallback(
    (id: string) => {
      setImages((prev) => {
        const next = prev.filter((img) => img.id !== id);
        setFieldFromImages(next);
        return next;
      });
    },
    [setFieldFromImages],
  );

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditingId(null);
  }, []);

  const handleMoveImage = useCallback(
    (fromIndex: number, toIndex: number) => {
      setImages((prev) => {
        const newImages = [...prev];
        const [removed] = newImages.splice(fromIndex, 1);
        if (removed) {
          newImages.splice(toIndex, 0, removed);
          setFieldFromImages(newImages);
          return newImages;
        }
        return prev;
      });
    },
    [setFieldFromImages],
  );

  return (
    <Stack gap="xs">
      <Group justify="space-between">
        <div>
          {label && (
            <div style={{ fontWeight: 500, marginBottom: 4 }}>
              {label}
              {required && <span style={{ color: 'red' }}>*</span>}
            </div>
          )}
          {description && <div style={{ fontSize: '0.875rem', color: '#666' }}>{description}</div>}
        </div>

        {/* Hidden input always mounted so both initial and “add more” buttons can reuse it */}
        <input
          ref={fileInputRef}
          type="file"
          accept={normalizedFormats.join(',')}
          onChange={handleFileSelect}
          disabled={disabled || readOnly}
          multiple={allowMultiple}
          style={{ display: 'none' }}
        />

        {(!allowMultiple || images.length === 0) && (
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || readOnly || (!allowMultiple && images.length > 0)}
            leftSection={<IconPhoto size={16} />}
            variant="light"
          >
            {images.length === 0 ? 'Select Image' : 'Add Image'}
          </Button>
        )}
      </Group>

      {images.length > 0 && (
        <Stack gap="sm">
          <Text size="sm" fw={500}>
            Images ({images.length})
          </Text>
          <SimpleGrid cols={allowMultiple ? { base: 2, sm: 3, md: 4 } : { base: 2 }} spacing="sm">
            {images.map((image, index) => (
              <div
                key={image.id}
                style={{
                  position: 'relative',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  border: '2px solid #ddd',
                  backgroundColor: '#f5f5f5',
                  width: allowMultiple ? '100%' : '160px',
                  maxWidth: allowMultiple ? '100%' : '160px',
                  aspectRatio: '1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src={image.preview}
                  alt={`Preview ${index + 1}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    background: '#f5f5f5',
                    cursor: 'pointer',
                  }}
                  onClick={() => handleEditImage(image.id)}
                />

                {allowMultiple && (
                  <Group
                    gap={4}
                    style={{
                      position: 'absolute',
                      bottom: 8,
                      left: 8,
                      right: 8,
                    }}
                  >
                    {index > 0 && (
                      <Tooltip label="Move up">
                        <ActionIcon
                          size="sm"
                          variant="light"
                          onClick={() => handleMoveImage(index, index - 1)}
                        >
                          ↑
                        </ActionIcon>
                      </Tooltip>
                    )}
                    {index < images.length - 1 && (
                      <Tooltip label="Move down">
                        <ActionIcon
                          size="sm"
                          variant="light"
                          onClick={() => handleMoveImage(index, index + 1)}
                        >
                          ↓
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </Group>
                )}

                <Tooltip label="Delete">
                  <ActionIcon
                    size="sm"
                    color="red"
                    variant="filled"
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                    }}
                    onClick={() => handleRemoveImage(image.id)}
                    disabled={disabled || readOnly}
                  >
                    <IconX size={16} />
                  </ActionIcon>
                </Tooltip>

                <Tooltip label="Edit">
                  <Button
                    size="xs"
                    variant="light"
                    style={{
                      position: 'absolute',
                      top: 4,
                      left: 4,
                    }}
                    onClick={() => handleEditImage(image.id)}
                  >
                    ✎
                  </Button>
                </Tooltip>
              </div>
            ))}
          </SimpleGrid>

          {allowMultiple && images.length > 0 && (
            <Button
              onClick={() => fileInputRef?.current?.click()}
              disabled={disabled || readOnly}
              variant="light"
              size="sm"
            >
              + Add More Images
            </Button>
          )}
        </Stack>
      )}

      {mergedError && <div style={{ color: 'red', fontSize: '0.875rem' }}>{mergedError}</div>}

      {isEditing && editingFile && (
        <Modal opened={true} onClose={() => setIsEditing(false)} title="Edit Image" size="xl">
          <Group align="flex-start" gap="lg">
            <Stack flex={2} gap="md" w="100%">
              <ImageCanvas
                file={editingFile.file}
                brightness={brightness}
                contrast={contrast}
                saturation={saturation}
                rotation={rotation}
                flipX={flipX}
                flipY={flipY}
              />
            </Stack>
            <Stack flex={1} gap="md" w="100%">
              <ImageToolbar
                brightness={brightness}
                onBrightnessChange={adjustBrightness}
                enableBrightness={enableBrightness}
                contrast={contrast}
                onContrastChange={adjustContrast}
                enableContrast={enableContrast}
                saturation={saturation}
                onSaturationChange={adjustSaturation}
                enableSaturation={enableSaturation}
                rotation={rotation}
                onRotate={rotate}
                enableRotation={enableRotation}
                flipX={flipX}
                flipY={flipY}
                onFlip={flip}
                enableFlip={enableFlip}
                onCrop={() => setIsCropping(true)}
                enableCrop={enableCrop}
                disabled={disabled || readOnly}
              />
              <Group justify="flex-end">
                <Button variant="default" onClick={() => setIsEditing(false)} disabled={isSaving}>
                  Cancel
                </Button>
                <Button onClick={handleSaveImage} loading={isSaving}>
                  Save
                </Button>
              </Group>
              {saveError && (
                <div style={{ color: 'red', fontSize: '0.875rem', marginTop: 8 }}>{saveError}</div>
              )}
            </Stack>
          </Group>
        </Modal>
      )}

      {isCropping && editingFile && (
        <CropperDialog
          file={editingFile.file}
          onClose={() => setIsCropping(false)}
          onCrop={handleApplyCrop}
        />
      )}
    </Stack>
  );
}

interface ImageEditorModalProps {
  file: File;
  onSave: (editedFile: File) => Promise<void>;
  onCancel: () => void;
  brightness: number;
  onBrightnessChange: (value: number) => void;
  enableBrightness: boolean;
  contrast: number;
  onContrastChange: (value: number) => void;
  enableContrast: boolean;
  saturation: number;
  onSaturationChange: (value: number) => void;
  enableSaturation: boolean;
  rotation: number;
  onRotate: (degrees: 90 | 180 | 270) => void;
  enableRotation: boolean;
  flipX: boolean;
  flipY: boolean;
  onFlip: (axis: 'x' | 'y') => void;
  enableFlip: boolean;
  onCrop: () => void;
  enableCrop: boolean;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  resetAll: () => void;
  exportImage: (format: any, quality: number) => Promise<File>;
  compressQuality: number;
  outputFormat: string;
}

function ImageEditorModal({
  file,
  onSave,
  onCancel,
  brightness,
  onBrightnessChange,
  enableBrightness,
  contrast,
  onContrastChange,
  enableContrast,
  saturation,
  onSaturationChange,
  enableSaturation,
  rotation,
  onRotate,
  enableRotation,
  flipX,
  flipY,
  onFlip,
  enableFlip,
  onCrop,
  enableCrop,
  undo,
  redo,
  canUndo,
  canRedo,
  resetAll,
  exportImage,
  compressQuality,
  outputFormat,
}: ImageEditorModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isCropping, setIsCropping] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const editedFile = await exportImage(outputFormat, compressQuality);
      await onSave(editedFile);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Modal opened={true} onClose={onCancel} title="Edit Image" size="xl" centered>
        <Group align="flex-start" gap="lg">
          <Stack flex={2} gap="md" w="100%">
            <ImageCanvas
              file={file}
              brightness={brightness}
              contrast={contrast}
              saturation={saturation}
              rotation={rotation}
              flipX={flipX}
              flipY={flipY}
            />
          </Stack>

          <Stack flex={1} gap="md" w="100%">
            <ImageToolbar
              brightness={brightness}
              onBrightnessChange={onBrightnessChange}
              enableBrightness={enableBrightness}
              contrast={contrast}
              onContrastChange={onContrastChange}
              enableContrast={enableContrast}
              saturation={saturation}
              onSaturationChange={onSaturationChange}
              enableSaturation={enableSaturation}
              rotation={rotation}
              onRotate={onRotate}
              enableRotation={enableRotation}
              flipX={flipX}
              flipY={flipY}
              onFlip={onFlip}
              enableFlip={enableFlip}
              onCrop={() => setIsCropping(true)}
              enableCrop={enableCrop}
              disabled={isSaving}
            />

            <Group justify="space-between">
              <Group>
                <Button onClick={undo} disabled={!canUndo || isSaving} variant="light">
                  ↶ Undo
                </Button>
                <Button onClick={redo} disabled={!canRedo || isSaving} variant="light">
                  Redo ↷
                </Button>
                <Button onClick={resetAll} disabled={isSaving} variant="light">
                  Reset
                </Button>
              </Group>
              <Group>
                <Button onClick={onCancel} disabled={isSaving} variant="light">
                  Cancel
                </Button>
                <Button onClick={handleSave} loading={isSaving}>
                  Save & Export
                </Button>
              </Group>
            </Group>
          </Stack>
        </Group>
      </Modal>

      {isCropping && (
        <CropperDialog
          file={file}
          onClose={() => setIsCropping(false)}
          onCrop={() => setIsCropping(false)}
        />
      )}
    </>
  );
}


// FILE: rng-forms/components/inputs/UploadInputs/PDFInput.tsx

'use client';

import { globalLogger } from '@/lib';
import { Button, Group, SimpleGrid, Stack, Text } from '@mantine/core';
import { IconFile } from '@tabler/icons-react';
import * as pdfjsLib from 'pdfjs-dist';
import { useCallback, useRef, useState } from 'react';
import { useController, type Control, type FieldValues } from 'react-hook-form';
import type { PDFInputItem } from '../../../types';
import PDFEditorModal from '../../editors/PDFEditor/PDFEditorModal';

// Set up PDF.js worker (Vite-safe)
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).href;
}

interface PDFFileItem {
  id: string;
  file: File;
  preview: string; // data URL
  pageCount: number;
}

interface BaseFieldProps<TValues extends FieldValues> {
  control: Control<TValues>;
  error?: string;
  disabled?: boolean;
  readOnly?: boolean;
}

export function PDFInputField<TValues extends FieldValues>(
  props: PDFInputItem<TValues> & BaseFieldProps<TValues>,
) {
  const {
    control,
    name,
    label,
    description,
    required,
    disabled = false,
    readOnly = false,
    error,
    maxSizeMB = 50,
    enablePageDeletion = true,
    enablePageReordering = true,
    enablePageRotation = true,
  } = props;

  const { field, fieldState } = useController({ name, control });
  const mergedError = error ?? fieldState.error?.message;

  const [pdfs, setPdfs] = useState<PDFFileItem[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback(
    (file: File): boolean => {
      const maxSize = maxSizeMB * 1024 * 1024;
      if (file.size > maxSize) {
        return false;
      }

      if (!file.type.includes('pdf') && !file.name.endsWith('.pdf')) {
        return false;
      }

      return true;
    },
    [maxSizeMB],
  );

  const getPageCount = useCallback(async (file: File): Promise<number> => {
    try {
      const pdf = await pdfjsLib.getDocument(await file.arrayBuffer()).promise;
      return pdf.numPages;
    } catch {
      return 1;
    }
  }, []);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !validateFile(file)) return;

      const pageCount = await getPageCount(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        const preview = event.target?.result as string;
        const pdfItem: PDFFileItem = {
          id: Date.now().toString(),
          file,
          preview,
          pageCount,
        };
        setPdfs([pdfItem]);
        field.onChange(preview); // Set form value to data URL
      };
      reader.readAsDataURL(file);
    },
    [validateFile, getPageCount, field],
  );

  const editingFile = pdfs.find((pdf) => pdf.id === editingId);

  const handleSaveEdit = useCallback(
    async (editedFile: File) => {
      if (!editingId) return;
      setIsSaving(true);
      setSaveError(null);
      try {
        const reader = new FileReader();
        reader.onload = (event) => {
          const preview = event.target?.result as string;
          setPdfs((prev) => {
            const next = prev.map((pdf) =>
              pdf.id === editingId ? { ...pdf, file: editedFile, preview } : pdf,
            );
            field.onChange(preview); // Update form value with edited file
            return next;
          });
          setIsEditing(false);
          setEditingId(null);
        };
        reader.readAsDataURL(editedFile);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to save PDF';
        setSaveError(msg);
        globalLogger.error('Save error:', { error: err });
      } finally {
        setIsSaving(false);
      }
    },
    [editingId, field],
  );

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditingId(null);
    setSaveError(null);
  }, []);

  const handleRemovePDF = useCallback(() => {
    setPdfs([]);
    field.onChange('');
  }, [field]);

  return (
    <Stack gap="xs">
      <Group justify="space-between">
        <div>
          {label && (
            <div style={{ fontWeight: 500, marginBottom: 4 }}>
              {label}
              {required && <span style={{ color: 'red' }}>*</span>}
            </div>
          )}
          {description && <div style={{ fontSize: '0.875rem', color: '#666' }}>{description}</div>}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          disabled={disabled || readOnly}
          style={{ display: 'none' }}
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || readOnly}
          leftSection={<IconFile size={16} />}
          variant="light"
        >
          Select PDF
        </Button>
      </Group>

      {pdfs.length > 0 && (
        <SimpleGrid cols={{ base: 1 }} spacing="sm">
          <div
            style={{
              borderRadius: '10px',
              border: '1px solid #e0e0e0',
              backgroundColor: '#f8f9fa',
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <Text size="sm" fw={600}>
                {pdfs[0]!.file.name}
              </Text>
              <Text size="xs" c="dimmed">
                {pdfs[0]!.pageCount} page{pdfs[0]!.pageCount !== 1 ? 's' : ''}
              </Text>
            </div>

            <Group gap={6} justify="flex-end" wrap="nowrap">
              <Button
                size="xs"
                variant="light"
                onClick={() => {
                  setEditingId(pdfs[0]!.id);
                  setIsEditing(true);
                }}
                disabled={disabled || readOnly}
              >
                ✎ Edit
              </Button>
              <Button
                size="xs"
                color="red"
                variant="light"
                onClick={handleRemovePDF}
                disabled={disabled || readOnly}
              >
                ✕ Remove
              </Button>
            </Group>
          </div>
        </SimpleGrid>
      )}

      {mergedError && (
        <Text size="sm" c="red">
          {mergedError}
        </Text>
      )}
      {saveError && (
        <Text size="sm" c="red">
          {saveError}
        </Text>
      )}

      {isEditing && editingFile && (
        <PDFEditorModal
          file={editingFile.file}
          onSave={handleSaveEdit}
          onCancel={handleCancelEdit}
          enablePageDeletion={enablePageDeletion}
          enablePageReordering={enablePageReordering}
          enablePageRotation={enablePageRotation}
        />
      )}
    </Stack>
  );
}


// FILE: rng-forms/components/inputs/UploadInputs/PDFPreview.tsx

'use client';

import { Center, Loader, Text } from '@mantine/core';
import { useEffect, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { globalLogger } from '../../../../lib/index';

// react-pdf / pdf.js worker setup (Vite-safe)
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).href;
}

interface PDFPreviewProps {
  file: File;
  onClick?: () => void;
  maxHeight?: string | number;
}

const PDFPreview = ({ file, onClick, maxHeight = '300px' }: PDFPreviewProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // We just toggle loading/error; react-pdf handles actual render
    setIsLoading(false);
    setError(null);
  }, [file]);

  if (isLoading) {
    return (
      <Center style={{ height: maxHeight }}>
        <Loader size="sm" />
      </Center>
    );
  }

  if (error) {
    return (
      <Center style={{ height: maxHeight }}>
        <Text size="sm" c="red">
          {error}
        </Text>
      </Center>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        maxHeight,
        overflow: 'hidden',
        backgroundColor: '#f5f5f5',
        cursor: onClick ? 'pointer' : 'default',
        borderRadius: 8,
      }}
      onClick={onClick}
    >
      <Document
        file={file}
        loading={
          <Center style={{ height: maxHeight }}>
            <Loader size="sm" />
          </Center>
        }
        onLoadError={(err: unknown) => {
          globalLogger.error('Error rendering PDF preview:', { error: err });
          setError('Failed to load PDF');
        }}
      >
        <Page pageNumber={1} width={700} renderTextLayer={false} renderAnnotationLayer={false} />
      </Document>
    </div>
  );
};

export default PDFPreview;


// FILE: rng-forms/components/layouts/ArrayField.tsx

'use client';

import { ActionIcon, Button, Card, Grid, Group, Stack, Text } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { useFieldArray, useFormContext, type FieldValues } from 'react-hook-form';
import FieldWrapper from '../../core/FieldWrapper';
import type { ArrayFieldItem, RNGFormItem } from '../../types/core';

export default function ArrayField<TValues extends FieldValues>(
  props: ArrayFieldItem<TValues> | { item: ArrayFieldItem<TValues> },
) {
  // Handle both direct props and wrapped item prop
  const item =
    'item' in props && typeof props.item === 'object'
      ? props.item
      : (props as ArrayFieldItem<TValues>);

  const { control } = useFormContext<TValues>();
  const { fields, append, remove } = useFieldArray({ control, name: item.name as any });

  const handleAdd = () => {
    const defaultValue: any = {};
    item.itemSchema.forEach((child: RNGFormItem<any>) => {
      const childName = (child as any).name || '';
      const childDefault = (child as any).defaultValue;
      // Strip any prefix so defaults map to the item field keys (e.g., 'name', 'role')
      const finalKey = childName.includes('.')
        ? childName.split('.').pop() || childName
        : childName;
      defaultValue[finalKey] = childDefault !== undefined ? childDefault : '';
    });
    append(defaultValue);
  };

  return (
    <Stack gap="sm">
      <Group justify="space-between" align="center">
        <Text fw={600}>{item.addLabel || 'Items'}</Text>
        <Button size="xs" leftSection={<IconPlus size={14} />} variant="light" onClick={handleAdd}>
          {item.addLabel || 'Add'}
        </Button>
      </Group>

      <Stack gap="sm">
        {fields.map((field, idx) => (
          <Card key={field.id} withBorder padding="md" radius="md">
            <Group justify="space-between" align="flex-start" mb="sm">
              <Text size="sm" fw={600}>
                Item {idx + 1}
              </Text>
              <ActionIcon
                color="red"
                variant="subtle"
                onClick={() => remove(idx)}
                disabled={item.minItems !== undefined && fields.length <= item.minItems}
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Group>

            <Grid gutter="md">
              {item.itemSchema.map((child: RNGFormItem<any>, childIdx: number) => {
                // Ensure colProps are always set, default to full width
                const childWithColProps = {
                  ...child,
                  name: `${item.name}.${idx}.${(child as any).name}`,
                  colProps: (child as any).colProps || { span: 12 },
                };
                return (
                  <FieldWrapper key={`${field.id}-${childIdx}`} item={childWithColProps as any} />
                );
              })}
            </Grid>
          </Card>
        ))}
      </Stack>
    </Stack>
  );
}


// FILE: rng-forms/components/layouts/ArrayFieldEnhanced.tsx

'use client';

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Checkbox,
  Group,
  Menu,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import {
  IconCopy,
  IconDotsVertical,
  IconGripVertical,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';
import { useState } from 'react';
import { useFieldArray, useFormContext, type FieldValues } from 'react-hook-form';
import FieldWrapper from '../../core/FieldWrapper';
import type { ArrayFieldItem, RNGFormItem } from '../../types/core';

interface SortableItemProps {
  id: string;
  index: number;
  item: ArrayFieldItem<any>;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  disabled: boolean;
  children: React.ReactNode;
}

function SortableItem({
  id,
  index,
  item,
  isSelected,
  onSelect,
  onRemove,
  onDuplicate,
  disabled,
  children,
}: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      withBorder
      padding="md"
      radius="md"
      bg={isSelected ? 'var(--mantine-color-blue-0)' : undefined}
    >
      <Group justify="space-between" align="flex-start" mb="sm" wrap="nowrap">
        <Group gap="xs" wrap="nowrap">
          <Checkbox
            checked={isSelected}
            onChange={(e) => onSelect(e.currentTarget.checked)}
            aria-label={`Select item ${index + 1}`}
          />
          <ActionIcon
            {...attributes}
            {...listeners}
            variant="subtle"
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            aria-label="Drag to reorder"
          >
            <IconGripVertical size={16} />
          </ActionIcon>
          <Text size="sm" fw={600}>
            Item {index + 1}
          </Text>
        </Group>

        <Menu position="bottom-end" withinPortal>
          <Menu.Target>
            <ActionIcon variant="subtle" size="sm" aria-label="Item options">
              <IconDotsVertical size={16} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item leftSection={<IconCopy size={14} />} onClick={onDuplicate}>
              Duplicate
            </Menu.Item>
            <Menu.Item
              leftSection={<IconTrash size={14} />}
              color="red"
              onClick={onRemove}
              disabled={disabled}
            >
              Remove
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>

      <Stack gap="sm">{children}</Stack>
    </Card>
  );
}

export default function ArrayFieldEnhanced<TValues extends FieldValues>(
  props: ArrayFieldItem<TValues> | { item: ArrayFieldItem<TValues> },
) {
  const item =
    'item' in props && typeof props.item === 'object'
      ? props.item
      : (props as ArrayFieldItem<TValues>);

  const { control } = useFormContext<TValues>();
  const { fields, append, remove, move } = useFieldArray({ control, name: item.name as any });

  const [selectedIndexes, setSelectedIndexes] = useState<Set<number>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleAdd = () => {
    const defaultValue: any = {};
    item.itemSchema.forEach((child: RNGFormItem<any>) => {
      const childName = (child as any).name || '';
      defaultValue[childName] = (child as any).defaultValue ?? null;
    });
    append(defaultValue);
  };

  const handleDuplicate = (index: number) => {
    const itemToDuplicate = fields[index];
    if (itemToDuplicate) {
      append(itemToDuplicate as any);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex((field) => field.id === active.id);
      const newIndex = fields.findIndex((field) => field.id === over.id);
      move(oldIndex, newIndex);

      // Update selected indexes after move
      if (selectedIndexes.has(oldIndex)) {
        const newSelected = new Set(selectedIndexes);
        newSelected.delete(oldIndex);
        newSelected.add(newIndex);
        setSelectedIndexes(newSelected);
      }
    }
  };

  const handleSelectAll = () => {
    if (selectedIndexes.size === fields.length) {
      setSelectedIndexes(new Set());
    } else {
      setSelectedIndexes(new Set(fields.map((_, idx) => idx)));
    }
  };

  const handleBulkDelete = () => {
    // Remove in reverse order to maintain correct indexes
    const sortedIndexes = Array.from(selectedIndexes).sort((a, b) => b - a);
    sortedIndexes.forEach((idx) => remove(idx));
    setSelectedIndexes(new Set());
  };

  const selectedCount = selectedIndexes.size;
  const allSelected = selectedCount === fields.length && fields.length > 0;
  const someSelected = selectedCount > 0 && selectedCount < fields.length;

  return (
    <Stack gap="sm">
      <Group justify="space-between" align="center">
        <Group gap="xs">
          <Text fw={600}>{item.addLabel || 'Items'}</Text>
          {fields.length > 0 && (
            <Badge variant="light" size="sm">
              {fields.length} {fields.length === 1 ? 'item' : 'items'}
            </Badge>
          )}
        </Group>
        <Group gap="xs">
          {fields.length > 0 && (
            <>
              <Tooltip label={allSelected ? 'Deselect all' : 'Select all'}>
                <ActionIcon
                  variant="subtle"
                  onClick={handleSelectAll}
                  aria-label={allSelected ? 'Deselect all' : 'Select all'}
                >
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onChange={handleSelectAll}
                    styles={{ input: { cursor: 'pointer' } }}
                  />
                </ActionIcon>
              </Tooltip>
              {selectedCount > 0 && (
                <Tooltip label={`Delete ${selectedCount} selected`}>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    onClick={handleBulkDelete}
                    disabled={
                      item.minItems !== undefined && fields.length - selectedCount < item.minItems
                    }
                    aria-label={`Delete ${selectedCount} selected items`}
                  >
                    <IconTrash size={18} />
                  </ActionIcon>
                </Tooltip>
              )}
            </>
          )}
          <Button
            size="xs"
            leftSection={<IconPlus size={14} />}
            variant="light"
            onClick={handleAdd}
            disabled={item.maxItems !== undefined && fields.length >= item.maxItems}
          >
            {item.addLabel || 'Add'}
          </Button>
        </Group>
      </Group>

      {selectedCount > 0 && (
        <Badge variant="filled" size="lg">
          {selectedCount} item{selectedCount > 1 ? 's' : ''} selected
        </Badge>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
          <Stack gap="sm">
            {fields.map((field, idx) => (
              <SortableItem
                key={field.id}
                id={field.id}
                index={idx}
                item={item}
                isSelected={selectedIndexes.has(idx)}
                onSelect={(checked) => {
                  const newSelected = new Set(selectedIndexes);
                  if (checked) {
                    newSelected.add(idx);
                  } else {
                    newSelected.delete(idx);
                  }
                  setSelectedIndexes(newSelected);
                }}
                onRemove={() => remove(idx)}
                onDuplicate={() => handleDuplicate(idx)}
                disabled={item.minItems !== undefined && fields.length <= item.minItems}
              >
                {item.itemSchema.map((child: RNGFormItem<any>, childIdx: number) => (
                  <FieldWrapper
                    key={`${field.id}-${childIdx}`}
                    item={{ ...child, name: `${item.name}.${idx}.${(child as any).name}` } as any}
                  />
                ))}
              </SortableItem>
            ))}
          </Stack>
        </SortableContext>
      </DndContext>

      {fields.length === 0 && (
        <Card withBorder padding="xl" radius="md">
          <Stack align="center" gap="sm">
            <Text size="sm" c="dimmed">
              No items yet
            </Text>
            <Button size="xs" leftSection={<IconPlus size={14} />} onClick={handleAdd}>
              Add first item
            </Button>
          </Stack>
        </Card>
      )}
    </Stack>
  );
}


// FILE: rng-forms/components/layouts/GroupLayout.tsx

import { SimpleGrid } from '@mantine/core';
import { useMemo } from 'react';
import { type FieldValues } from 'react-hook-form';
import FieldWrapper from '../../core/FieldWrapper';
import type { GroupItem, RNGFormItem } from '../../types/core';

export default function GroupLayout<TValues extends FieldValues>(
  props: GroupItem<TValues> | { item: GroupItem<TValues> },
) {
  // Handle both direct props and wrapped item prop
  const item =
    'item' in props && typeof props.item === 'object' ? props.item : (props as GroupItem<TValues>);

  const content = useMemo(
    () => (
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
        {item.children.map((child: RNGFormItem<any>, idx: number) => (
          <FieldWrapper key={`group-${idx}`} item={child} />
        ))}
      </SimpleGrid>
    ),
    [item.children],
  );

  return content;
}


// FILE: rng-forms/components/layouts/SectionLayout.tsx

import { Accordion, Box, SimpleGrid, Stack, Text } from '@mantine/core';
import { useMemo } from 'react';
import { type FieldValues } from 'react-hook-form';
import FieldWrapper from '../../core/FieldWrapper';
import type { RNGFormItem, SectionItem } from '../../types/core';

export default function SectionLayout<TValues extends FieldValues>(
  props: SectionItem<TValues> | { item: SectionItem<TValues> },
) {
  // Handle both direct props and wrapped item prop
  const item =
    'item' in props && typeof props.item === 'object'
      ? props.item
      : (props as SectionItem<TValues>);

  const content = useMemo(
    () => (
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
        {item.children.map((child: RNGFormItem<any>, idx: number) => (
          <FieldWrapper key={`${item.title}-${idx}`} item={child} />
        ))}
      </SimpleGrid>
    ),
    [item.children, item.title],
  );

  if (item.collapsible) {
    return (
      <Accordion defaultValue={item.defaultOpened ? item.title : ''}>
        <Accordion.Item key={item.title} value={item.title}>
          <Accordion.Control>
            <Stack gap={0}>
              <Text fw={600} size="md">
                {item.title}
              </Text>
              {item.description && (
                <Text size="sm" c="dimmed">
                  {item.description}
                </Text>
              )}
            </Stack>
          </Accordion.Control>
          <Accordion.Panel>{content}</Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    );
  }

  return (
    <Box>
      <Stack gap="sm" mb="md">
        <Text fw={600} size="md">
          {item.title}
        </Text>
        {item.description && (
          <Text size="sm" c="dimmed">
            {item.description}
          </Text>
        )}
      </Stack>
      {content}
    </Box>
  );
}


// FILE: rng-forms/components/layouts/WizardLayout.tsx

'use client';

import { ActionIcon, Button, Group, Stack, Stepper, Text } from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import FieldWrapper from '../../core/FieldWrapper';
import { useRNGContext } from '../../core/FormContext';
import type { WizardItem } from '../../types/core';

export default function WizardLayout<TValues>(
  props: WizardItem<TValues> | { item: WizardItem<TValues> },
) {
  // Handle both direct props and wrapped item prop
  const item =
    'item' in props && typeof props.item === 'object' ? props.item : (props as WizardItem<TValues>);

  const [active, setActive] = useState(0);
  const total = item.steps.length;
  const { isSubmitting } = useRNGContext();
  const { reset } = useFormContext();

  const next = () => setActive((current) => Math.min(current + 1, total - 1));
  const prev = () => setActive((current) => Math.max(current - 1, 0));
  const isLastStep = active === total - 1;

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Group gap="xs">
          <Text size="sm" fw={600}>
            Step {active + 1} of {total}
          </Text>
          <Text size="xs" c="dimmed">
            {Math.round(((active + 1) / total) * 100)}% complete
          </Text>
        </Group>
        <ActionIcon
          variant="subtle"
          color="gray"
          onClick={() => reset()}
          disabled={isSubmitting}
          title="Reset Form"
        >
          <IconRefresh size={18} />
        </ActionIcon>
      </Group>

      <Stepper active={active} onStepClick={setActive} allowNextStepsSelect={false} size="sm">
        {item.steps.map((step, idx) => (
          <Stepper.Step key={idx} label={step.label} description={step.description}>
            <Stack gap="sm">
              {step.children.map((child, childIdx) => (
                <FieldWrapper key={child.type + childIdx} item={child as any} />
              ))}
            </Stack>
          </Stepper.Step>
        ))}
      </Stepper>

      <Group justify="space-between">
        <Button variant="light" onClick={prev} disabled={active === 0 || isSubmitting}>
          Previous
        </Button>
        {isLastStep ? (
          <Button type="submit" loading={isSubmitting}>
            Submit
          </Button>
        ) : (
          <Button onClick={next} disabled={isSubmitting}>
            Next
          </Button>
        )}
      </Group>
    </Stack>
  );
}


// FILE: rng-forms/components/layouts/WizardLayoutEnhanced.tsx

'use client';

import { Badge, Button, Group, Progress, Stack, Stepper, Text } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import FieldWrapper from '../../core/FieldWrapper';
import type { WizardItem } from '../../types/core';

export default function WizardLayoutEnhanced<TValues>(
  props: WizardItem<TValues> | { item: WizardItem<TValues> },
) {
  const item =
    'item' in props && typeof props.item === 'object' ? props.item : (props as WizardItem<TValues>);

  const [active, setActive] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const { trigger, formState } = useFormContext();
  const total = item.steps.length;

  // Get field names for current step
  const getCurrentStepFields = (stepIndex: number): string[] => {
    const step = item.steps[stepIndex];
    const fieldNames: string[] = [];

    if (!step || !step.children) return fieldNames;

    const extractFieldNames = (children: any[]) => {
      children.forEach((child) => {
        if ('name' in child && child.name) {
          fieldNames.push(child.name);
        }
        if (child.type === 'group' && child.children) {
          extractFieldNames(child.children);
        }
        if (child.type === 'section' && child.children) {
          extractFieldNames(child.children);
        }
      });
      ('use client');
    };

    return fieldNames;
  };

  const validateCurrentStep = async (): Promise<boolean> => {
    const fieldNames = getCurrentStepFields(active);
    if (fieldNames.length === 0) return true;

    try {
      const result = await trigger(fieldNames as any);
      return result;
    } catch {
      return false;
    }
  };

  const handleNext = async () => {
    const isValid = await validateCurrentStep();

    if (isValid) {
      setCompletedSteps((prev) => new Set(prev).add(active));
      setActive((current) => Math.min(current + 1, total - 1));
    }
  };

  const handlePrevious = () => {
    setActive((current) => Math.max(current - 1, 0));
  };

  const handleStepClick = async (stepIndex: number) => {
    // Can only go to previous steps or next step if current is valid
    if (stepIndex < active) {
      setActive(stepIndex);
    } else if (stepIndex === active + 1) {
      const isValid = await validateCurrentStep();
      if (isValid) {
        setCompletedSteps((prev) => new Set(prev).add(active));
        setActive(stepIndex);
      }
    }
  };

  const currentStepFields = getCurrentStepFields(active);
  const currentStepErrors = currentStepFields.filter(
    (field) => formState.errors[field as keyof typeof formState.errors],
  );
  const hasErrors = currentStepErrors.length > 0;

  const progress = total > 0 ? Math.round(((active + 1) / total) * 100) : 0;
  const isLastStep = active === total - 1;
  const isFirstStep = active === 0;

  return (
    <Stack gap="lg">
      <Stack gap="xs">
        <Group justify="space-between" align="center">
          <Text size="sm" fw={600}>
            Step {active + 1} of {total}
          </Text>
          <Badge variant="light" color={progress === 100 ? 'green' : 'blue'}>
            {progress}% Complete
          </Badge>
        </Group>
        <Progress value={progress} size="sm" radius="xl" />
      </Stack>

      <Stepper active={active} onStepClick={handleStepClick} allowNextStepsSelect={false} size="sm">
        {item.steps.map((step, idx) => {
          const isCompleted = completedSteps.has(idx) || idx < active;

          return (
            <Stepper.Step
              key={idx}
              label={step.label}
              description={step.description}
              icon={isCompleted ? <IconCheck size={16} /> : undefined}
              color={isCompleted ? 'green' : undefined}
              allowStepSelect={idx <= active}
            >
              <Stack gap="md" mt="md">
                {step.children.map((child: any, childIdx: number) => (
                  <FieldWrapper key={`${idx}-${childIdx}`} item={child} />
                ))}
              </Stack>
            </Stepper.Step>
          );
        })}
      </Stepper>

      {hasErrors && (
        <Text size="sm" c="red">
          Please fix {currentStepErrors.length} error{currentStepErrors.length > 1 ? 's' : ''}{' '}
          before continuing
        </Text>
      )}

      <Group justify="space-between" mt="md">
        <Button variant="subtle" onClick={handlePrevious} disabled={isFirstStep}>
          Previous
        </Button>
        <Button onClick={handleNext} disabled={isLastStep}>
          {isLastStep ? 'Complete' : 'Next'}
        </Button>
      </Group>
    </Stack>
  );
}


// FILE: rng-forms/components/rich/RichText.tsx

'use client';

import { Stack, Text, Tooltip } from '@mantine/core';
import { RichTextEditor } from '@mantine/tiptap';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { Link } from '@tiptap/extension-link';
import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';
import { Table } from '@tiptap/extension-table';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableRow } from '@tiptap/extension-table-row';
import { TextAlign } from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Underline } from '@tiptap/extension-underline';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useController, type Control, type FieldValues } from 'react-hook-form';
import type { RichTextInputItem } from '../../types/core';

interface BaseFieldProps<TValues extends FieldValues> {
  control: Control<TValues>;
  error?: string;
}

export default function RichTextInputField<TValues extends FieldValues>(
  props: RichTextInputItem<TValues> & BaseFieldProps<TValues>,
) {
  const { control, name, label, description, disabled, error } = props;
  const { field, fieldState } = useController({ name, control });
  const mergedError = error ?? fieldState.error?.message;

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
      }),
      Superscript,
      Subscript,
      Highlight,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TextStyle,
      Color,
    ],
    content: field.value || '<p></p>',
    onUpdate: ({ editor }) => {
      field.onChange(editor.getHTML());
    },
    editable: !disabled,
  });

  return (
    <Stack gap="sm">
      {label && (
        <Text size="sm" fw={600}>
          {label}
        </Text>
      )}

      <RichTextEditor editor={editor}>
        <RichTextEditor.Toolbar sticky stickyOffset={60}>
          <RichTextEditor.ControlsGroup>
            <Tooltip label="Bold" withArrow>
              <RichTextEditor.Bold />
            </Tooltip>
            <Tooltip label="Italic" withArrow>
              <RichTextEditor.Italic />
            </Tooltip>
            <Tooltip label="Underline" withArrow>
              <RichTextEditor.Underline />
            </Tooltip>
            <Tooltip label="Strikethrough" withArrow>
              <RichTextEditor.Strikethrough />
            </Tooltip>
            <Tooltip label="Clear formatting" withArrow>
              <RichTextEditor.ClearFormatting />
            </Tooltip>
          </RichTextEditor.ControlsGroup>

          <RichTextEditor.ControlsGroup>
            <Tooltip label="Heading 1" withArrow>
              <RichTextEditor.H1 />
            </Tooltip>
            <Tooltip label="Heading 2" withArrow>
              <RichTextEditor.H2 />
            </Tooltip>
            <Tooltip label="Heading 3" withArrow>
              <RichTextEditor.H3 />
            </Tooltip>
            <Tooltip label="Heading 4" withArrow>
              <RichTextEditor.H4 />
            </Tooltip>
            <Tooltip label="Heading 5" withArrow>
              <RichTextEditor.H5 />
            </Tooltip>
            <Tooltip label="Heading 6" withArrow>
              <RichTextEditor.H6 />
            </Tooltip>
          </RichTextEditor.ControlsGroup>

          <RichTextEditor.ControlsGroup>
            <Tooltip label="Block quote" withArrow>
              <RichTextEditor.Blockquote />
            </Tooltip>
            <Tooltip label="Horizontal rule" withArrow>
              <RichTextEditor.Hr />
            </Tooltip>
            <Tooltip label="Bulleted list" withArrow>
              <RichTextEditor.BulletList />
            </Tooltip>
            <Tooltip label="Numbered list" withArrow>
              <RichTextEditor.OrderedList />
            </Tooltip>
            <Tooltip label="Subscript" withArrow>
              <RichTextEditor.Subscript />
            </Tooltip>
            <Tooltip label="Superscript" withArrow>
              <RichTextEditor.Superscript />
            </Tooltip>
          </RichTextEditor.ControlsGroup>

          <RichTextEditor.ControlsGroup>
            <Tooltip label="Insert link" withArrow>
              <RichTextEditor.Link />
            </Tooltip>
            <Tooltip label="Unlink" withArrow>
              <RichTextEditor.Unlink />
            </Tooltip>
          </RichTextEditor.ControlsGroup>

          <RichTextEditor.ControlsGroup>
            <Tooltip label="Align left" withArrow>
              <RichTextEditor.AlignLeft />
            </Tooltip>
            <Tooltip label="Align center" withArrow>
              <RichTextEditor.AlignCenter />
            </Tooltip>
            <Tooltip label="Justify" withArrow>
              <RichTextEditor.AlignJustify />
            </Tooltip>
            <Tooltip label="Align right" withArrow>
              <RichTextEditor.AlignRight />
            </Tooltip>
          </RichTextEditor.ControlsGroup>

          <RichTextEditor.ControlsGroup>
            <Tooltip label="Undo" withArrow>
              <RichTextEditor.Undo />
            </Tooltip>
            <Tooltip label="Redo" withArrow>
              <RichTextEditor.Redo />
            </Tooltip>
          </RichTextEditor.ControlsGroup>

          <RichTextEditor.ControlsGroup>
            <Tooltip label="Inline code" withArrow>
              <RichTextEditor.Code />
            </Tooltip>
            <Tooltip label="Code block" withArrow>
              <RichTextEditor.CodeBlock />
            </Tooltip>
          </RichTextEditor.ControlsGroup>

          <RichTextEditor.ColorPicker
            colors={[
              '#25262b',
              '#868e96',
              '#fa5252',
              '#e64980',
              '#be4bdb',
              '#7950f2',
              '#4c6ef5',
              '#228be6',
              '#15aabf',
              '#12b886',
              '#40c057',
              '#82c91e',
              '#fab005',
              '#fd7e14',
            ]}
          />

          <RichTextEditor.ControlsGroup>
            <Tooltip label="Insert table" withArrow>
              <RichTextEditor.Control
                onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3 }).run()}
                aria-label="Insert table"
                title="Insert table"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <line x1="3" y1="9" x2="21" y2="9" />
                  <line x1="3" y1="15" x2="21" y2="15" />
                  <line x1="9" y1="3" x2="9" y2="21" />
                  <line x1="15" y1="3" x2="15" y2="21" />
                </svg>
              </RichTextEditor.Control>
            </Tooltip>
            <Tooltip label="Add column before" withArrow>
              <RichTextEditor.Control
                onClick={() => editor?.chain().focus().addColumnBefore().run()}
                aria-label="Add column before"
                title="Add column before"
              >
                ⬅️+
              </RichTextEditor.Control>
            </Tooltip>
            <Tooltip label="Add column after" withArrow>
              <RichTextEditor.Control
                onClick={() => editor?.chain().focus().addColumnAfter().run()}
                aria-label="Add column after"
                title="Add column after"
              >
                +➡️
              </RichTextEditor.Control>
            </Tooltip>
            <Tooltip label="Delete column" withArrow>
              <RichTextEditor.Control
                onClick={() => editor?.chain().focus().deleteColumn().run()}
                aria-label="Delete column"
                title="Delete column"
              >
                ❌📋
              </RichTextEditor.Control>
            </Tooltip>
            <Tooltip label="Add row before" withArrow>
              <RichTextEditor.Control
                onClick={() => editor?.chain().focus().addRowBefore().run()}
                aria-label="Add row before"
                title="Add row before"
              >
                ⬆️+
              </RichTextEditor.Control>
            </Tooltip>
            <Tooltip label="Add row after" withArrow>
              <RichTextEditor.Control
                onClick={() => editor?.chain().focus().addRowAfter().run()}
                aria-label="Add row after"
                title="Add row after"
              >
                +⬇️
              </RichTextEditor.Control>
            </Tooltip>
            <Tooltip label="Delete row" withArrow>
              <RichTextEditor.Control
                onClick={() => editor?.chain().focus().deleteRow().run()}
                aria-label="Delete row"
                title="Delete row"
              >
                ❌📄
              </RichTextEditor.Control>
            </Tooltip>
            <Tooltip label="Delete table" withArrow>
              <RichTextEditor.Control
                onClick={() => editor?.chain().focus().deleteTable().run()}
                aria-label="Delete table"
                title="Delete table"
              >
                ❌📊
              </RichTextEditor.Control>
            </Tooltip>
          </RichTextEditor.ControlsGroup>
        </RichTextEditor.Toolbar>

        <RichTextEditor.Content
          className="rte-visible-table-borders"
          style={{
            minHeight: 200,
            borderColor: mergedError ? 'var(--mantine-color-red-6)' : undefined,
            borderWidth: mergedError ? 2 : undefined,
            borderStyle: 'solid',
          }}
        />
        <style>{`
          /* Visible, distinct table borders for RTE content */
          .rte-visible-table-borders table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #000 !important;
            margin: 8px 0;
          }
          .rte-visible-table-borders th,
          .rte-visible-table-borders td {
            border: 1px solid #000 !important;
            padding: 8px 10px !important;
            vertical-align: top !important;
          }
          .rte-visible-table-borders th {
            background: #f5f5f5 !important;
            font-weight: 600 !important;
          }
          /* Make table outlines a little stronger for contrast */
          .rte-visible-table-borders table[rte-outline],
          .rte-visible-table-borders table:where(*) {
            outline: none;
          }
        `}</style>
      </RichTextEditor>

      {description && (
        <Text size="xs" c="dimmed">
          {description}
        </Text>
      )}
      {mergedError && (
        <Text size="xs" c="red">
          {mergedError}
        </Text>
      )}
    </Stack>
  );
}


// FILE: rng-forms/components/special/DataGridEnhanced.tsx

'use client';

import { ActionIcon, Badge, Box, Button, Group, Menu, Stack, Text, TextInput } from '@mantine/core';
import { IconArrowDown, IconArrowUp, IconDownload, IconSearch, IconX } from '@tabler/icons-react';
import { DataTable, type DataTableColumn } from 'mantine-datatable';
import { useMemo, useState } from 'react';
import { useController, type Control, type FieldValues, type Path } from 'react-hook-form';

interface DataGridEnhancedProps<TValues extends FieldValues, TRecord = any> {
  name: Path<TValues>;
  control: Control<TValues>;
  columns: DataTableColumn<TRecord>[];

  // Enhanced features
  enableSearch?: boolean;
  enableFiltering?: boolean;
  enableSorting?: boolean;
  enableExport?: boolean;
  enablePagination?: boolean;

  // Search options
  searchPlaceholder?: string;
  searchableFields?: string[];

  // Pagination
  pageSize?: number;

  // Export options
  exportFileName?: string;
  exportFormat?: 'csv' | 'json';

  // Callbacks
  onRowClick?: (record: TRecord) => void;
  onSelectionChange?: (selectedRecords: TRecord[]) => void;
}

export default function DataGridEnhanced<TValues extends FieldValues, TRecord = any>(
  props: DataGridEnhancedProps<TValues, TRecord>,
) {
  const {
    name,
    control,
    columns,
    enableSearch = true,
    enableFiltering = false,
    enableSorting = true,
    enableExport = true,
    enablePagination = true,
    searchPlaceholder = 'Search...',
    searchableFields,
    pageSize: defaultPageSize = 10,
    exportFileName = 'data',
    exportFormat = 'csv',
    onRowClick,
    onSelectionChange,
  } = props;

  const { field } = useController({ name, control });
  const allRecords: TRecord[] = useMemo(() => field.value || [], [field.value]);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [selectedRecords, setSelectedRecords] = useState<TRecord[]>([]);

  // Search functionality
  const filteredRecords = useMemo(() => {
    if (!searchQuery || !enableSearch) return allRecords;

    const query = searchQuery.toLowerCase();
    return allRecords.filter((record: any) => {
      const fieldsToSearch = searchableFields || Object.keys(record);
      return fieldsToSearch.some((field) => {
        const value = record[field];
        return value?.toString().toLowerCase().includes(query);
      });
    });
  }, [allRecords, searchQuery, enableSearch, searchableFields]);

  // Sorting functionality
  const sortedRecords = useMemo(() => {
    if (!sortColumn || !enableSorting) return filteredRecords;

    return [...filteredRecords].sort((a: any, b: any) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      if (aValue === bValue) return 0;

      let comparison = 0;
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredRecords, sortColumn, sortDirection, enableSorting]);

  // Pagination
  const paginatedRecords = useMemo(() => {
    if (!enablePagination) return sortedRecords;

    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return sortedRecords.slice(start, end);
  }, [sortedRecords, page, pageSize, enablePagination]);

  const handleSort = (_column: string) => {
    // Sorting is handled through DataTable component
  };

  const handleExport = () => {
    const dataToExport = selectedRecords.length > 0 ? selectedRecords : sortedRecords;

    if (exportFormat === 'csv') {
      exportToCSV(dataToExport);
    } else {
      exportToJSON(dataToExport);
    }
  };

  const exportToCSV = (data: TRecord[]) => {
    // Export is handled through Menu items
    const headers = columns.map((col) => col.accessor as string).filter(Boolean);
    const csvRows = [];

    // Add headers
    csvRows.push(headers.join(','));

    // Add data rows
    data.forEach((record: any) => {
      const values = headers.map((header) => {
        const value = record[header];
        // Escape quotes and wrap in quotes if contains comma
        const escaped = String(value).replace(/"/g, '""');
        return escaped.includes(',') ? `"${escaped}"` : escaped;
      });
      csvRows.push(values.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    downloadBlob(blob, `${exportFileName}.csv`);
  };

  const exportToJSON = (data: TRecord[]) => {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    downloadBlob(blob, `${exportFileName}.json`);
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSelectionChange = (newSelection: TRecord[]) => {
    setSelectedRecords(newSelection);
    onSelectionChange?.(newSelection);
  };

  // Enhance columns with sorting indicators
  const enhancedColumns: DataTableColumn<TRecord>[] = useMemo(() => {
    return columns.map((col) => ({
      ...col,
      sortable: enableSorting,
      titleStyle: { cursor: enableSorting ? 'pointer' : 'default' },
      render: col.render,
      title: (
        <Group gap={4}>
          <Text size="sm" fw={600}>
            {col.title}
          </Text>
          {enableSorting && sortColumn === col.accessor && (
            <Box>
              {sortDirection === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />}
            </Box>
          )}
        </Group>
      ),
    }));
  }, [columns, enableSorting, sortColumn, sortDirection]);

  const totalPages = Math.ceil(sortedRecords.length / pageSize);

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Group gap="sm">
          {enableSearch && (
            <TextInput
              placeholder={searchPlaceholder}
              leftSection={<IconSearch size={16} />}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.currentTarget.value);
                setPage(1); // Reset to first page on search
              }}
              rightSection={
                searchQuery ? (
                  <ActionIcon size="xs" variant="transparent" onClick={() => setSearchQuery('')}>
                    <IconX size={14} />
                  </ActionIcon>
                ) : null
              }
              style={{ width: 300 }}
            />
          )}

          {selectedRecords.length > 0 && (
            <Badge color="blue">{selectedRecords.length} selected</Badge>
          )}
        </Group>

        <Group gap="xs">
          {enableSorting && sortColumn && (
            <Button
              variant="subtle"
              size="xs"
              leftSection={<IconX size={14} />}
              onClick={() => {
                setSortColumn(null);
                setSortDirection('asc');
              }}
            >
              Clear Sort
            </Button>
          )}

          {enableExport && (
            <Menu>
              <Menu.Target>
                <Button
                  variant="light"
                  size="xs"
                  leftSection={<IconDownload size={16} />}
                  disabled={sortedRecords.length === 0}
                >
                  Export
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>Export Format</Menu.Label>
                <Menu.Item
                  leftSection={<IconDownload size={14} />}
                  onClick={() =>
                    exportToCSV(selectedRecords.length > 0 ? selectedRecords : sortedRecords)
                  }
                >
                  Export to CSV
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconDownload size={14} />}
                  onClick={() =>
                    exportToJSON(selectedRecords.length > 0 ? selectedRecords : sortedRecords)
                  }
                >
                  Export to JSON
                </Menu.Item>
                {selectedRecords.length > 0 && (
                  <>
                    <Menu.Divider />
                    <Menu.Label>Selection</Menu.Label>
                    <Menu.Item>Export {selectedRecords.length} selected rows</Menu.Item>
                  </>
                )}
              </Menu.Dropdown>
            </Menu>
          )}
        </Group>
      </Group>

      <DataTable
        columns={enhancedColumns}
        records={paginatedRecords}
        onRowClick={onRowClick ? ({ record }) => onRowClick(record) : undefined}
        selectedRecords={selectedRecords}
        onSelectedRecordsChange={handleSelectionChange}
        withTableBorder
        withColumnBorders
        striped
        highlightOnHover
        minHeight={150}
        noRecordsText="No records found"
        // Pagination props
        page={enablePagination ? page : 1}
        onPageChange={enablePagination ? setPage : () => {}}
        totalRecords={enablePagination ? sortedRecords.length : paginatedRecords.length}
        recordsPerPage={enablePagination ? pageSize : paginatedRecords.length}
        recordsPerPageOptions={enablePagination ? [5, 10, 20, 50] : []}
        onRecordsPerPageChange={enablePagination ? setPageSize : () => {}}
      />

      {enablePagination && (
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Showing {Math.min((page - 1) * pageSize + 1, sortedRecords.length)} to{' '}
            {Math.min(page * pageSize, sortedRecords.length)} of {sortedRecords.length} records
          </Text>
          {searchQuery && (
            <Text size="sm" c="dimmed">
              (filtered from {allRecords.length} total)
            </Text>
          )}
        </Group>
      )}
    </Stack>
  );
}


// FILE: rng-forms/components/special/DataGridField.tsx

'use client';

import { ActionIcon, Button, Group, Stack, Table, Text, TextInput } from '@mantine/core';

import { IconCheck, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import { useController, type Control, type FieldValues } from 'react-hook-form';
import type { DataGridItem } from '../../types/core';

interface BaseFieldProps<TValues extends FieldValues> {
  control: Control<TValues>;
  error?: string;
}

interface Row {
  id: string;
  [key: string]: any;
}

export default function DataGridField<TValues extends FieldValues>(
  props: DataGridItem<TValues> & BaseFieldProps<TValues>,
) {
  const { control, name, columns, editable = false, error } = props;
  const { field, fieldState } = useController({ name, control });
  const mergedError = error ?? fieldState.error?.message;

  const data: Row[] = Array.isArray(field.value) ? field.value : [];
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, any>>({});

  const handleAddRow = () => {
    const newRow: Row = {
      id: `row-${Date.now()}`,
      ...Object.fromEntries(columns.map((col) => [col.field, ''])),
    };
    field.onChange([...data, newRow]);
  };

  const handleEditStart = (row: Row) => {
    setEditingRowId(row.id);
    setEditValues(row);
  };

  const handleEditSave = () => {
    const updated = data.map((row) => (row.id === editingRowId ? editValues : row));
    field.onChange(updated);
    setEditingRowId(null);
  };

  const handleEditCancel = () => {
    setEditingRowId(null);
    setEditValues({});
  };

  const handleDelete = (rowId: string) => {
    field.onChange(data.filter((row) => row.id !== rowId));
  };

  return (
    <Stack gap="sm">
      <Group justify="space-between" align="center">
        <Text fw={600}>Data Grid</Text>
        {editable && (
          <Button size="xs" onClick={handleAddRow}>
            Add Row
          </Button>
        )}
      </Group>

      <div style={{ overflowX: 'auto' }}>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              {columns.map((col) => (
                <Table.Th key={col.field} style={{ width: col.width ? `${col.width}px` : 'auto' }}>
                  {col.header}
                </Table.Th>
              ))}
              {editable && <Table.Th style={{ width: '100px' }}>Actions</Table.Th>}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {data.map((row) =>
              editingRowId === row.id ? (
                <Table.Tr key={row.id}>
                  {columns.map((col) => (
                    <Table.Td key={col.field}>
                      <TextInput
                        size="xs"
                        value={editValues[col.field] ?? ''}
                        onChange={(e) =>
                          setEditValues({ ...editValues, [col.field]: e.currentTarget.value })
                        }
                      />
                    </Table.Td>
                  ))}
                  <Table.Td>
                    <Group gap={4}>
                      <ActionIcon size="sm" color="green" variant="subtle" onClick={handleEditSave}>
                        <IconCheck size={14} />
                      </ActionIcon>
                      <ActionIcon
                        size="sm"
                        color="gray"
                        variant="subtle"
                        onClick={handleEditCancel}
                      >
                        ✕
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ) : (
                <Table.Tr key={row.id}>
                  {columns.map((col) => (
                    <Table.Td key={col.field}>{row[col.field]}</Table.Td>
                  ))}
                  {editable && (
                    <Table.Td>
                      <Group gap={4}>
                        <Button size="xs" variant="subtle" onClick={() => handleEditStart(row)}>
                          Edit
                        </Button>
                        <ActionIcon
                          size="sm"
                          color="red"
                          variant="subtle"
                          onClick={() => handleDelete(row.id)}
                        >
                          <IconTrash size={14} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  )}
                </Table.Tr>
              ),
            )}
          </Table.Tbody>
        </Table>
      </div>

      {mergedError && (
        <Text size="xs" c="red">
          {mergedError}
        </Text>
      )}
    </Stack>
  );
}


// FILE: rng-forms/components/special/Map.tsx

'use client';

import { Card, Stack, Text } from '@mantine/core';
import { useController, type Control, type FieldValues } from 'react-hook-form';
import type { GeoInputItem } from '../../types/core';

interface BaseFieldProps<TValues extends FieldValues> {
  control: Control<TValues>;
  error?: string;
}

export default function MapField<TValues extends FieldValues>(
  props: GeoInputItem<TValues> & BaseFieldProps<TValues>,
) {
  const { control, name, label, description, error } = props;
  const { field, fieldState } = useController({ name, control });
  const mergedError = error ?? fieldState.error?.message;

  return (
    <Card
      withBorder
      radius="md"
      padding="md"
      role="region"
      aria-label={label || name}
      aria-invalid={!!mergedError}
    >
      <Stack gap={6}>
        {label && (
          <Text fw={600} size="sm">
            {label}
          </Text>
        )}
        <Text size="xs" c="dimmed">
          Map integration placeholder. Update the value programmatically with lat/lng.
        </Text>
        <Text size="sm" aria-label="Latitude">
          Lat: {(field.value as any)?.lat ?? '—'}
        </Text>
        <Text size="sm" aria-label="Longitude">
          Lng: {(field.value as any)?.lng ?? '—'}
        </Text>
        {description && (
          <Text size="xs" c="dimmed">
            {description}
          </Text>
        )}
        {mergedError && (
          <Text size="xs" c="red" role="alert">
            {mergedError}
          </Text>
        )}
      </Stack>
    </Card>
  );
}


// FILE: rng-forms/components/special/Signature.tsx

'use client';

import { ActionIcon, Box, Group, Text } from '@mantine/core';

import { IconEraser } from '@tabler/icons-react';
import { useRef } from 'react';
import { useController, type Control, type FieldValues } from 'react-hook-form';
import SignatureCanvas from 'react-signature-canvas';
import type { SignatureInputItem } from '../../types/core';

interface BaseFieldProps<TValues extends FieldValues> {
  control: Control<TValues>;
  error?: string;
}

export default function Signature<TValues extends FieldValues>(
  props: SignatureInputItem<TValues> & BaseFieldProps<TValues>,
) {
  const { control, name, label, description, disabled, error } = props;
  const { field, fieldState } = useController({ name, control });
  const mergedError = error ?? fieldState.error?.message;
  const signatureRef = useRef<SignatureCanvas | null>(null);

  const handleClear = () => {
    if (signatureRef.current) {
      signatureRef.current.clear();
    }
    field.onChange('');
  };

  return (
    <Box>
      {label && (
        <Group justify="space-between" mb={6} gap="xs">
          <Text size="sm" fw={600}>
            {label}
          </Text>
          <ActionIcon
            variant="light"
            size="sm"
            onClick={handleClear}
            disabled={disabled}
            aria-label="Clear signature"
          >
            <IconEraser size={16} />
          </ActionIcon>
        </Group>
      )}

      <Box
        style={{
          border: '1px solid var(--mantine-color-gray-4)',
          borderRadius: 8,
          overflow: 'hidden',
          background: '#fff',
        }}
        role="img"
        aria-label={label || 'Signature canvas'}
        aria-invalid={!!mergedError}
      >
        <SignatureCanvas
          ref={signatureRef}
          canvasProps={
            {
              width: 500,
              height: 200,
              style: { width: '100%', height: 200, display: 'block', cursor: 'crosshair' },
              'aria-label': 'Sign here',
            } as any
          }
          onEnd={() => {
            const data = signatureRef.current?.toDataURL() ?? '';
            field.onChange(data);
          }}
          penColor="black"
        />
      </Box>

      {description && (
        <Text size="xs" c="dimmed" mt={4}>
          {description}
        </Text>
      )}
      {mergedError && (
        <Text size="xs" c="red" mt={4} role="alert">
          {mergedError}
        </Text>
      )}
    </Box>
  );
}


// FILE: rng-forms/config.ts

/**
 * Configuration for field rendering behavior
 */

import { RNGFormItem } from './types/core';

/**
 * Field configuration options
 */
interface FieldConfig {
  /**
   * If true, the field renders its own label internally
   * If false, FieldWrapper should render the label
   */
  hasInternalLabel?: boolean;
}

/**
 * Extract all possible type values from RNGFormItem
 */
type FieldType = RNGFormItem['type'];

/**
 * Configuration map for each field type
 * Determines how FieldWrapper should handle labels and other rendering behavior
 */
export const FIELD_CONFIG: Record<FieldType, FieldConfig> = {
  // Primitives: FieldWrapper renders label
  text: { hasInternalLabel: false },
  password: { hasInternalLabel: false },
  number: { hasInternalLabel: false },
  color: { hasInternalLabel: false },
  otp: { hasInternalLabel: false },
  mask: { hasInternalLabel: false },
  hidden: { hasInternalLabel: true }, // Hidden doesn't need wrapper label

  // Selection: FieldWrapper renders label
  select: { hasInternalLabel: false },
  checkbox: { hasInternalLabel: false },
  switch: { hasInternalLabel: false },
  radio: { hasInternalLabel: false },
  taxonomy: { hasInternalLabel: false },
  segmented: { hasInternalLabel: false },
  autocomplete: { hasInternalLabel: false },
  slider: { hasInternalLabel: false },
  'range-slider': { hasInternalLabel: false },

  // Date: FieldWrapper renders label
  date: { hasInternalLabel: false },
  'date-range': { hasInternalLabel: false },

  // Rich content: FieldWrapper renders label
  'rich-text': { hasInternalLabel: false },
  signature: { hasInternalLabel: false },

  // Special: FieldWrapper renders label
  geo: { hasInternalLabel: false },
  math: { hasInternalLabel: false },
  calculated: { hasInternalLabel: false },

  // Upload: FieldWrapper renders label
  'image-upload': { hasInternalLabel: false },
  'pdf-upload': { hasInternalLabel: false },
  'file-upload': { hasInternalLabel: false },

  // Layouts: Manage their own titles/labels
  section: { hasInternalLabel: true },
  group: { hasInternalLabel: true },
  array: { hasInternalLabel: true },
  'data-grid': { hasInternalLabel: true },
} as Record<FieldType, FieldConfig>;

/**
 * Check if a field type has an internal label
 */
export function hasInternalLabel(type: FieldType): boolean {
  return FIELD_CONFIG[type]?.hasInternalLabel ?? false;
}


// FILE: rng-forms/core/FieldErrorBoundary.tsx

'use client';

import { Alert, Button, Stack, Text } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import React from 'react';
import { globalLogger } from '../../lib';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component that catches JavaScript errors in child components
 * and displays a fallback UI instead of crashing the entire form
 *
 * @example
 * <ErrorBoundary>
 *   <RNGForm schema={schema} onSubmit={handleSubmit} />
 * </ErrorBoundary>
 */
export class FieldErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error for debugging
    globalLogger.error('Field Error Boundary caught an error:', { error, errorInfo });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <Alert
          icon={<IconAlertTriangle size={16} />}
          title="Field Error"
          color="red"
          variant="light"
          withCloseButton={false}
        >
          <Stack gap="xs">
            <Text size="sm">This field encountered an error and could not be displayed.</Text>
            {this.state.error && (
              <Text size="xs" c="dimmed" style={{ fontFamily: 'monospace' }}>
                {this.state.error.message}
              </Text>
            )}
            <Button size="xs" variant="light" onClick={this.handleReset}>
              Try Again
            </Button>
          </Stack>
        </Alert>
      );
    }

    return this.props.children;
  }
}

export default FieldErrorBoundary;


// FILE: rng-forms/core/FieldWrapper.tsx

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

  const componentElement = (
    <FieldErrorBoundary>
      <Component
        {...item}
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


// FILE: rng-forms/core/FormContext.tsx

'use client';

import { createContext, ReactNode, useContext } from 'react';

/**
 * Global configuration state for RNGForm
 */
export interface RNGContextState {
  readOnly: boolean;
  debug: boolean;
  isSubmitting: boolean;
}

/**
 * Context for RNGForm global configuration
 */
const RNGContext = createContext<RNGContextState | undefined>(undefined);

/**
 * Hook to access RNGForm context
 * @throws Error if used outside of RNGForm provider
 */
export function useRNGContext(): RNGContextState {
  const context = useContext(RNGContext);

  if (context === undefined) {
    throw new Error('useRNGContext must be used within RNGForm');
  }

  return context;
}

/**
 * Provider props
 */
export interface RNGContextProviderProps {
  value: RNGContextState;
  children: ReactNode;
}

/**
 * Provider component for RNGForm context
 */
export function RNGContextProvider({ value, children }: RNGContextProviderProps) {
  return <RNGContext.Provider value={value}>{children}</RNGContext.Provider>;
}

export { RNGContext };


// FILE: rng-forms/core/Registry.tsx

import React from 'react';

const LazyRichText = React.lazy(() => import('../components/rich/RichText'));
const LazyDateInput = React.lazy(() =>
  import('../components/inputs/DateInput').then((m) => ({ default: m.DateInputField })),
);
const LazyDateRangeInput = React.lazy(() =>
  import('../components/inputs/DateInput').then((m) => ({ default: m.DateRangeInputField })),
);
const LazySignature = React.lazy(() => import('../components/special/Signature'));
const LazyMap = React.lazy(() => import('../components/special/Map'));
const LazyWizard = React.lazy(() => import('../components/layouts/WizardLayout'));
const LazySlider = React.lazy(() =>
  import('../components/inputs/SelectionInputs').then((m) => ({ default: m.SliderField })),
);
const LazyRangeSlider = React.lazy(() =>
  import('../components/inputs/SelectionInputs').then((m) => ({ default: m.RangeSliderField })),
);
const LazyHidden = React.lazy(() =>
  import('../components/inputs/StandardInputs').then((m) => ({ default: m.HiddenInputField })),
);
const LazyMask = React.lazy(() =>
  import('../components/inputs/StandardInputs').then((m) => ({ default: m.MaskInputField })),
);

const LazyText = React.lazy(() =>
  import('../components/inputs/StandardInputs').then((m) => ({ default: m.TextInputField })),
);
const LazyPassword = React.lazy(() =>
  import('../components/inputs/StandardInputs').then((m) => ({
    default: m.PasswordInputField,
  })),
);
const LazyNumber = React.lazy(() =>
  import('../components/inputs/StandardInputs').then((m) => ({ default: m.NumberInputField })),
);
const LazyColor = React.lazy(() =>
  import('../components/inputs/StandardInputs').then((m) => ({ default: m.ColorInputField })),
);
const LazyOTP = React.lazy(() =>
  import('../components/inputs/StandardInputs').then((m) => ({ default: m.OTPInputField })),
);
const LazySelect = React.lazy(() =>
  import('../components/inputs/SelectionInputs').then((m) => ({ default: m.SelectField })),
);
const LazySegmented = React.lazy(() =>
  import('../components/inputs/SelectionInputs').then((m) => ({ default: m.SegmentedField })),
);
const LazySwitch = React.lazy(() =>
  import('../components/inputs/SelectionInputs').then((m) => ({ default: m.SwitchField })),
);
const LazyCheckbox = React.lazy(() =>
  import('../components/inputs/SelectionInputs').then((m) => ({ default: m.CheckboxField })),
);
const LazyRadio = React.lazy(() =>
  import('../components/inputs/SelectionInputs').then((m) => ({ default: m.RadioField })),
);
const LazyAutocomplete = React.lazy(() =>
  import('../components/inputs/SelectionInputs').then((m) => ({ default: m.AutocompleteField })),
);
const LazyTaxonomy = React.lazy(() => import('../components/inputs/TaxonomyInput'));
const LazyArrayField = React.lazy(() => import('../components/layouts/ArrayField'));
const LazyMathInput = React.lazy(() => import('../components/inputs/MathInputField'));
const LazyCalculatedField = React.lazy(() => import('../components/inputs/CalculatedField'));
const LazySectionLayout = React.lazy(() => import('../components/layouts/SectionLayout'));
const LazyGroupLayout = React.lazy(() => import('../components/layouts/GroupLayout'));
const LazyDataGrid = React.lazy(() => import('../components/special/DataGridField'));

// Upload components
const LazyImageInput = React.lazy(() =>
  import('../components/inputs/UploadInputs/ImageInput').then((m) => ({
    default: m.ImageInputField,
  })),
);
const LazyPDFInput = React.lazy(() =>
  import('../components/inputs/UploadInputs/PDFInput').then((m) => ({ default: m.PDFInputField })),
);
const LazyFileInput = React.lazy(() =>
  import('../components/inputs/UploadInputs/FileInput').then((m) => ({
    default: m.FileInputField,
  })),
);

export const COMPONENT_REGISTRY: Record<string, React.ComponentType<any>> = {
  // Text / basic
  text: LazyText,
  password: LazyPassword,
  number: LazyNumber,
  hidden: LazyHidden,
  color: LazyColor,
  otp: LazyOTP,
  mask: LazyMask,

  // Selection
  select: LazySelect,
  'multi-select': LazySelect,
  checkbox: LazyCheckbox,
  switch: LazySwitch,
  radio: LazyRadio,
  segmented: LazySegmented,
  autocomplete: LazyAutocomplete,
  taxonomy: LazyTaxonomy,
  slider: LazySlider,
  'range-slider': LazyRangeSlider,

  // Dates & rich
  date: LazyDateInput,
  'date-range': LazyDateRangeInput,
  'rich-text': LazyRichText,

  // Files / media
  signature: LazySignature,

  // Upload
  'image-upload': LazyImageInput,
  'pdf-upload': LazyPDFInput,
  'file-upload': LazyFileInput,

  // Geo / math / calculated
  geo: LazyMap,
  math: LazyMathInput,
  calculated: LazyCalculatedField,

  // Layouts
  section: LazySectionLayout,
  group: LazyGroupLayout,
  wizard: LazyWizard,
  array: LazyArrayField,
  'data-grid': LazyDataGrid,
};


// FILE: rng-forms/dsl/factory.ts

import { Path, PathValue } from 'react-hook-form';
import { z } from 'zod';
import type {
  ArrayFieldItem,
  AutocompleteInputItem,
  CalculatedInputItem,
  CheckboxInputItem,
  ColorInputItem,
  DataGridItem,
  DateInputItem,
  DateRangeInputItem,
  GeoInputItem,
  GroupItem,
  HiddenInputItem,
  MaskInputItem,
  MathInputItem,
  NumberInputItem,
  OTPInputItem,
  PasswordInputItem,
  RadioInputItem,
  RangeSliderInputItem,
  RichTextInputItem,
  RNGFormItem,
  SectionItem,
  SegmentedInputItem,
  SelectInputItem,
  SignatureInputItem,
  SliderInputItem,
  SwitchInputItem,
  TextInputItem,
  WizardItem,
} from '../types/core';

type InferValues<S extends z.ZodTypeAny> = z.infer<S>;

type ScopedPath<TValues, P extends Path<TValues> | undefined> = P extends Path<TValues>
  ? Path<PathValue<TValues, P>>
  : Path<TValues>;

type ChildInput<TValues> =
  | RNGFormItem<TValues>[]
  | ((b: FormBuilderShape<TValues>) => RNGFormItem<TValues>[]);

type FieldFn<Item, TValues, P extends Path<TValues> | undefined> = <
  N extends ScopedPath<TValues, P>,
>(
  name: N,
  props?: Partial<Omit<Item, 'type' | 'name'>>,
) => RNGFormItem<TValues>;

type StepInput<TValues> =
  | WizardItem<TValues>['steps']
  | ((b: FormBuilderShape<TValues>) => WizardItem<TValues>['steps']);

type FormBuilderShape<TValues, P extends Path<TValues> | undefined = undefined> = {
  // standard inputs
  text: FieldFn<TextInputItem<TValues>, TValues, P>;
  password: FieldFn<PasswordInputItem<TValues>, TValues, P>;
  number: FieldFn<NumberInputItem<TValues>, TValues, P>;
  hidden: FieldFn<HiddenInputItem<TValues>, TValues, P>;
  color: FieldFn<ColorInputItem<TValues>, TValues, P>;
  otp: FieldFn<OTPInputItem<TValues>, TValues, P>;
  mask: FieldFn<MaskInputItem<TValues>, TValues, P>;
  // selection
  select: FieldFn<SelectInputItem<TValues>, TValues, P>;
  multiSelect: FieldFn<SelectInputItem<TValues>, TValues, P>;
  checkbox: FieldFn<CheckboxInputItem<TValues>, TValues, P>;
  switch: FieldFn<SwitchInputItem<TValues>, TValues, P>;
  radio: FieldFn<RadioInputItem<TValues>, TValues, P>;
  segmented: FieldFn<SegmentedInputItem<TValues>, TValues, P>;
  autocomplete: FieldFn<AutocompleteInputItem<TValues>, TValues, P>;
  slider: FieldFn<SliderInputItem<TValues>, TValues, P>;
  rangeSlider: FieldFn<RangeSliderInputItem<TValues>, TValues, P>;
  // dates & rich
  date: FieldFn<DateInputItem<TValues>, TValues, P>;
  dateRange: FieldFn<DateRangeInputItem<TValues>, TValues, P>;
  richText: FieldFn<RichTextInputItem<TValues>, TValues, P>;
  // files/media
  signature: FieldFn<SignatureInputItem<TValues>, TValues, P>;
  // special
  geo: FieldFn<GeoInputItem<TValues>, TValues, P>;
  math: FieldFn<MathInputItem<TValues>, TValues, P>;
  calculated: FieldFn<CalculatedInputItem<TValues>, TValues, P>;
  // data grid
  dataGrid: FieldFn<DataGridItem<TValues>, TValues, P>;
  // layouts
  section: (
    title: string,
    children: ChildInput<TValues>,
    props?: Omit<SectionItem<TValues>, 'type' | 'title' | 'children'>,
  ) => SectionItem<TValues>;
  group: (
    children: ChildInput<TValues>,
    props?: Omit<GroupItem<TValues>, 'type' | 'children'>,
  ) => GroupItem<TValues>;
  wizard: (
    steps: StepInput<TValues>,
    props?: Omit<WizardItem<TValues>, 'type' | 'steps'>,
  ) => WizardItem<TValues>;
  array: (
    name: ScopedPath<TValues, P>,
    itemSchema: ChildInput<TValues>,
    props?: Omit<ArrayFieldItem<TValues>, 'type' | 'name' | 'itemSchema'>,
  ) => ArrayFieldItem<TValues>;
  scope: <Next extends ScopedPath<TValues, P>>(
    prefix: Next,
  ) => FormBuilderShape<TValues, Path<TValues>>;
};

function resolveChildren<TValues>(
  children: ChildInput<TValues>,
  builder: FormBuilderShape<TValues, any>,
): RNGFormItem<TValues>[] {
  return typeof children === 'function' ? children(builder) : children;
}

function resolveSteps<TValues>(
  steps: StepInput<TValues>,
  builder: FormBuilderShape<TValues, any>,
): WizardItem<TValues>['steps'] {
  return typeof steps === 'function' ? steps(builder) : steps;
}

function makeBuilder<TValues, P extends Path<TValues> | undefined = undefined>(
  prefix?: P,
): FormBuilderShape<TValues, P> {
  const withPrefix = <N extends ScopedPath<TValues, P>>(name: N): Path<TValues> => {
    return (prefix ? `${prefix}.${String(name)}` : name) as Path<TValues>;
  };

  const buildField =
    <Item extends RNGFormItem<TValues>>(type: Item['type']) =>
    (name: ScopedPath<TValues, P>, props: Partial<Omit<Item, 'type' | 'name'>> = {}) =>
      ({ type, name: withPrefix(name), ...(props as Omit<Item, 'type' | 'name'>) } as Item);

  // Field builders
  const text = buildField<TextInputItem<TValues>>('text');
  const password = buildField<PasswordInputItem<TValues>>('password');
  const number = buildField<NumberInputItem<TValues>>('number');
  const hidden = buildField<HiddenInputItem<TValues>>('hidden');
  const color = buildField<ColorInputItem<TValues>>('color');
  const otp = buildField<OTPInputItem<TValues>>('otp');
  const mask = buildField<MaskInputItem<TValues>>('mask');

  const select = buildField<SelectInputItem<TValues>>('select');
  const multiSelect: FieldFn<SelectInputItem<TValues>, TValues, P> = (name, props = {}) => ({
    ...select(name, props),
    multiple: true,
  });
  const checkbox = buildField<CheckboxInputItem<TValues>>('checkbox');
  const switchField = buildField<SwitchInputItem<TValues>>('switch');
  const radio = buildField<RadioInputItem<TValues>>('radio');
  const segmented = buildField<SegmentedInputItem<TValues>>('segmented');
  const autocomplete = buildField<AutocompleteInputItem<TValues>>('autocomplete');
  const slider = buildField<SliderInputItem<TValues>>('slider');
  const rangeSlider = buildField<RangeSliderInputItem<TValues>>('range-slider');

  const date = buildField<DateInputItem<TValues>>('date');
  const dateRange = buildField<DateRangeInputItem<TValues>>('date-range');
  const richText = buildField<RichTextInputItem<TValues>>('rich-text');

  const signature = buildField<SignatureInputItem<TValues>>('signature');

  const geo = buildField<GeoInputItem<TValues>>('geo');
  const math = buildField<MathInputItem<TValues>>('math');
  const calculated = buildField<CalculatedInputItem<TValues>>('calculated');

  const dataGrid = buildField<DataGridItem<TValues>>('data-grid');

  const builder = {} as FormBuilderShape<TValues, P>;
  const resolve = (children: ChildInput<TValues>) => resolveChildren(children, builder);
  const resolveWizard = (steps: StepInput<TValues>) => resolveSteps(steps, builder);

  const section = (
    title: string,
    children: ChildInput<TValues>,
    props: Omit<SectionItem<TValues>, 'type' | 'title' | 'children'> = {},
  ): SectionItem<TValues> => ({ type: 'section', title, children: resolve(children), ...props });

  const group = (
    children: ChildInput<TValues>,
    props: Omit<GroupItem<TValues>, 'type' | 'children'> = {},
  ): GroupItem<TValues> => ({ type: 'group', children: resolve(children), ...props });

  const wizard = (
    steps: StepInput<TValues>,
    props: Omit<WizardItem<TValues>, 'type' | 'steps'> = {},
  ): WizardItem<TValues> => ({ type: 'wizard', steps: resolveWizard(steps), ...props });

  const array = (
    name: ScopedPath<TValues, P>,
    itemSchema: ChildInput<TValues>,
    props: Omit<ArrayFieldItem<TValues>, 'type' | 'name' | 'itemSchema'> = {},
  ): ArrayFieldItem<TValues> => ({
    type: 'array',
    name: withPrefix(name),
    itemSchema: resolve(itemSchema),
    ...props,
  });

  const scope = <Next extends ScopedPath<TValues, P>>(prefixValue: Next) =>
    makeBuilder<TValues, Path<TValues>>(withPrefix(prefixValue));

  Object.assign(builder, {
    text,
    password,
    number,
    hidden,
    color,
    otp,
    mask,
    select,
    multiSelect,
    checkbox,
    switch: switchField,
    radio,
    segmented,
    autocomplete,
    slider,
    rangeSlider,
    date,
    dateRange,
    richText,
    signature,
    geo,
    math,
    calculated,
    dataGrid,
    section,
    group,
    wizard,
    array,
    scope,
  });

  return builder;
}

export type FormBuilder<TValues> = FormBuilderShape<TValues>;

export function createFormBuilder<S extends z.ZodTypeAny>(_schema: S): FormBuilder<InferValues<S>> {
  return makeBuilder<InferValues<S>>();
}


// FILE: rng-forms/dsl/templates.ts

/**
 * Field Templates - Reusable patterns for common form fields
 */

export const fieldTemplates = {
  /**
   * Standard name fields (First Name, Last Name)
   */
  fullName: (): any => ({
    type: 'group',
    children: [
      {
        type: 'text',
        name: 'firstName' as any,
        label: 'First Name',
        required: true,
        validation: {
          minLength: { value: 2, message: 'First name must be at least 2 characters' },
          maxLength: { value: 50, message: 'First name must not exceed 50 characters' },
          pattern: {
            value: /^[a-zA-Z\s-']+$/,
            message: 'First name can only contain letters, spaces, hyphens, and apostrophes',
          },
        },
      } as any,
      {
        type: 'text',
        name: 'lastName' as any,
        label: 'Last Name',
        required: true,
        validation: {
          minLength: { value: 2, message: 'Last name must be at least 2 characters' },
          maxLength: { value: 50, message: 'Last name must not exceed 50 characters' },
          pattern: {
            value: /^[a-zA-Z\s-']+$/,
            message: 'Last name can only contain letters, spaces, hyphens, and apostrophes',
          },
        },
      } as any,
    ],
  }),

  /**
   * Email and phone contact fields
   */
  contactInfo: (): any => ({
    type: 'group',
    children: [
      {
        type: 'email' as any,
        name: 'email' as any,
        label: 'Email Address',
        required: true,
        validation: {
          pattern: {
            value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            message: 'Please enter a valid email address',
          },
        },
      } as any,
      {
        type: 'tel' as any,
        name: 'phone' as any,
        label: 'Phone Number',
        placeholder: '(555) 123-4567',
        validation: {
          pattern: {
            value: /^[\d\s\-()+]+$/,
            message: 'Please enter a valid phone number',
          },
        },
      } as any,
    ],
  }),

  /**
   * Complete address block
   */
  address: (): any => ({
    type: 'group',
    children: [
      {
        type: 'text',
        name: 'address.street' as any,
        label: 'Street Address',
        required: true,
        placeholder: '123 Main St',
      } as any,
      {
        type: 'text',
        name: 'address.apartment' as any,
        label: 'Apartment, suite, etc.',
        placeholder: 'Apt 4B',
      } as any,
      {
        type: 'group',
        children: [
          {
            type: 'text',
            name: 'address.city' as any,
            label: 'City',
            required: true,
          } as any,
          {
            type: 'select',
            name: 'address.state' as any,
            label: 'State',
            required: true,
            options: [
              { value: 'AL', label: 'Alabama' },
              { value: 'AK', label: 'Alaska' },
              { value: 'AZ', label: 'Arizona' },
              { value: 'AR', label: 'Arkansas' },
              { value: 'CA', label: 'California' },
              { value: 'CO', label: 'Colorado' },
              { value: 'CT', label: 'Connecticut' },
              { value: 'DE', label: 'Delaware' },
              { value: 'FL', label: 'Florida' },
              { value: 'GA', label: 'Georgia' },
            ],
          } as any,
          {
            type: 'text',
            name: 'address.zipCode' as any,
            label: 'ZIP Code',
            required: true,
            validation: {
              pattern: {
                value: /^\d{5}(-\d{4})?$/,
                message: 'Please enter a valid ZIP code',
              },
            },
          } as any,
        ],
      } as any,
    ],
  }),

  /**
   * Date range fields (start and end date)
   */
  dateRange: (
    startName: string = 'startDate',
    endName: string = 'endDate',
    startLabel: string = 'Start Date',
    endLabel: string = 'End Date',
  ): any => ({
    type: 'group',
    children: [
      {
        type: 'date',
        name: startName as any,
        label: startLabel,
        required: true,
      } as any,
      {
        type: 'date',
        name: endName as any,
        label: endLabel,
        required: true,
        validation: {
          validate: {
            afterStart: (value: any, formValues: any) => {
              const start = formValues[startName];
              if (!start || !value) return true;
              return new Date(value) >= new Date(start) || 'End date must be after start date';
            },
          },
        },
      } as any,
    ],
  }),

  /**
   * Social media links
   */
  socialMedia: (): any => ({
    type: 'group',
    children: [
      {
        type: 'url' as any,
        name: 'social.twitter' as any,
        label: 'Twitter',
        placeholder: 'https://twitter.com/username',
      } as any,
      {
        type: 'url' as any,
        name: 'social.linkedin' as any,
        label: 'LinkedIn',
        placeholder: 'https://linkedin.com/in/username',
      } as any,
      {
        type: 'url' as any,
        name: 'social.github' as any,
        label: 'GitHub',
        placeholder: 'https://github.com/username',
      } as any,
      {
        type: 'url' as any,
        name: 'social.website' as any,
        label: 'Website',
        placeholder: 'https://example.com',
      } as any,
    ],
  }),

  /**
   * Credit card fields
   */
  creditCard: (): any => ({
    type: 'group',
    children: [
      {
        type: 'text',
        name: 'card.number' as any,
        label: 'Card Number',
        required: true,
        placeholder: '1234 5678 9012 3456',
        validation: {
          pattern: {
            value: /^\d{4}\s?\d{4}\s?\d{4}\s?\d{4}$/,
            message: 'Please enter a valid card number',
          },
        },
      } as any,
      {
        type: 'text',
        name: 'card.name' as any,
        label: 'Name on Card',
        required: true,
      } as any,
      {
        type: 'group',
        children: [
          {
            type: 'text',
            name: 'card.expiry' as any,
            label: 'Expiry Date',
            required: true,
            placeholder: 'MM/YY',
            validation: {
              pattern: {
                value: /^(0[1-9]|1[0-2])\/\d{2}$/,
                message: 'Please enter a valid expiry date (MM/YY)',
              },
            },
          } as any,
          {
            type: 'password' as any,
            name: 'card.cvv' as any,
            label: 'CVV',
            required: true,
            placeholder: '123',
            validation: {
              pattern: {
                value: /^\d{3,4}$/,
                message: 'Please enter a valid CVV',
              },
            },
          } as any,
        ],
      } as any,
    ],
  }),

  /**
   * Password with confirmation
   */
  passwordWithConfirmation: (
    passwordName: string = 'password',
    confirmName: string = 'confirmPassword',
  ): any => ({
    type: 'group',
    children: [
      {
        type: 'password' as any,
        name: passwordName as any,
        label: 'Password',
        required: true,
        validation: {
          minLength: { value: 8, message: 'Password must be at least 8 characters' },
          pattern: {
            value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
            message: 'Password must contain uppercase, lowercase, number, and special character',
          },
        },
      } as any,
      {
        type: 'password' as any,
        name: confirmName as any,
        label: 'Confirm Password',
        required: true,
        validation: {
          validate: {
            matches: (value: any, formValues: any) => {
              const password = formValues[passwordName];
              return value === password || 'Passwords do not match';
            },
          },
        },
      } as any,
    ],
  }),

  /**
   * Emergency contact information
   */
  emergencyContact: (): any => ({
    type: 'group',
    children: [
      {
        type: 'text',
        name: 'emergencyContact.name' as any,
        label: 'Emergency Contact Name',
        required: true,
      } as any,
      {
        type: 'text',
        name: 'emergencyContact.relationship' as any,
        label: 'Relationship',
        required: true,
        placeholder: 'e.g., Spouse, Parent, Sibling',
      } as any,
      {
        type: 'group',
        children: [
          {
            type: 'tel' as any,
            name: 'emergencyContact.phone' as any,
            label: 'Phone Number',
            required: true,
          } as any,
          {
            type: 'email' as any,
            name: 'emergencyContact.email' as any,
            label: 'Email Address',
          } as any,
        ],
      } as any,
    ],
  }),

  /**
   * Company/Organization information
   */
  companyInfo: (): any => ({
    type: 'group',
    children: [
      {
        type: 'text',
        name: 'company.name' as any,
        label: 'Company Name',
        required: true,
      } as any,
      {
        type: 'group',
        children: [
          {
            type: 'text',
            name: 'company.taxId' as any,
            label: 'Tax ID / EIN',
            placeholder: '12-3456789',
          } as any,
          {
            type: 'url' as any,
            name: 'company.website' as any,
            label: 'Website',
            placeholder: 'https://example.com',
          } as any,
        ],
      } as any,
    ],
  }),

  /**
   * Time range (hours and minutes)
   */
  timeRange: (startName: string = 'startTime', endName: string = 'endTime'): any => ({
    type: 'group',
    children: [
      {
        type: 'time',
        name: startName as any,
        label: 'Start Time',
        required: true,
      } as any,
      {
        type: 'time',
        name: endName as any,
        label: 'End Time',
        required: true,
      } as any,
    ],
  }),
};

/**
 * Helper function to create a custom template
 */
export function createFieldTemplate(fields: any[], columns: number = 1): any {
  return {
    type: 'group',
    children: fields,
  };
}


// FILE: rng-forms/hooks/useAsyncValidation.ts

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


// FILE: rng-forms/hooks/useCrossFieldValidation.ts

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


// FILE: rng-forms/hooks/useDebounce.ts

'use client';

import { useEffect, useState } from 'react';

/**
 * Debounce hook that delays updating a value until after a specified delay
 * Useful for expensive operations like validation, API calls, or search
 *
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 300ms)
 * @returns The debounced value
 *
 * @example
 * const debouncedSearch = useDebounce(searchTerm, 500);
 *
 * useEffect(() => {
 *   // This will only run 500ms after the user stops typing
 *   performSearch(debouncedSearch);
 * }, [debouncedSearch]);
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set up a timer to update the debounced value after the delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up the timer if value changes before delay expires
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Callback debounce hook that delays executing a callback until after a specified delay
 * Useful for preventing rapid successive calls to expensive functions
 *
 * @param callback - The function to debounce
 * @param delay - Delay in milliseconds (default: 300ms)
 * @returns A debounced version of the callback
 *
 * @example
 * const debouncedSave = useDebouncedCallback((data) => {
 *   saveToApi(data);
 * }, 1000);
 *
 * // Call it normally - will only execute 1000ms after last call
 * debouncedSave(formData);
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300,
): (...args: Parameters<T>) => void {
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const debouncedCallback = (...args: Parameters<T>) => {
    // Clear existing timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Set up new timeout
    const newTimeoutId = setTimeout(() => {
      callback(...args);
    }, delay);

    setTimeoutId(newTimeoutId);
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  return debouncedCallback;
}


// FILE: rng-forms/hooks/useFieldLogic.ts

'use client';

import { useMemo } from 'react';
import { useFormContext, useWatch, type FieldValues } from 'react-hook-form';
import type { RNGFormItem } from '../types/core';

function buildDependencyNames(dependencies: string[], scopePrefix: string): string[] {
  const set = new Set<string>();
  dependencies.forEach((dep) => {
    const isRoot = dep.startsWith('!');
    const raw = isRoot ? dep.slice(1) : dep;
    if (raw) set.add(raw);
    if (!isRoot && scopePrefix) {
      set.add(`${scopePrefix}.${raw}`);
    }
  });
  return Array.from(set);
}

export function useFieldLogic<TValues extends FieldValues = FieldValues>(
  item: RNGFormItem<TValues>,
) {
  const form = useFormContext<TValues>();
  const dependencies =
    'dependencies' in item && Array.isArray((item as any).dependencies)
      ? ((item as any).dependencies as string[])
      : [];

  const scopePath = 'name' in item ? (item as any).name?.toString() : '';
  const explicitPrefix = 'scopePrefix' in item ? (item as any).scopePrefix || '' : '';
  const derivedPrefix =
    scopePath && scopePath.includes('.') ? scopePath.split('.').slice(0, -1).join('.') : '';
  const scopePrefix = explicitPrefix || derivedPrefix;

  const namesToWatch = buildDependencyNames(dependencies, scopePrefix);

  // Watch declared dependencies (raw + scoped variants) to minimize re-renders
  useWatch<TValues>({
    control: form.control,
    name: namesToWatch.length ? (namesToWatch as any) : undefined,
  });

  const rootValues = form.getValues();
  const scopeValues = scopePath ? form.getValues(scopePath as any) ?? rootValues : rootValues;

  const isVisible = useMemo(() => {
    return 'renderLogic' in item && item.renderLogic
      ? item.renderLogic(scopeValues as TValues, rootValues as TValues)
      : true;
  }, [item, rootValues, scopeValues]);

  const dynamicProps = useMemo(() => {
    return 'propsLogic' in item && item.propsLogic
      ? item.propsLogic(scopeValues as TValues, rootValues as TValues)
      : {};
  }, [item, rootValues, scopeValues]);

  return { isVisible, dynamicProps } as const;
}

export default useFieldLogic;


// FILE: rng-forms/hooks/useFormHistory.ts

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useFormContext, type FieldValues } from 'react-hook-form';

interface HistoryEntry<TValues> {
  values: TValues;
  timestamp: Date;
}

interface UseFormHistoryOptions {
  /**
   * Maximum number of history entries to keep (default: 50)
   */
  maxHistory?: number;
  /**
   * Enable keyboard shortcuts (Ctrl+Z, Ctrl+Y) (default: true)
   */
  enableKeyboardShortcuts?: boolean;
  /**
   * Debounce time for recording changes (default: 500ms)
   */
  debounceMs?: number;
}

/**
 * Hook for undo/redo functionality with keyboard shortcuts
 *
 * @example
 * const { undo, redo, canUndo, canRedo, history } = useFormHistory({
 *   maxHistory: 50,
 *   enableKeyboardShortcuts: true,
 * });
 *
 * <Button onClick={undo} disabled={!canUndo}>Undo</Button>
 * <Button onClick={redo} disabled={!canRedo}>Redo</Button>
 */
export function useFormHistory<TValues extends FieldValues>(options: UseFormHistoryOptions = {}) {
  const { maxHistory = 50, enableKeyboardShortcuts = true, debounceMs = 500 } = options;
  const { watch, reset, getValues } = useFormContext<TValues>();

  const [history, setHistory] = useState<HistoryEntry<TValues>[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const isRestoringRef = useRef(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Record initial state
  useEffect(() => {
    const initialValues = getValues();
    setHistory([{ values: initialValues, timestamp: new Date() }]);
    setCurrentIndex(0);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Watch for changes and record to history
  useEffect(() => {
    const subscription = watch((values) => {
      // Don't record if we're restoring from history
      if (isRestoringRef.current) return;

      // Clear existing debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Debounce recording to history
      debounceTimerRef.current = setTimeout(() => {
        setHistory((prev) => {
          // If we're not at the end of history, remove future entries
          const newHistory = prev.slice(0, currentIndex + 1);

          // Add new entry
          const newEntry: HistoryEntry<TValues> = {
            values: values as TValues,
            timestamp: new Date(),
          };
          newHistory.push(newEntry);

          // Limit history size
          if (newHistory.length > maxHistory) {
            newHistory.shift();
            setCurrentIndex((prev) => prev - 1);
          } else {
            setCurrentIndex((prev) => prev + 1);
          }

          return newHistory;
        });
      }, debounceMs);
    });

    return () => {
      subscription.unsubscribe();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [watch, currentIndex, maxHistory, debounceMs]);

  const undo = useCallback(() => {
    if (currentIndex > 0) {
      const previousIndex = currentIndex - 1;
      const previousEntry = history[previousIndex];

      if (!previousEntry) return;

      isRestoringRef.current = true;
      reset(previousEntry.values);
      setCurrentIndex(previousIndex);

      // Reset flag after a short delay
      setTimeout(() => {
        isRestoringRef.current = false;
      }, 100);
    }
  }, [currentIndex, history, reset]);

  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      const nextIndex = currentIndex + 1;
      const nextEntry = history[nextIndex];

      if (!nextEntry) return;

      isRestoringRef.current = true;
      reset(nextEntry.values);
      setCurrentIndex(nextIndex);

      // Reset flag after a short delay
      setTimeout(() => {
        isRestoringRef.current = false;
      }, 100);
    }
  }, [currentIndex, history, reset]);

  const goToHistoryIndex = useCallback(
    (index: number) => {
      if (index >= 0 && index < history.length) {
        const entry = history[index];

        if (!entry) return;

        isRestoringRef.current = true;
        reset(entry.values);
        setCurrentIndex(index);

        setTimeout(() => {
          isRestoringRef.current = false;
        }, 100);
      }
    },
    [history, reset],
  );

  const clearHistory = useCallback(() => {
    const currentValues = getValues();
    setHistory([{ values: currentValues, timestamp: new Date() }]);
    setCurrentIndex(0);
  }, [getValues]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!enableKeyboardShortcuts) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+Z or Cmd+Z for undo
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
      }
      // Ctrl+Y or Cmd+Shift+Z for redo
      else if (
        ((event.ctrlKey || event.metaKey) && event.key === 'y') ||
        ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'z')
      ) {
        event.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, enableKeyboardShortcuts]);

  return {
    undo,
    redo,
    canUndo: currentIndex > 0,
    canRedo: currentIndex < history.length - 1,
    history,
    currentIndex,
    goToHistoryIndex,
    clearHistory,
  };
}


// FILE: rng-forms/hooks/useFormPersistence.ts

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


// FILE: rng-forms/hooks/useImageManipulation.ts

'use client';

import imageCompression from 'browser-image-compression';
import { useCallback, useEffect, useState } from 'react';

export interface ImageManipulationState {
  brightness: number;
  contrast: number;
  saturation: number;
  rotation: number;
  flippedX: boolean;
  flippedY: boolean;
}

interface HistoryEntry {
  state: ImageManipulationState;
  image?: Blob;
}

export function useImageManipulation(file: File | null) {
  const [state, setState] = useState<ImageManipulationState>({
    brightness: 0,
    contrast: 0,
    saturation: 0,
    rotation: 0,
    flippedX: false,
    flippedY: false,
  });

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Reset state/history when file changes to avoid applying old transforms to a new image
  useEffect(() => {
    setState({
      brightness: 0,
      contrast: 0,
      saturation: 0,
      rotation: 0,
      flippedX: false,
      flippedY: false,
    });
    setHistory([]);
    setHistoryIndex(-1);
  }, [file]);

  const pushToHistory = useCallback(
    (newState: ImageManipulationState) => {
      setState(newState);
      setHistory((prev) => [...prev.slice(0, historyIndex + 1), { state: newState }]);
      setHistoryIndex((prev) => prev + 1);
    },
    [historyIndex],
  );

  const adjustBrightness = useCallback(
    (value: number) => {
      const newState = { ...state, brightness: value };
      pushToHistory(newState);
    },
    [state, pushToHistory],
  );

  const adjustContrast = useCallback(
    (value: number) => {
      const newState = { ...state, contrast: value };
      pushToHistory(newState);
    },
    [state, pushToHistory],
  );

  const adjustSaturation = useCallback(
    (value: number) => {
      const newState = { ...state, saturation: value };
      pushToHistory(newState);
    },
    [state, pushToHistory],
  );

  const rotate = useCallback(
    (degrees: 90 | 180 | 270) => {
      const newRotation = (state.rotation + degrees) % 360;
      const newState = { ...state, rotation: newRotation };
      pushToHistory(newState);
    },
    [state, pushToHistory],
  );

  const flipX = useCallback(() => {
    const newState = { ...state, flippedX: !state.flippedX };
    pushToHistory(newState);
  }, [state, pushToHistory]);

  const flipY = useCallback(() => {
    const newState = { ...state, flippedY: !state.flippedY };
    pushToHistory(newState);
  }, [state, pushToHistory]);

  const flip = useCallback(
    (direction: 'x' | 'y') => {
      if (direction === 'x') flipX();
      else flipY();
    },
    [flipX, flipY],
  );

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setState(history[newIndex]!.state);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setState(history[newIndex]!.state);
    }
  }, [history, historyIndex]);

  const resetAll = useCallback(() => {
    const newState: ImageManipulationState = {
      brightness: 0,
      contrast: 0,
      saturation: 0,
      rotation: 0,
      flippedX: false,
      flippedY: false,
    };
    pushToHistory(newState);
  }, [pushToHistory]);

  const exportImage = useCallback(
    async (format: string = file?.type || 'image/webp', quality: number = 0.9): Promise<File> => {
      if (!file) throw new Error('No file to export');

      // Normalize format to MIME type if it's just an extension
      let mimeType = format;
      if (!format.includes('/')) {
        const f = format.toLowerCase().replace(/^\./, '');
        mimeType = `image/${f === 'jpg' ? 'jpeg' : f}`;
      }

      // Draw to canvas with filters and transforms so edited image matches preview
      const objectUrl = URL.createObjectURL(file);
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = objectUrl;
      });
      URL.revokeObjectURL(objectUrl);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context unavailable');

      // Calculate canvas dimensions accounting for rotation
      // 90 and 270 degree rotations swap width and height
      const isRotated90Or270 = state.rotation === 90 || state.rotation === 270;
      const canvasWidth = isRotated90Or270 ? img.height : img.width;
      const canvasHeight = isRotated90Or270 ? img.width : img.height;

      const maxSide = Math.max(img.width, img.height, 1);
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      // Apply filters
      const bright = 1 + state.brightness / 100;
      const cont = 1 + state.contrast / 100;
      const sat = 1 + state.saturation / 100;
      ctx.filter = `brightness(${bright}) contrast(${cont}) saturate(${sat})`;

      // Apply transforms (rotation around center, then flips)
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((state.rotation * Math.PI) / 180);
      ctx.scale(state.flippedX ? -1 : 1, state.flippedY ? -1 : 1);
      ctx.drawImage(img, -img.width / 2, -img.height / 2, img.width, img.height);

      const blob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (b) => {
            if (b) resolve(b);
            else reject(new Error('Failed to export image'));
          },
          mimeType,
          quality,
        );
      });
      const ext = mimeType.includes('/') ? mimeType.split('/')[1] || 'webp' : 'webp';

      // Optional compression for very large outputs (>1MB)
      const maybeCompressed =
        blob.size > 1024 * 1024
          ? await imageCompression(
              new File([blob], file.name.replace(/\.[^.]+$/, `.${ext}`), { type: mimeType }),
              {
                maxSizeMB: 1,
                maxWidthOrHeight: Math.max(canvas.width, canvas.height, maxSide),
                useWebWorker: true,
              },
            )
          : blob;

      const finalBlob = maybeCompressed instanceof Blob ? maybeCompressed : blob;

      return new File([finalBlob], file.name.replace(/\.[^.]+$/, `.${ext}`), { type: mimeType });
    },
    [
      file,
      state.brightness,
      state.contrast,
      state.saturation,
      state.rotation,
      state.flippedX,
      state.flippedY,
    ],
  );

  return {
    brightness: state.brightness,
    adjustBrightness,
    contrast: state.contrast,
    adjustContrast,
    saturation: state.saturation,
    adjustSaturation,
    rotation: state.rotation,
    rotate,
    flipX: state.flippedX,
    flipY: state.flippedY,
    flip,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    resetAll,
    exportImage,
  };
}


// FILE: rng-forms/hooks/usePDFPages.ts

'use client';

import { PDFDocument, degrees } from 'pdf-lib';
import { useCallback, useEffect, useState } from 'react';
import { globalLogger } from '../../lib';

export interface PDFPageState {
  index: number;
  rotation: number;
  deleted: boolean;
}

export function usePDFPages(pdfFile: File | null) {
  const [pages, setPages] = useState<PDFPageState[]>([]);
  const [selectedPageIndex, setSelectedPageIndex] = useState(0);
  const [history, setHistory] = useState<PDFPageState[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Initialize pages when file changes
  useEffect(() => {
    const initializePages = async () => {
      if (!pdfFile) {
        setPages([]);
        return;
      }

      try {
        const pdfDoc = await PDFDocument.load(await pdfFile.arrayBuffer());
        const pageCount = pdfDoc.getPageCount();
        const newPages: PDFPageState[] = Array.from({ length: pageCount }, (_, i) => ({
          index: i,
          rotation: 0,
          deleted: false,
        }));
        setPages(newPages);
        setHistory([newPages]);
        setHistoryIndex(0);
      } catch (error) {
        globalLogger.error('Error initializing PDF pages:', { error });
      }
    };

    initializePages();
  }, [pdfFile]);

  const pushToHistory = useCallback(
    (newPages: PDFPageState[]) => {
      setHistory((prev) => [...prev.slice(0, historyIndex + 1), newPages]);
      setHistoryIndex((prev) => prev + 1);
      setPages(newPages);
    },
    [historyIndex],
  );

  const rotatePage = useCallback(
    (pageIndex: number, degrees: 90 | 180 | 270 = 90) => {
      const newPages = pages.map((p) =>
        p.index === pageIndex ? { ...p, rotation: (p.rotation + degrees) % 360 } : p,
      );
      pushToHistory(newPages);
    },
    [pages, pushToHistory],
  );

  const deletePage = useCallback(
    (pageIndex: number) => {
      const newPages = pages.map((p) => (p.index === pageIndex ? { ...p, deleted: true } : p));
      pushToHistory(newPages);
    },
    [pages, pushToHistory],
  );

  const reorderPages = useCallback(
    (fromIndex: number, toIndex: number) => {
      const fromPos = pages.findIndex((p) => p.index === fromIndex);
      const toPos = pages.findIndex((p) => p.index === toIndex);
      if (fromPos === -1 || toPos === -1) return;

      const newPages = [...pages];
      const [removed] = newPages.splice(fromPos, 1);
      if (removed) {
        newPages.splice(toPos, 0, removed);
        pushToHistory(newPages);
      }
    },
    [pages, pushToHistory],
  );

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setPages(history[newIndex]!);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setPages(history[newIndex]!);
    }
  }, [history, historyIndex]);

  const exportPDF = useCallback(async (): Promise<File> => {
    if (!pdfFile) throw new Error('No PDF file provided');

    const srcDoc = await PDFDocument.load(await pdfFile.arrayBuffer());
    const outDoc = await PDFDocument.create();

    const activePages = pages.filter((p) => !p.deleted);

    for (const pageState of activePages) {
      const copied = await outDoc.copyPages(srcDoc, [pageState.index]);
      const copiedPage = copied[0];
      if (!copiedPage) continue;
      const rot = pageState.rotation % 360;
      if (rot !== 0) {
        copiedPage.setRotation(degrees(rot));
      }
      outDoc.addPage(copiedPage);
    }

    const pdfBytes = await outDoc.save();
    const blob = new Blob([pdfBytes as unknown as ArrayBuffer], { type: 'application/pdf' });
    return new File([blob], pdfFile.name, { type: 'application/pdf' });
  }, [pdfFile, pages]);

  return {
    pages,
    selectedPageIndex,
    setSelectedPageIndex,
    rotatePage,
    deletePage,
    reorderPages,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    exportPDF,
  };
}


// FILE: rng-forms/index.ts

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


// FILE: rng-forms/stories/RNGForm.stories.tsx

import type { Meta, StoryObj } from '@storybook/react';
import { globalLogger } from '../../lib';
import RNGForm from '../RNGForm';

const meta = {
  title: 'RNGForm/Complete Examples',
  component: RNGForm,
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof RNGForm>;

export default meta;
type Story = StoryObj<typeof RNGForm>;

export const BasicTextInputs: Story = {
  args: {
    schema: {
      items: [
        {
          type: 'text',
          name: 'firstName',
          label: 'First Name',
          placeholder: 'John',
          required: true,
        },
        {
          type: 'text',
          name: 'lastName',
          label: 'Last Name',
          placeholder: 'Doe',
          required: true,
        },
        {
          type: 'text',
          name: 'bio',
          label: 'Bio',
          placeholder: 'Tell us about yourself',
          multiline: true,
          rows: 4,
        },
      ],
    },
    onSubmit: (data: any) => globalLogger.debug('Submitted:', data),
  },
};

export const TaxonomyFields: Story = {
  args: {
    schema: {
      items: [
        {
          type: 'text',
          name: 'title',
          label: 'Title',
          placeholder: 'Enter title',
          required: true,
        },
        {
          type: 'taxonomy',
          name: 'categories',
          label: 'Categories',
          collection: 'categories',
          required: true,
        },
        {
          type: 'taxonomy',
          name: 'tags',
          label: 'Tags',
          collection: 'tags',
          placeholder: 'Add tags',
        },
        {
          type: 'taxonomy',
          name: 'departments',
          label: 'Departments',
          collection: 'departments',
        },
      ],
    },
    onSubmit: (data: any) => globalLogger.debug('Taxonomy data:', data),
  },
};

export const SelectionInputs: Story = {
  args: {
    schema: {
      items: [
        {
          type: 'select',
          name: 'country',
          label: 'Country',
          options: ['USA', 'UK', 'Canada', 'Australia'],
          required: true,
        },
        {
          type: 'select',
          name: 'interests',
          label: 'Interests',
          options: ['Sports', 'Music', 'Reading', 'Gaming', 'Cooking'],
          multiple: true,
          searchable: true,
        },
        {
          type: 'checkbox',
          name: 'terms',
          label: 'I agree to terms and conditions',
          required: true,
        },
        {
          type: 'switch',
          name: 'notifications',
          label: 'Enable Notifications',
          onLabel: 'On',
          offLabel: 'Off',
        },
        {
          type: 'radio',
          name: 'plan',
          label: 'Select Plan',
          options: [
            { label: 'Free', value: 'free' },
            { label: 'Pro ($9/mo)', value: 'pro' },
            { label: 'Enterprise', value: 'enterprise' },
          ],
        },
      ],
    },
    onSubmit: (data: any) => globalLogger.debug('Selection data:', data),
  },
};

export const DateAndTime: Story = {
  args: {
    schema: {
      items: [
        {
          type: 'date',
          name: 'birthDate',
          label: 'Birth Date',
          required: true,
        },
        {
          type: 'date-range',
          name: 'vacationDates',
          label: 'Vacation Dates',
        },
      ],
    },
    onSubmit: (data: any) => globalLogger.debug('Date data:', data),
  },
};

export const NumberInputs: Story = {
  args: {
    schema: {
      items: [
        {
          type: 'number',
          name: 'age',
          label: 'Age',
          min: 0,
          max: 120,
          required: true,
        },
        {
          type: 'number',
          name: 'price',
          label: 'Price',
          min: 0,
          step: 0.01,
          placeholder: '0.00',
        },
        {
          type: 'slider',
          name: 'satisfaction',
          label: 'Satisfaction Level',
          min: 0,
          max: 10,
          step: 1,
          marks: [
            { value: 0, label: '0' },
            { value: 5, label: '5' },
            { value: 10, label: '10' },
          ],
        },
      ],
    },
    onSubmit: (data: any) => globalLogger.debug('Number data:', data),
  },
};

export const SectionsAndLayout: Story = {
  args: {
    schema: {
      items: [
        {
          type: 'section',
          title: 'Personal Information',
          description: 'Tell us about yourself',
          children: [
            {
              type: 'text',
              name: 'name',
              label: 'Full Name',
              required: true,
            },
            {
              type: 'text',
              name: 'email',
              label: 'Email',
              required: true,
            },
          ],
        },
        {
          type: 'section',
          title: 'Professional Details',
          collapsible: true,
          defaultOpened: true,
          children: [
            {
              type: 'text',
              name: 'company',
              label: 'Company',
            },
            {
              type: 'taxonomy',
              name: 'skills',
              label: 'Skills',
              collection: 'skills',
            },
          ],
        },
      ],
    },
    onSubmit: (data: any) => globalLogger.debug('Form data:', data),
  },
};

export const ComplexForm: Story = {
  args: {
    schema: {
      items: [
        {
          type: 'section',
          title: 'Project Details',
          children: [
            {
              type: 'text',
              name: 'projectName',
              label: 'Project Name',
              required: true,
            },
            {
              type: 'text',
              name: 'description',
              label: 'Description',
              multiline: true,
              rows: 3,
            },
            {
              type: 'taxonomy',
              name: 'projectCategories',
              label: 'Categories',
              collection: 'categories',
            },
          ],
        },
        {
          type: 'section',
          title: 'Team & Resources',
          collapsible: true,
          defaultOpened: true,
          children: [
            {
              type: 'taxonomy',
              name: 'departments',
              label: 'Departments Involved',
              collection: 'departments',
              required: true,
            },
            {
              type: 'taxonomy',
              name: 'requiredSkills',
              label: 'Required Skills',
              collection: 'skills',
            },
            {
              type: 'date-range',
              name: 'timeline',
              label: 'Project Timeline',
            },
          ],
        },
        {
          type: 'section',
          title: 'Budget & Priority',
          collapsible: true,
          children: [
            {
              type: 'number',
              name: 'budget',
              label: 'Budget ($)',
              min: 0,
              step: 100,
            },
            {
              type: 'slider',
              name: 'priority',
              label: 'Priority Level',
              min: 1,
              max: 5,
              marks: [
                { value: 1, label: 'Low' },
                { value: 3, label: 'Medium' },
                { value: 5, label: 'High' },
              ],
            },
          ],
        },
      ],
    },
    onSubmit: (data: any) => {
      globalLogger.debug('Complex form submitted:', data);
      alert(JSON.stringify(data, null, 2));
    },
  },
};

export const AllFieldTypes: Story = {
  args: {
    schema: {
      items: [
        {
          type: 'section',
          title: 'Text Inputs',
          collapsible: true,
          defaultOpened: true,
          children: [
            { type: 'text', name: 'text', label: 'Text Field' },
            { type: 'password', name: 'password', label: 'Password' },
            { type: 'number', name: 'number', label: 'Number' },
            { type: 'color', name: 'color', label: 'Color Picker' },
          ],
        },
        {
          type: 'section',
          title: 'Selection Inputs',
          collapsible: true,
          children: [
            {
              type: 'select',
              name: 'select',
              label: 'Select',
              options: ['Option 1', 'Option 2', 'Option 3'],
            },
            { type: 'checkbox', name: 'checkbox', label: 'Checkbox' },
            { type: 'switch', name: 'switch', label: 'Switch' },
            {
              type: 'radio',
              name: 'radio',
              label: 'Radio',
              options: ['A', 'B', 'C'],
            },
          ],
        },
        {
          type: 'section',
          title: 'Taxonomy (New!)',
          collapsible: true,
          children: [
            {
              type: 'taxonomy',
              name: 'categories',
              label: 'Categories',
              collection: 'categories',
            },
            {
              type: 'taxonomy',
              name: 'tags',
              label: 'Tags',
              collection: 'tags',
            },
          ],
        },
        {
          type: 'section',
          title: 'Date & Time',
          collapsible: true,
          children: [
            { type: 'date', name: 'date', label: 'Date' },
            { type: 'date-range', name: 'dateRange', label: 'Date Range' },
          ],
        },
      ],
    },
    onSubmit: (data: any) => globalLogger.debug('All fields:', data),
  },
};


// FILE: rng-forms/stories/_shared/mocks.ts

import { z } from 'zod';

export const fruitOptions = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' },
  { label: 'Cherry', value: 'cherry' },
  { label: 'Dragonfruit', value: 'dragonfruit' },
];

export const countryOptions = [
  { label: 'USA', value: 'usa' },
  { label: 'India', value: 'india' },
  { label: 'Germany', value: 'germany' },
  { label: 'Japan', value: 'japan' },
];

export const asyncCityOptions = async () => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return [
    { label: 'San Francisco', value: 'sf' },
    { label: 'New York', value: 'nyc' },
    { label: 'Mumbai', value: 'bom' },
    { label: 'Berlin', value: 'ber' },
  ];
};

export function createMockFile(name = 'demo.txt', type = 'text/plain', size = 256): File {
  const content = 'x'.repeat(size);
  return new File([content], name, { type });
}

export const geoDefaults = {
  defaultCenter: { lat: 37.7749, lng: -122.4194 },
  zoom: 11,
};

export const basePersonSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  age: z.number().min(0).max(120),
});


// FILE: rng-forms/stories/_shared/story-helpers.tsx

import { Alert, Button, Card, Code, CopyButton, Stack, Text } from '@mantine/core';
import type { Meta, StoryObj } from '@storybook/react';
import { IconAlertCircle, IconCheck } from '@tabler/icons-react';
import React, { useRef, useState } from 'react';
import { z } from 'zod';
import { createFormBuilder } from '../../dsl/factory';
import RNGForm from '../../RNGForm';
import type { RNGFormItem, RNGFormSchema } from '../../types/core';
import { FormSubmissionHandler } from '../../utils/form-submission-handler';

export type StorySchema<S extends z.ZodTypeAny> = {
  validationSchema: S;
  formSchema: RNGFormSchema<z.infer<S>>;
  defaultValues?: Partial<z.infer<S>>;
};

export function buildSchema<S extends z.ZodTypeAny>(
  validationSchema: S,
  items: RNGFormItem<z.infer<S>>[],
  defaultValues?: Partial<z.infer<S>>,
): StorySchema<S> {
  return {
    validationSchema,
    formSchema: { items },
    defaultValues,
  };
}

export function builderFromSchema<S extends z.ZodTypeAny>(schema: S) {
  return createFormBuilder(schema);
}

export function FormStoryContainer({
  title,
  description,
  children,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card withBorder padding="lg" radius="md">
      <Stack gap="sm">
        {title && (
          <Text fw={700} size="lg">
            {title}
          </Text>
        )}
        {description && (
          <Text size="sm" c="dimmed">
            {description}
          </Text>
        )}
        {children}
      </Stack>
    </Card>
  );
}

export function makeRNGFormStory<S extends z.ZodTypeAny>(config: {
  validationSchema: S;
  formSchema: RNGFormSchema<z.infer<S>>;
  defaultValues?: Partial<z.infer<S>>;
  mode?: 'default' | 'chat-ui';
  props?: Partial<React.ComponentProps<typeof RNGForm<any>>>;
}) {
  const { validationSchema, formSchema, defaultValues, mode, props } = config;

  // Return a wrapper component that manages submitted data state
  return (
    <FormSubmissionWrapper
      validationSchema={validationSchema}
      formSchema={formSchema}
      defaultValues={defaultValues as z.infer<S>}
      mode={mode}
      formProps={props}
    />
  );
}

function FormSubmissionWrapper<S extends z.ZodTypeAny>({
  validationSchema,
  formSchema,
  defaultValues,
  mode,
  formProps,
}: {
  validationSchema: S;
  formSchema: RNGFormSchema<z.infer<S>>;
  defaultValues?: Partial<z.infer<S>>;
  mode?: 'default' | 'chat-ui';
  formProps?: Partial<React.ComponentProps<typeof RNGForm<any>>>;
}) {
  const [submittedData, setSubmittedData] = useState<any>(null);
  const [submittedErrors, setSubmittedErrors] = useState<any>(null);
  const submissionHandlerRef = useRef(new FormSubmissionHandler());

  const downloadDataUrls = (values: any) => {
    const collect = (val: any): string[] => {
      if (!val) return [];
      if (typeof val === 'string' && val.startsWith('data:')) return [val];
      if (Array.isArray(val)) return val.flatMap(collect);
      if (typeof val === 'object') return Object.values(val).flatMap(collect);
      return [];
    };

    const mimeToExt = (mime: string) => {
      if (mime.includes('pdf')) return 'pdf';
      if (mime.includes('png')) return 'png';
      if (mime.includes('jpeg')) return 'jpg';
      if (mime.includes('webp')) return 'webp';
      return 'bin';
    };

    const urls = collect(values).slice(0, 10);
    urls.forEach((url, idx) => {
      const match = url.match(/^data:([^;]+);/);
      const ext = mimeToExt(match?.[1] || 'application/octet-stream');
      const a = document.createElement('a');
      a.href = url;
      a.download = `upload-${idx + 1}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  };

  const handleSubmit = async (values: any) => {
    const handler = submissionHandlerRef.current;
    const result = await handler.handle(
      values,
      async (vals) => {
        setSubmittedData(vals);
        setSubmittedErrors(null);
        downloadDataUrls(vals);
        // Return Result type for compatibility
        return { ok: true, value: vals };
      },
      {
        onSuccess: () => {
          // Handle success
        },
        debounceMs: 300,
      },
    );
    return result;
  };

  const handleError = async (errors: any) => {
    setSubmittedErrors(errors);
    setSubmittedData(null);
  };

  React.useEffect(() => {
    return () => {
      // Cleanup submission handler on unmount
      submissionHandlerRef.current.reset();
    };
  }, []);

  return (
    <Stack gap="md">
      <RNGForm
        schema={formSchema}
        validationSchema={validationSchema}
        defaultValues={defaultValues as z.infer<S>}
        onSubmit={handleSubmit}
        onError={handleError}
        {...formProps}
      />

      {submittedData && (
        <Alert icon={<IconCheck size={16} />} color="green" title="Form Submitted Successfully">
          <Stack gap="xs">
            <Code block p="md" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {JSON.stringify(submittedData, null, 2)}
            </Code>
            <CopyButton value={JSON.stringify(submittedData, null, 2)}>
              {({ copied }: { copied: boolean; copy: () => void }) => (
                <Button size="xs" color={copied ? 'teal' : 'blue'} variant="light">
                  {copied ? 'Copied' : 'Copy JSON'}
                </Button>
              )}
            </CopyButton>
          </Stack>
        </Alert>
      )}

      {submittedErrors && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" title="Validation Errors">
          <Code block p="md" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {JSON.stringify(submittedErrors, null, 2)}
          </Code>
        </Alert>
      )}
    </Stack>
  );
}

export const defaultMeta: Meta = {
  parameters: {
    layout: 'padded',
    interactions: {
      interactions: {
        clearOnStoryChange: false,
        clearOnAddonPanelChange: false,
      },
    },
  },
};

export type Story = StoryObj;

// Helper to create argTypes for common scenarios
export function createFormArgTypes() {
  return {
    showReset: {
      control: { type: 'boolean' as const },
      description: 'Show reset button',
      table: { category: 'Form Controls' },
    },
    readOnly: {
      control: { type: 'boolean' as const },
      description: 'Make entire form read-only',
      table: { category: 'Form Controls' },
    },
    showProgress: {
      control: { type: 'boolean' as const },
      description: 'Show completion progress bar',
      table: { category: 'Form Display' },
    },
    debug: {
      control: { type: 'boolean' as const },
      description: 'Enable debug mode for form values',
      table: { category: 'Development' },
    },
  };
}


// FILE: rng-forms/stories/_shared/test-generators.ts

/**
 * RNG-Forms Test Utilities & Generators
 *
 * Helper functions for generating test data, mocking async operations,
 * and creating edge case scenarios for story and unit tests.
 */

// ============================================================================
// DATA GENERATORS
// ============================================================================

/**
 * Generate a large dataset for performance testing
 * @param count Number of items to generate
 * @param template Optional template for item structure
 */
export function generateLargeDataset<T = any>(count: number, template?: (index: number) => T): T[] {
  const defaultTemplate = (index: number) => ({
    id: `item-${index}`,
    name: `Item ${index + 1}`,
    value: Math.random() * 1000,
    category: `Category ${(index % 5) + 1}`,
    status: ['active', 'inactive', 'pending'][index % 3],
    createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
  });

  return Array.from({ length: count }, (_, index) =>
    template ? template(index) : defaultTemplate(index),
  ) as T[];
}

/**
 * Generate mock construction materials
 */
export function generateConstructionMaterials(count: number = 20) {
  const materials = [
    'Cement',
    'Steel',
    'Brick',
    'Sand',
    'Gravel',
    'Concrete',
    'Rebar',
    'Tiles',
    'Paint',
    'Glass',
    'Plywood',
    'Wood',
    'Drywall',
    'Insulation',
    'Roofing',
  ];

  const units = ['nos', 'pcs', 'kg', 'ton', 'cum', 'sqm', 'rmt', 'rft'];

  return Array.from({ length: count }, (_, index) => ({
    id: `mat-${index}`,
    name: materials[index % materials.length],
    code: `MAT-${String(index + 1).padStart(4, '0')}`,
    unit: units[index % units.length],
    rate: Math.round(Math.random() * 100000) / 100,
    quantity: Math.round(Math.random() * 1000),
    supplier: `Supplier ${(index % 5) + 1}`,
    status: 'available',
  }));
}

/**
 * Generate mock labour/workers data
 */
export function generateLabourData(count: number = 15) {
  const roles = [
    'Skilled Labour',
    'Semi-Skilled Labour',
    'Unskilled Labour',
    'Supervisor',
    'Foreman',
  ];

  const skills = [
    'Carpentry',
    'Masonry',
    'Plumbing',
    'Electrical',
    'Welding',
    'Excavation',
    'Formwork',
  ];

  return Array.from({ length: count }, (_, index) => ({
    id: `labour-${index}`,
    name: `Worker ${index + 1}`,
    role: roles[index % roles.length],
    dailyRate: Math.round((500 + Math.random() * 2000) * 100) / 100,
    skills: [skills[index % skills.length], skills[(index + 1) % skills.length]],
    certifications: index % 3 === 0 ? ['OSHA', 'First Aid'] : [],
    availability: 'available',
  }));
}

/**
 * Generate mock site/location data
 */
export function generateSiteData(count: number = 10) {
  const cities = ['Delhi', 'Mumbai', 'Bangalore', 'Hyderabad', 'Pune'];
  const states = ['DL', 'MH', 'KA', 'TG', 'MH'];

  return Array.from({ length: count }, (_, index) => ({
    id: `site-${index}`,
    name: `Project ${index + 1}`,
    city: cities[index % cities.length],
    state: states[index % states.length],
    latitude: 28.7041 + (Math.random() - 0.5) * 10,
    longitude: 77.1025 + (Math.random() - 0.5) * 10,
    area: Math.round((1000 + Math.random() * 100000) * 100) / 100,
    areaUnit: index % 2 === 0 ? 'sqm' : 'sqft',
    status: ['Active', 'Completed', 'Planning'][index % 3],
  }));
}

/**
 * Generate mock equipment/asset data
 */
export function generateEquipmentData(count: number = 20) {
  const types = ['Excavator', 'Crane', 'Mixer', 'Pump', 'Compressor', 'Genset', 'JCB', 'Roller'];

  return Array.from({ length: count }, (_, index) => ({
    id: `equip-${index}`,
    assetCode: `EQ-${String(index + 1).padStart(5, '0')}`,
    type: types[index % types.length],
    make: `Brand ${(index % 3) + 1}`,
    model: `Model ${(index % 5) + 1}`,
    purchaseDate: new Date(2020 + Math.floor(index / 10), index % 12, 1),
    rentalRate: Math.round((500 + Math.random() * 5000) * 100) / 100,
    condition: ['Good', 'Fair', 'Needs Repair'][index % 3],
    location: `Yard ${(index % 3) + 1}`,
  }));
}

// ============================================================================
// ASYNC OPERATION GENERATORS
// ============================================================================

/**
 * Create a simulated async operation with configurable delay and error rate
 */
export function createAsyncOperation<T>(
  data: T,
  options?: {
    delay?: number;
    errorRate?: number; // 0-1
    errorMessage?: string;
  },
): Promise<T> {
  const { delay = 1000, errorRate = 0, errorMessage = 'Operation failed' } = options || {};

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() < errorRate) {
        reject(new Error(errorMessage));
      } else {
        resolve(data);
      }
    }, delay);
  });
}

/**
 * Create async select options loader
 */
export function createAsyncOptionsLoader<T extends { id: string; name: string }>(
  data: T[],
  options?: {
    delay?: number;
    filterFn?: (item: T, searchTerm: string) => boolean;
    errorRate?: number;
  },
) {
  const { delay = 500, errorRate = 0 } = options || {};
  const defaultFilter = (item: T, term: string) =>
    item.name.toLowerCase().includes(term.toLowerCase());
  const filterFn = options?.filterFn || defaultFilter;

  return (searchTerm: string) =>
    createAsyncOperation(
      data.filter((item) => filterFn(item, searchTerm)),
      { delay, errorRate },
    );
}

/**
 * Create async validation loader (for unique checks, server-side validation, etc.)
 */
export function createAsyncValidator(
  validationFn: (value: string) => boolean,
  options?: {
    delay?: number;
    errorMessage?: string;
  },
) {
  const { delay = 800, errorMessage = 'Validation failed' } = options || {};

  return (value: string) =>
    createAsyncOperation(
      { isValid: validationFn(value), message: '' },
      {
        delay,
        errorRate: 0,
      },
    ).catch(() => ({
      isValid: false,
      message: errorMessage,
    }));
}

// ============================================================================
// ERROR STATE GENERATORS
// ============================================================================

/**
 * Generate a validation error
 */
export function generateValidationError(
  field: string,
  type: 'required' | 'invalid' | 'range' | 'format' | 'custom' = 'required',
  customMessage?: string,
): { field: string; message: string; type: string } {
  const messages = {
    required: `${field} is required`,
    invalid: `${field} is invalid`,
    range: `${field} is out of range`,
    format: `${field} format is incorrect`,
    custom: customMessage || `${field} validation failed`,
  };

  return {
    field,
    message: messages[type],
    type,
  };
}

/**
 * Generate loading state
 */
export function generateLoadingState(message: string = 'Loading...') {
  return {
    isLoading: true,
    message,
    progress: Math.random() * 100,
    startTime: Date.now(),
  };
}

/**
 * Generate error state with recovery options
 */
export function generateErrorState(
  message: string,
  options?: {
    code?: string;
    severity?: 'info' | 'warning' | 'error';
    retryable?: boolean;
    details?: Record<string, any>;
  },
) {
  const { code = 'ERROR', severity = 'error', retryable = true, details = {} } = options || {};

  return {
    isError: true,
    code,
    message,
    severity,
    retryable,
    timestamp: Date.now(),
    details,
  };
}

// ============================================================================
// EDGE CASE VALUE GENERATORS
// ============================================================================

/**
 * Generate edge case numbers
 */
export const edgeCaseNumbers = {
  negative: -999999,
  negativeSmall: -0.01,
  zero: 0,
  verySmall: 0.000001,
  small: 1,
  large: 999999999,
  veryLarge: Number.MAX_SAFE_INTEGER,
  decimal: 123.456789,
  repeating: 1 / 3, // 0.333...
  infinity: Infinity,
  negativeInfinity: -Infinity,
  nan: NaN,
};

/**
 * Generate edge case dates
 */
export const edgeCaseDates = {
  today: new Date(),
  tomorrow: new Date(Date.now() + 24 * 60 * 60 * 1000),
  yesterday: new Date(Date.now() - 24 * 60 * 60 * 1000),
  leapYearDate: new Date('2024-02-29'), // Leap year
  yearBoundary: new Date('2024-12-31'),
  newYear: new Date('2025-01-01'),
  epoch: new Date('1970-01-01'),
  farFuture: new Date('2100-12-31'),
  farPast: new Date('1900-01-01'),
};

/**
 * Generate edge case strings
 */
export const edgeCaseStrings = {
  empty: '',
  singleChar: 'a',
  whitespace: '   ',
  veryLong: 'a'.repeat(10000),
  specialChars: '!@#$%^&*()',
  unicode: '你好世界🚀',
  html: '<script>alert("xss")</script>',
  sql: "'; DROP TABLE users; --",
  regex: '/^[a-z]+$/',
  multiline: 'line1\nline2\nline3',
  tabs: 'col1\tcol2\tcol3',
  nullChar: 'text\x00text',
};

/**
 * Generate edge case file objects (for testing)
 */
export function generateMockFile(
  name: string = 'test.txt',
  size: number = 1024,
  type: string = 'text/plain',
): File {
  const blob = new Blob([new ArrayBuffer(size)], { type });
  return new File([blob], name, { type });
}

/**
 * Generate oversized file mock
 */
export function generateOversizedFileMock(sizeMB: number = 100, name: string = 'large.zip'): File {
  const sizeBytes = sizeMB * 1024 * 1024;
  return generateMockFile(name, sizeBytes, 'application/zip');
}

/**
 * Generate invalid file mocks (wrong type)
 */
export function generateInvalidFileMocks() {
  return {
    textAsImage: generateMockFile('notImage.txt', 100, 'text/plain'),
    exeFile: generateMockFile('virus.exe', 512, 'application/octet-stream'),
    corruptedPDF: generateMockFile('corrupt.pdf', 200, 'application/pdf'),
  };
}

// ============================================================================
// FORM STATE GENERATORS
// ============================================================================

/**
 * Generate pending validation state
 */
export function generatePendingValidationState() {
  return {
    fields: {
      email: { status: 'pending', message: 'Checking availability...' },
      username: { status: 'pending', message: 'Checking availability...' },
    },
  };
}

/**
 * Generate partially filled form state
 */
export function generatePartialFormState(completion: number = 0.5) {
  // completion: 0-1 (0% to 100%)
  return {
    filledFields: Math.round(20 * completion),
    totalFields: 20,
    completion: completion * 100,
    unsavedChanges: true,
  };
}

/**
 * Generate form with all error states
 */
export function generateFormWithErrors(fieldCount: number = 10) {
  const errors = Array.from({ length: fieldCount }, (_, index) => ({
    field: `field${index}`,
    message: `Error in field ${index + 1}`,
    type: 'validation',
  }));

  return { hasErrors: true, errors, errorCount: fieldCount };
}

// ============================================================================
// CONSTRUCTION-SPECIFIC GENERATORS
// ============================================================================

/**
 * Generate Bill of Quantities items
 */
export function generateBoQItems(count: number = 20) {
  const items = [
    { description: 'Excavation', unit: 'cum', rate: 500 },
    { description: 'PCC Base', unit: 'sqm', rate: 400 },
    { description: 'Brick Masonry', unit: 'sqm', rate: 350 },
    { description: 'RCC', unit: 'cum', rate: 6000 },
    { description: 'Steel Reinforcement', unit: 'kg', rate: 60 },
    { description: 'Plaster', unit: 'sqm', rate: 150 },
    { description: 'Flooring', unit: 'sqm', rate: 500 },
    { description: 'Ceiling', unit: 'sqm', rate: 300 },
  ];

  return Array.from({ length: count }, (_, index) => {
    const item = items[index % items.length]!;
    const quantity = Math.round((10 + Math.random() * 100) * 100) / 100;

    return {
      id: `boq-${index}`,
      description: item.description,
      unit: item.unit,
      quantity,
      rate: item.rate,
      amount: quantity * item.rate,
    };
  });
}

/**
 * Generate cost estimation breakdown
 */
export function generateCostEstimation() {
  const labourCost = Math.round(Math.random() * 1000000);
  const materialCost = Math.round(Math.random() * 2000000);
  const equipmentCost = Math.round(Math.random() * 500000);
  const subtotal = labourCost + materialCost + equipmentCost;
  const overhead = Math.round(subtotal * 0.1);
  const contingency = Math.round((subtotal + overhead) * 0.05);

  return {
    labourCost,
    materialCost,
    equipmentCost,
    subtotal,
    overhead,
    overheadPercent: 10,
    contingency,
    contingencyPercent: 5,
    total: subtotal + overhead + contingency,
  };
}

/**
 * Generate material takeoff with unit conversions
 */
export function generateMaterialTakeoff() {
  return {
    items: [
      {
        description: 'Excavation',
        length: 100,
        width: 50,
        depth: 2,
        lengthUnit: 'm',
        widthUnit: 'm',
        depthUnit: 'm',
        volume: 10000,
        volumeUnit: 'cum',
      },
      {
        description: 'Concrete',
        length: 100,
        width: 50,
        depth: 0.3,
        lengthUnit: 'm',
        widthUnit: 'm',
        depthUnit: 'm',
        volume: 1500,
        volumeUnit: 'cum',
      },
    ],
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create a delay promise for testing async flows
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Format number with unit (for testing)
 */
export function formatNumberWithUnit(value: number, unit: string): string {
  return `${value.toLocaleString('en-IN')} ${unit}`;
}

/**
 * Format currency value
 */
export function formatCurrency(value: number, currency: string = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
  }).format(value);
}

/**
 * Check if value is within range
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return !isNaN(value) && value >= min && value <= max;
}

/**
 * Validate file size
 */
export function isFileSizeValid(fileSizeMB: number, maxSizeMB: number): boolean {
  return fileSizeMB <= maxSizeMB;
}

/**
 * Validate file type
 */
export function isFileTypeValid(fileType: string, acceptedTypes: string[]): boolean {
  return acceptedTypes.includes(fileType);
}


// FILE: rng-forms/types/core.ts

import { GridColProps } from '@mantine/core';
import type { ReactNode } from 'react';
import { Path } from 'react-hook-form';

type DependencyPath<TValues> = Path<TValues> | `!${Path<TValues>}`;
type DynamicProps<TValues> = Partial<Omit<BaseFieldProps<TValues>, 'name'>> &
  Record<string, unknown>;

/**
 * Units for Architecture, Engineering, and Construction (AEC) grouped by domain
 */
export type LengthUnit = 'mm' | 'cm' | 'm' | 'km' | 'in' | 'ft' | 'yd' | 'mi' | 'thou' | 'mil';

export type AreaUnit =
  | 'sqmm'
  | 'sqcm'
  | 'sqm'
  | 'sqkm'
  | 'sqin'
  | 'sqft'
  | 'sqyd'
  | 'sqmi'
  | 'ac'
  | 'ha'
  | 'cent'
  | 'guntha'
  | 'bigha'
  | 'sft'
  | 'brass';

export type VolumeUnit =
  | 'cumm'
  | 'cucm'
  | 'cum'
  | 'cuin'
  | 'cuft'
  | 'cuyd'
  | 'ml'
  | 'l'
  | 'kl'
  | 'gal'
  | 'qt'
  | 'pt'
  | 'floz';

export type WeightUnit =
  | 'mg'
  | 'g'
  | 'kg'
  | 't'
  | 'mt'
  | 'oz'
  | 'lb'
  | 'ton'
  | 'quintal'
  | 'bag'
  | 'bags';

export type ForceUnit = 'n' | 'kn' | 'mn' | 'kgf' | 'lbf';

export type PressureUnit = 'pa' | 'kpa' | 'mpa' | 'gpa' | 'bar' | 'psi' | 'atm';

export type TemperatureUnit = 'c' | 'f' | 'k';

export type AngleUnit = 'deg' | 'rad' | 'grad';

export type DensityUnit = 'kg/m3' | 'g/cm3' | 'lb/ft3' | 'ton/m3';

export type SpeedUnit = 'm/s' | 'km/h' | 'ft/s' | 'mph';

export type FlowUnit = 'lps' | 'lpm' | 'lph' | 'gpm' | 'gph' | 'cfm';

export type EnergyUnit = 'j' | 'kj' | 'mj' | 'kwh' | 'btu';

export type PowerUnit = 'w' | 'kw' | 'mw';

export type ConstructionUnit =
  | 'rmt'
  | 'rft'
  | 'nos'
  | 'pcs'
  | 'units'
  | 'lot'
  | 'set'
  | 'bundle'
  | 'roll';

export type ReinforcementUnit = 'kg/m' | 'kg/rmt';

export type PercentUnit = '%' | 'ratio';

export type TimeUnit = 'day' | 'week' | 'month' | 'year' | 'hr' | 'min' | 'sec';

export type DigitalUnit = 'b' | 'kb' | 'mb' | 'gb' | 'tb';

export type CustomUnit = string & {};

export type CommonUnit =
  | LengthUnit
  | AreaUnit
  | VolumeUnit
  | WeightUnit
  | ForceUnit
  | PressureUnit
  | TemperatureUnit
  | AngleUnit
  | DensityUnit
  | SpeedUnit
  | FlowUnit
  | EnergyUnit
  | PowerUnit
  | ConstructionUnit
  | ReinforcementUnit
  | PercentUnit
  | TimeUnit
  | DigitalUnit
  | CustomUnit;

/**
 * Currency type - INR only for Indian ERP
 */
export type CommonCurrency = 'INR';

/**
 * Configuration for Number/Currency/Unit Formatting (Mantine native support)
 */
export interface NumberFormatOptions {
  style?: 'decimal' | 'currency' | 'unit' | 'percent';
  /** Currency code - INR only */
  currency?: CommonCurrency;
  /** Unit of measurement (e.g. kg, ft, sqft, cum, rmt) */
  unit?: CommonUnit;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  /** Enable digit grouping (e.g., lakhs/crores via locale) */
  useGrouping?: boolean;
  /** Compact notation for large numbers */
  notation?: 'standard' | 'scientific' | 'engineering' | 'compact';
  /** Display when notation is compact */
  compactDisplay?: 'short' | 'long';
  /** Display unit symbol (e.g., "₹" for INR, "kg" for kilogram) */
  unitDisplay?: 'short' | 'long' | 'narrow';
}

/**
 * Base props shared by all form items
 */
export interface BaseFieldProps<TValues = any> {
  name: Path<TValues>;
  colProps?: GridColProps;
  label?: string;
  description?: string | ReactNode;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  /** Per-field read-only override atop global context */
  readOnly?: boolean;
  id?: string;
  autoFocus?: boolean;

  /**
   * Fields that this field depends on for conditional logic.
   * - Relative paths: "age" (looks inside current scope)
   * - Global paths: "!settings.mode" (looks at root)
   */
  dependencies?: DependencyPath<TValues>[];

  /**
   * Optional explicit scope prefix to resolve relative dependencies (useful for array items)
   */
  scopePrefix?: string;

  /**
   * Logic: Return false to hide the field
   * @param scope - The values relative to the current nesting (e.g., current array item)
   * @param root - The global form values
   */
  /**
   * Logic: Return false to hide the field
   * @example renderLogic: (scope, root) => scope.active && root.settings.mode === 'erp'
   */
  renderLogic?: (scope: any, root: TValues) => boolean;

  /**
   * Logic: Return partial props to dynamically override
   * @param scope - The values relative to the current nesting (e.g., current array item)
   * @param root - The global form values
   */
  /**
   * Logic: Dynamically override props for this field
   * @example propsLogic: (scope, root) => ({ disabled: !root.flags.canEdit, placeholder: `For ${scope.name}` })
   */
  propsLogic?: (scope: any, root: TValues) => DynamicProps<TValues>;
}

/**
 * Text input variants
 */
export interface TextInputItem<TValues = any> extends BaseFieldProps<TValues> {
  type: 'text';
  maxLength?: number;
  minLength?: number;
  multiline?: boolean;
  rows?: number;
  /**
   * Resize behavior for multiline textarea (only applies when multiline=true)
   * @default 'vertical'
   */
  resize?: 'vertical' | 'horizontal' | 'both' | 'none';
}

export interface PasswordInputItem<TValues = any> extends BaseFieldProps<TValues> {
  type: 'password';
  visible?: boolean;
  /**
   * Show password strength meter with real-time strength calculation
   * @default false
   */
  showStrength?: boolean;
}

export interface NumberInputItem<TValues = any> extends BaseFieldProps<TValues> {
  type: 'number';
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  /**
   * Format options for currency, units, or percent display
   * Mantine NumberInput supports this natively
   */
  formatOptions?: NumberFormatOptions;
  /**
   * If true, allows entering math expressions (e.g., "100 + 50 * 2")
   * which are evaluated on blur using mathjs
   */
  enableMath?: boolean;
}

export interface HiddenInputItem<TValues = any> extends BaseFieldProps<TValues> {
  type: 'hidden';
}

export interface ColorInputItem<TValues = any> extends BaseFieldProps<TValues> {
  type: 'color';
  format?: 'hex' | 'rgba' | 'rgb' | 'hsl';
}

export interface OTPInputItem<TValues = any> extends BaseFieldProps<TValues> {
  type: 'otp';
  length?: number;
}

export interface MaskInputItem<TValues = any> extends BaseFieldProps<TValues> {
  type: 'mask';
  mask: string;
}

/**
 * Selection inputs
 */
export interface SelectInputItem<TValues = any> extends BaseFieldProps<TValues> {
  type: 'select';
  options:
    | string[]
    | { label: string; value: string }[]
    | (() => Promise<{ label: string; value: string }[]>);
  multiple?: boolean;
  searchable?: boolean;
  clearable?: boolean;
}

export interface CheckboxInputItem<TValues = any> extends BaseFieldProps<TValues> {
  type: 'checkbox';
  labelPosition?: 'left' | 'right';
}

export interface SwitchInputItem<TValues = any> extends BaseFieldProps<TValues> {
  type: 'switch';
  onLabel?: string;
  offLabel?: string;
}

export interface RadioInputItem<TValues = any> extends BaseFieldProps<TValues> {
  type: 'radio';
  options: string[] | { label: string; value: string }[];
  orientation?: 'horizontal' | 'vertical';
}

export interface SegmentedInputItem<TValues = any> extends BaseFieldProps<TValues> {
  type: 'segmented';
  options: string[] | { label: string; value: string }[];
  fullWidth?: boolean;
}

export interface AutocompleteInputItem<TValues = any> extends BaseFieldProps<TValues> {
  type: 'autocomplete';
  options:
    | string[]
    | { label: string; value: string }[]
    | (() => Promise<{ label: string; value: string }[]>);
  multiple?: boolean;
}

export interface TaxonomyInputItem<TValues = any> extends BaseFieldProps<TValues> {
  type: 'taxonomy';
  /**
   * Taxonomy collection key (e.g., 'categories', 'tags', 'departments')
   * Everything else is handled automatically by RNGForm
   */
  collection: string;
  /**
   * Allow multiple selection
   * @default true
   */
  multiple?: boolean;
}

export interface SliderInputItem<TValues = any> extends BaseFieldProps<TValues> {
  type: 'slider';
  min: number;
  max: number;
  step?: number;
  marks?: { value: number; label?: string }[];
}

export interface RangeSliderInputItem<TValues = any> extends BaseFieldProps<TValues> {
  type: 'range-slider';
  min: number;
  max: number;
  step?: number;
  marks?: { value: number; label?: string }[];
}

/**
 * Date inputs
 */
export interface DateInputItem<TValues = any> extends BaseFieldProps<TValues> {
  type: 'date';
  minDate?: Date;
  maxDate?: Date;
  clearable?: boolean;
}

export interface DateRangeInputItem<TValues = any> extends BaseFieldProps<TValues> {
  type: 'date-range';
  minDate?: Date;
  maxDate?: Date;
  clearable?: boolean;
}

/**
 * Rich content inputs
 */
export interface RichTextInputItem<TValues = any> extends BaseFieldProps<TValues> {
  type: 'rich-text';
  minHeight?: number;
  maxHeight?: number;
}

export interface SignatureInputItem<TValues = any> extends BaseFieldProps<TValues> {
  type: 'signature';
  width?: number;
  height?: number;
}

/**
 * Math & Calculated inputs
 */
export interface MathInputItem<TValues = any> extends BaseFieldProps<TValues> {
  type: 'math';
  scope?: Record<string, number | string>;
}

export interface CalculatedInputItem<TValues = any> extends BaseFieldProps<TValues> {
  type: 'calculated';
  /**
   * Function that computes the value based on form values
   * Receives all form values as parameter
   */
  calculation: (values: TValues) => string | number;
  /**
   * Optional format function for display
   * Overrides the format options below
   */
  formatFn?: (value: string | number) => string;
  /**
   * Format options for currency, units, or percent display
   */
  format?: {
    type: 'decimal' | 'currency' | 'percent';
    decimals?: number;
    locale?: string;
    currency?: string;
  };
}

/**
 * Upload components
 */
export interface ImageInputItem<TValues = any> extends BaseFieldProps<TValues> {
  type: 'image-upload';
  maxSizeMB?: number;
  acceptedFormats?: string[];
  aspectRatio?: number;
  enableCrop?: boolean;
  enableBrightness?: boolean;
  enableContrast?: boolean;
  enableSaturation?: boolean;
  enableRotation?: boolean;
  enableFlip?: boolean;
  allowMultiple?: boolean;
  compressQuality?: number;
  outputFormat?: 'jpeg' | 'png' | 'webp';
}

export interface PDFInputItem<TValues = any> extends BaseFieldProps<TValues> {
  type: 'pdf-upload';
  maxSizeMB?: number;
  enablePageDeletion?: boolean;
  enablePageReordering?: boolean;
  enablePageRotation?: boolean;
  allowMultiplePDFs?: boolean;
  minPages?: number;
  maxPages?: number;
}

export interface FileInputItem<TValues = any> extends BaseFieldProps<TValues> {
  type: 'file-upload';
  maxSizeMB?: number;
  allowedExtensions?: string[];
  allowMultiple?: boolean;
  allowDragDrop?: boolean;
}

/**
 * Special inputs
 */
export interface GeoInputItem<TValues = any> extends BaseFieldProps<TValues> {
  type: 'geo';
  defaultCenter?: { lat: number; lng: number };
  zoom?: number;
}

/**
 * Layout components
 */
export interface SectionItem<TValues = any> {
  type: 'section';
  title: string;
  description?: string;
  collapsible?: boolean;
  defaultOpened?: boolean;
  children: RNGFormItem<TValues>[];
}

export interface GroupItem<TValues = any> {
  type: 'group';
  label?: string;
  children: RNGFormItem<TValues>[];
}

export interface WizardItem<TValues = any> {
  type: 'wizard';
  steps: {
    label: string;
    description?: string;
    children: RNGFormItem<TValues>[];
  }[];
}

export interface ArrayFieldItem<TValues = any> {
  type: 'array';
  name: Path<TValues>;
  itemSchema: RNGFormItem<any>[];
  addLabel?: string;
  removeLabel?: string;
  minItems?: number;
  maxItems?: number;
}

export interface DataGridItem<TValues = any> {
  type: 'data-grid';
  name: Path<TValues>;
  columns: {
    field: string;
    header: string;
    width?: number;
  }[];
  editable?: boolean;
}

/**
 * Main discriminated union for all form items
 */
export type RNGFormItem<TValues = any> =
  // Text variants
  | TextInputItem<TValues>
  | PasswordInputItem<TValues>
  | NumberInputItem<TValues>
  | HiddenInputItem<TValues>
  | ColorInputItem<TValues>
  | OTPInputItem<TValues>
  | MaskInputItem<TValues>
  // Selection
  | SelectInputItem<TValues>
  | CheckboxInputItem<TValues>
  | SwitchInputItem<TValues>
  | RadioInputItem<TValues>
  | SegmentedInputItem<TValues>
  | AutocompleteInputItem<TValues>
  | TaxonomyInputItem<TValues>
  | SliderInputItem<TValues>
  | RangeSliderInputItem<TValues>
  // Date
  | DateInputItem<TValues>
  | DateRangeInputItem<TValues>
  // Rich content
  | RichTextInputItem<TValues>
  | SignatureInputItem<TValues>
  // Special
  | GeoInputItem<TValues>
  | MathInputItem<TValues>
  | CalculatedInputItem<TValues>
  // Upload
  | ImageInputItem<TValues>
  | PDFInputItem<TValues>
  | FileInputItem<TValues>
  // Layouts
  | SectionItem<TValues>
  | GroupItem<TValues>
  | WizardItem<TValues>
  | ArrayFieldItem<TValues>
  | DataGridItem<TValues>;

/**
 * Form schema structure
 */
export interface RNGFormSchema<TValues = any> {
  items: RNGFormItem<TValues>[];
}


// FILE: rng-forms/types/errors.ts

/**
 * Typed form error handling for RNGForm
 * Provides discriminated union types for form-specific errors
 */

// Polyfill for AppError, AppErrorCode, CustomError using Error class
export enum AppErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  DB_ERROR = 'DB_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
}

export class AppError extends Error {
  code: AppErrorCode;
  details?: any;
  constructor(message: string, code: AppErrorCode, details?: any) {
    super(message);
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class CustomError extends Error {
  code?: AppErrorCode;
  details?: any;
  constructor(message: string, code?: AppErrorCode, details?: any) {
    super(message);
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, CustomError.prototype);
  }
  static validation(errors: Record<string, string[]>, message = 'Please check the form fields') {
    const err = new CustomError(message, AppErrorCode.VALIDATION_ERROR, {
      validationErrors: errors,
    });
    return err;
  }

  // Patch: add static permission method to CustomError for compatibility
  static permission(code: string, fieldName: string, message: string): CustomError {
    const err = new CustomError(message, AppErrorCode.PERMISSION_DENIED, { fieldName });
    return err;
  }
}

export interface FormValidationError extends AppError {
  code: AppErrorCode.VALIDATION_ERROR;
  details: {
    validationErrors: Record<string, string[]>;
    fieldCount: number;
  };
}

export interface FormSubmissionError extends AppError {
  code: AppErrorCode.DB_ERROR | AppErrorCode.INTERNAL_ERROR;
  details: {
    step: 'validation' | 'preprocessing' | 'submit' | 'postprocessing';
    originalError?: string;
  };
}

export interface FormPermissionError extends AppError {
  code: AppErrorCode.PERMISSION_DENIED;
  details: {
    fieldName?: string;
    requiredRole?: string;
  };
}

export type FormError = FormValidationError | FormSubmissionError | FormPermissionError | AppError;

// Patch: polyfill Result type for form-submission-handler
export type Result<T> = { ok: true; value: T } | { ok: false; error: Error };

export class FormErrorHandler {
  /**
   * Create a validation error for specific form fields
   */
  static validationError(
    errors: Record<string, string[]>,
    message = 'Please check the form fields',
  ): CustomError {
    return CustomError.validation(errors, message);
  }

  /**
   * Create a submission error
   */
  static submissionError(
    step: 'validation' | 'preprocessing' | 'submit' | 'postprocessing',
    message: string,
    originalError?: string,
  ): CustomError {
    return new CustomError(message, AppErrorCode.INTERNAL_ERROR, { step, originalError });
  }

  /**
   * Create a permission error for a field
   */
  static fieldPermissionError(fieldName: string, message?: string): CustomError {
    return CustomError.permission(
      `edit-field:${fieldName}`,
      fieldName,
      message || `You don't have permission to edit ${fieldName}`,
    );
  }

  /**
   * Is this error a validation error?
   */
  static isValidationError(error: AppError): error is FormValidationError {
    return error.code === AppErrorCode.VALIDATION_ERROR;
  }

  /**
   * Is this error a submission error?
   */
  static isSubmissionError(error: AppError): error is FormSubmissionError {
    return [AppErrorCode.DB_ERROR, AppErrorCode.INTERNAL_ERROR].includes(error.code);
  }

  /**
   * Is this error a permission error?
   */
  static isPermissionError(error: AppError): error is FormPermissionError {
    return error.code === AppErrorCode.PERMISSION_DENIED;
  }

  /**
   * Get validation errors for a specific field
   */
  static getFieldErrors(error: AppError, fieldName: string): string[] {
    if (!this.isValidationError(error)) return [];
    return (error.details?.validationErrors as Record<string, string[]>)?.[fieldName] || [];
  }

  /**
   * Get all field errors
   */
  static getAllFieldErrors(error: AppError): Record<string, string[]> {
    if (!this.isValidationError(error)) return {};
    return (error.details?.validationErrors as Record<string, string[]>) || {};
  }
}


// FILE: rng-forms/types/index.ts

/**
 * RNGForm Type Exports
 */

export type {
  ArrayFieldItem,
  AutocompleteInputItem,
  BaseFieldProps,
  CalculatedInputItem,
  CheckboxInputItem,
  ColorInputItem,
  CommonCurrency,
  // Formatting
  CommonUnit,
  DataGridItem,
  // Date inputs
  DateInputItem,
  DateRangeInputItem,
  // File inputs
  FileInputItem,
  // Special inputs
  GeoInputItem,
  GroupItem,
  HiddenInputItem,
  // Upload inputs
  ImageInputItem,
  MaskInputItem,
  MathInputItem,
  NumberFormatOptions,
  NumberInputItem,
  OTPInputItem,
  PasswordInputItem,
  // PDF inputs
  PDFInputItem,
  RadioInputItem,
  RangeSliderInputItem,
  // Rich content
  RichTextInputItem,
  // Core types
  RNGFormItem,
  RNGFormSchema,
  // Layouts
  SectionItem,
  SegmentedInputItem,
  // Selection inputs
  SelectInputItem,
  SignatureInputItem,
  SliderInputItem,
  SwitchInputItem,
  TaxonomyInputItem,
  // Text inputs
  TextInputItem,
  WizardItem,
} from './core';

export type {
  DateRangeValue,
  FileValue,
  GeoValue,
  ImageValue,
  MathValue,
  RangeValue,
  SignatureValue,
} from './values';


// FILE: rng-forms/types/values.ts

/**
 * Value types for complex non-primitive fields
 */

/**
 * Geo location value with coordinates and optional address
 */
export interface GeoValue {
  lat: number;
  lng: number;
  address?: string;
}

/**
 * Math expression value with description and computed result
 */
export interface MathValue {
  description: string;
  value: number;
  unit?: string;
}

/**
 * Signature value as Base64 encoded string
 */
export type SignatureValue = string;

/**
 * Image value with metadata
 */
export interface ImageValue {
  url: string;
  file?: File;
  metadata?: {
    width?: number;
    height?: number;
    size?: number;
    name?: string;
  };
}

/**
 * File value with metadata
 */
export interface FileValue {
  url: string;
  file?: File;
  name: string;
  size?: number;
  type?: string;
}

/**
 * Date range value
 */
export interface DateRangeValue {
  start: Date | null;
  end: Date | null;
}

/**
 * Range slider value (tuple)
 */
export type RangeValue = [number, number];


// FILE: rng-forms/utils/form-submission-handler.ts

/**
 * Safe form submission handler with proper error handling and validation
 * Prevents common form submission issues (double submission, validation errors, etc.)
 */

import { AppError, AppErrorCode, Result } from '@/lib/types';
import { FormErrorHandler } from '../types/errors';

export interface FormSubmissionOptions<T> {
  onValidationError?: (errors: Record<string, string[]>) => void;
  onSubmissionError?: (error: AppError) => void;
  onSuccess?: (data: T) => void;
  debounceMs?: number;
}

export class FormSubmissionHandler {
  private isSubmitting = false;
  private lastSubmitTime = 0;
  private debounceTimer?: NodeJS.Timeout;

  /**
   * Handle form submission with proper validation and error handling
   */
  async handle<T>(
    values: Record<string, unknown>,
    onSubmit: (values: Record<string, unknown>) => Promise<Result<T>>,
    options: FormSubmissionOptions<T> = {},
  ): Promise<Result<T> | null> {
    // Prevent double submission
    if (this.isSubmitting) {
      return null;
    }

    // Debounce rapid submissions
    const now = Date.now();
    const debounceMs = options.debounceMs ?? 300;
    if (now - this.lastSubmitTime < debounceMs) {
      return null;
    }

    this.isSubmitting = true;
    this.lastSubmitTime = now;

    try {
      const result = await onSubmit(values);

      // Patch: support Result type ({ ok, value, error })
      if (!result.ok) {
        // Patch: wrap error as AppError if needed
        const appError: AppError =
          result.error instanceof Error && !(result.error as any).code
            ? new AppError(result.error.message, AppErrorCode.INTERNAL_ERROR)
            : (result.error as AppError);
        this.handleError(appError, options);
        return { ok: false, error: appError };
      }

      options.onSuccess?.(result.value);
      return result;
    } catch (error) {
      const appError =
        error instanceof Error
          ? { code: 'INTERNAL_ERROR' as const, message: error.message }
          : { code: 'UNKNOWN' as const, message: 'Unknown error' };

      // Patch: ensure typedError is an instance of AppError
      const typedError: AppError =
        error instanceof AppError
          ? error
          : new AppError(appError.message, appError.code as AppErrorCode);

      this.handleError(typedError, options);
      // Patch: return Result type for error case
      return { ok: false, error: typedError };
    } finally {
      this.isSubmitting = false;
    }
  }

  private handleError<T>(error: AppError, options: FormSubmissionOptions<T>): void {
    if (FormErrorHandler.isValidationError(error)) {
      const errors = FormErrorHandler.getAllFieldErrors(error);
      options.onValidationError?.(errors);
    } else {
      options.onSubmissionError?.(error);
    }
  }

  /**
   * Validate form values synchronously
   */
  static validateSync(
    values: Record<string, unknown>,
    schema: { parse: (data: unknown) => unknown },
  ): Record<string, string[]> | null {
    try {
      schema.parse(values);
      return null;
    } catch (error) {
      if (error instanceof Error && error.message.includes('validation')) {
        return { root: [error.message] };
      }
      return null;
    }
  }

  /**
   * Check if form is currently submitting
   */
  isLoading(): boolean {
    return this.isSubmitting;
  }

  /**
   * Cancel any pending debounced submission
   */
  cancel(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = undefined;
    }
  }

  /**
   * Reset handler state
   */
  reset(): void {
    this.isSubmitting = false;
    this.lastSubmitTime = 0;
    this.cancel();
  }
}


// FILE: rng-forms/utils/image-processing.ts

export interface EditorFilters {
  brightness: number;
  contrast: number;
  saturation: number;
}

function isCtxFilterSupported() {
  if (typeof document === 'undefined') return false;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  return !!ctx && 'filter' in ctx;
}

export async function resizeImageForEditor(
  src: string,
  maxDimension: number = 2000,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      } else {
        resolve(src);
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(URL.createObjectURL(blob));
          else reject(new Error('Resize failed'));
        },
        'image/jpeg',
        0.95,
      );
    };
    img.onerror = () => reject(new Error('Failed to load image for resizing'));
    img.src = src;
  });
}

function applyPixelFilters(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  filters: EditorFilters,
) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const brightness = filters.brightness / 100;
  const contrast = filters.contrast / 100;
  const saturation = filters.saturation / 100;
  const intercept = 128 * (1 - contrast);

  for (let i = 0; i < data.length; i += 4) {
    let r: number = data[i]!;
    let g: number = data[i + 1]!;
    let b: number = data[i + 2]!;

    r *= brightness;
    g *= brightness;
    b *= brightness;

    r = r * contrast + intercept;
    g = g * contrast + intercept;
    b = b * contrast + intercept;

    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    r = lum + (r - lum) * saturation;
    g = lum + (g - lum) * saturation;
    b = lum + (b - lum) * saturation;

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }

  ctx.putImageData(imageData, 0, 0);
}

export async function applyFiltersAndSave(
  sourceCanvas: HTMLCanvasElement,
  filters: EditorFilters,
  fileName: string = 'image.jpg',
  quality: number = 0.9,
): Promise<File | null> {
  const canvas = document.createElement('canvas');
  canvas.width = sourceCanvas.width;
  canvas.height = sourceCanvas.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  if (isCtxFilterSupported()) {
    ctx.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%)`;
    ctx.drawImage(sourceCanvas, 0, 0);
  } else {
    ctx.drawImage(sourceCanvas, 0, 0);
    applyPixelFilters(ctx, canvas.width, canvas.height, filters);
  }

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], fileName, { type: 'image/jpeg' });
          resolve(file);
        } else {
          resolve(null);
        }
      },
      'image/jpeg',
      quality,
    );
  });
}


/**
 * End of review file
 */
