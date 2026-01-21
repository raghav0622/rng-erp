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
