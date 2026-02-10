/**
 * Test utilities for RNGForm.
 * Use in tests with a DOM environment (e.g. vitest with environment: 'jsdom').
 * Requires @testing-library/react (peer/dev). Supports both Vitest (vi.fn) and Jest (jest.fn).
 */

import { MantineProvider } from '@mantine/core';
import { DatesProvider } from '@mantine/dates';
import { render, screen, fireEvent } from '@testing-library/react';
import React, { Suspense } from 'react';
import RNGForm from './RNGForm';
import type { RNGFormItem, RNGFormSchema } from './types/core';
import { z } from 'zod';

type FieldMeta = { name: string; label?: string };

function flattenItems(items: RNGFormItem<any>[]): FieldMeta[] {
  const out: FieldMeta[] = [];
  for (const item of items) {
    if ('name' in item && item.name != null) {
      out.push({
        name: String(item.name),
        label: 'label' in item && item.label != null ? String(item.label) : undefined,
      });
    }
    const childItems =
      ('children' in item && Array.isArray((item as any).children)
        ? (item as any).children
        : null) ??
      ('steps' in item && Array.isArray((item as any).steps)
        ? (item as any).steps.flatMap((s: any) => s.children ?? [])
        : null) ??
      ('itemSchema' in item && Array.isArray((item as any).itemSchema)
        ? (item as any).itemSchema
        : null);
    if (childItems?.length) out.push(...flattenItems(childItems));
  }
  return out;
}

/**
 * Build a map of field name -> label from a form schema (for test helpers that need to find fields by name).
 */
export function getFieldLabels(schema: RNGFormSchema<any>): Record<string, string> {
  const entries = flattenItems(schema.items);
  return Object.fromEntries(
    entries.filter((e) => e.label != null).map((e) => [e.name, e.label!]),
  );
}

export interface RenderRNGFormOptions<TValues extends Record<string, unknown>> {
  schema: RNGFormSchema<TValues>;
  validationSchema: z.ZodTypeAny;
  defaultValues?: TValues;
  submitLabel?: string;
  resetLabel?: string;
  showReset?: boolean;
  /** Custom wrapper (e.g. add Router). Defaults to MantineProvider + DatesProvider + Suspense. */
  wrapper?: React.ComponentType<{ children: React.ReactNode }>;
  /** Optional: pass your own mock (e.g. jest.fn() or vi.fn()). If not provided, uses vi.fn() when available else a no-op. */
  onSubmitMock?: (values: TValues) => void;
}

export interface RenderRNGFormResult<TValues> {
  /** @testing-library/react screen */
  screen: typeof screen;
  /** Submit the form (clicks the submit button). Submit button is found by role and submitLabel. */
  submitForm: () => void;
  /** Set a field value by field name (uses label to find the input). Checkbox/switch: pass boolean. */
  setFieldValue: (fieldName: string, value: string | number | boolean) => void;
  /** Get form field element by its label text. */
  getFieldByLabel: (label: string | RegExp) => ReturnType<typeof screen.getByLabelText>;
  /** Mock passed to onSubmit; assert on calls and arguments. */
  onSubmitMock: (values: TValues) => void;
  /** Unmount and cleanup. */
  unmount: () => void;
}

function createSubmitMock<TValues>(): (values: TValues) => void {
  if (typeof vi !== 'undefined' && typeof (vi as any).fn === 'function') {
    return (vi as any).fn() as (values: TValues) => void;
  }
  if (typeof jest !== 'undefined' && typeof (jest as any).fn === 'function') {
    return (jest as any).fn() as (values: TValues) => void;
  }
  return () => {};
}

const DefaultWrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider>
    <DatesProvider settings={{ locale: 'en' }}>
      <Suspense fallback={<div data-testid="form-loading">Loading…</div>}>{children}</Suspense>
    </DatesProvider>
  </MantineProvider>
);

/**
 * Render RNGForm with minimal providers (Mantine, Dates, Suspense) and return test helpers.
 * Requires a DOM environment (jsdom).
 *
 * @example
 * const schema = { items: [b.text('name', { label: 'Name' })] };
 * const { submitForm, setFieldValue, onSubmitMock } = renderRNGForm({
 *   schema,
 *   validationSchema: z.object({ name: z.string() }),
 * });
 * setFieldValue('name', 'Jane');
 * submitForm();
 * expect(onSubmitMock).toHaveBeenCalledWith(expect.objectContaining({ name: 'Jane' }));
 */
export function renderRNGForm<TValues extends Record<string, unknown>>(
  options: RenderRNGFormOptions<TValues>,
): RenderRNGFormResult<TValues> {
  const {
    schema,
    validationSchema,
    defaultValues,
    submitLabel = 'Submit',
    showReset = false,
    wrapper: Wrapper = DefaultWrapper,
    onSubmitMock: userMock,
  } = options;

  const onSubmitMock = userMock ?? createSubmitMock<TValues>();
  const result = render(
    <Wrapper>
      <RNGForm<TValues>
        schema={schema}
        validationSchema={validationSchema}
        defaultValues={defaultValues}
        onSubmit={onSubmitMock as any}
        submitLabel={submitLabel}
        showReset={showReset}
      />
    </Wrapper>,
  );

  const nameToLabel = getFieldLabels(schema);

  function submitForm() {
    const btn = screen.getByRole('button', { name: new RegExp(submitLabel, 'i') });
    fireEvent.click(btn);
  }

  function setFieldValue(fieldName: string, value: string | number | boolean) {
    const label = nameToLabel[fieldName] ?? fieldName;
    const el = screen.getByLabelText(new RegExp(label, 'i'));
    if (el.getAttribute('type') === 'checkbox' || el.getAttribute('role') === 'checkbox') {
      const checked = Boolean(value);
      if ((el as HTMLInputElement).checked !== checked) fireEvent.click(el);
    } else if (el.getAttribute('role') === 'switch') {
      const checked = Boolean(value);
      const current = (el as HTMLInputElement).checked;
      if (current !== checked) fireEvent.click(el);
    } else {
      fireEvent.change(el, { target: { value: String(value) } });
    }
  }

  function getFieldByLabel(label: string | RegExp) {
    return screen.getByLabelText(label);
  }

  return {
    screen,
    submitForm,
    setFieldValue,
    getFieldByLabel,
    onSubmitMock,
    unmount: result.unmount,
  };
}
