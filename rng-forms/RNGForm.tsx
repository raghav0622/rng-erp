'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Badge,
  Button,
  Container,
  Grid,
  Group,
  Modal,
  Progress,
  Stack,
  Text,
} from '@mantine/core';
import { IconAlertCircle, IconCheck, IconX } from '@tabler/icons-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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
  const hasGrid = useMemo(
    () => schema.items.some((item) => 'colProps' in item && (item as any).colProps),
    [schema.items],
  );

  const containerStyles = {
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
          px={0}
        >
          <form
            onSubmit={(event) => {
              void handleSubmit(event);
            }}
            noValidate
          >
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
              {hasGrid ? (
                <Grid gutter="md">
                  {schema.items.map((item: RNGFormItem<TValues>, idx: number) => (
                    <FieldWrapper key={`${item.type}-${idx}`} item={item} />
                  ))}
                </Grid>
              ) : (
                <Stack gap="md">
                  {schema.items.map((item: RNGFormItem<TValues>, idx: number) => (
                    <FieldWrapper key={`${item.type}-${idx}`} item={item} />
                  ))}
                </Stack>
              )}

              <Group justify="flex-end" gap="md">
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
