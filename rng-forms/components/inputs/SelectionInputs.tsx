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
