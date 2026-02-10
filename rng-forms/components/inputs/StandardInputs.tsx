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
  EmailInputItem,
  HiddenInputItem,
  MaskInputItem,
  NumberInputItem,
  OTPInputItem,
  PasswordInputItem,
  TelInputItem,
  TextInputItem,
  UrlInputItem,
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

export function EmailInputField<TValues extends FieldValues>(
  props: EmailInputItem<TValues> & BaseFieldProps<TValues>,
) {
  const {
    control,
    name,
    label,
    description,
    placeholder,
    disabled,
    required,
    maxLength,
    autoFocus,
    error,
    ...rest
  } = props;
  const { field, fieldState } = useController({ name, control });
  const safeValue = field.value ?? '';
  const mergedError = error ?? fieldState.error?.message;
  const currentLength = typeof field.value === 'string' ? field.value.length : 0;
  const showCounter = maxLength !== undefined && maxLength > 0;
  const descriptionWithCounter = showCounter
    ? `${description || ''}${description ? ' | ' : ''}${currentLength}/${maxLength}`
    : description;

  return (
    <MantineTextInput
      {...field}
      {...rest}
      type="email"
      inputMode="email"
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

export function TelInputField<TValues extends FieldValues>(
  props: TelInputItem<TValues> & BaseFieldProps<TValues>,
) {
  const {
    control,
    name,
    label,
    description,
    placeholder,
    disabled,
    required,
    maxLength,
    autoFocus,
    error,
    ...rest
  } = props;
  const { field, fieldState } = useController({ name, control });
  const safeValue = field.value ?? '';
  const mergedError = error ?? fieldState.error?.message;
  const currentLength = typeof field.value === 'string' ? field.value.length : 0;
  const showCounter = maxLength !== undefined && maxLength > 0;
  const descriptionWithCounter = showCounter
    ? `${description || ''}${description ? ' | ' : ''}${currentLength}/${maxLength}`
    : description;

  return (
    <MantineTextInput
      {...field}
      {...rest}
      type="tel"
      inputMode="tel"
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

export function UrlInputField<TValues extends FieldValues>(
  props: UrlInputItem<TValues> & BaseFieldProps<TValues>,
) {
  const {
    control,
    name,
    label,
    description,
    placeholder,
    disabled,
    required,
    maxLength,
    autoFocus,
    error,
    ...rest
  } = props;
  const { field, fieldState } = useController({ name, control });
  const safeValue = field.value ?? '';
  const mergedError = error ?? fieldState.error?.message;
  const currentLength = typeof field.value === 'string' ? field.value.length : 0;
  const showCounter = maxLength !== undefined && maxLength > 0;
  const descriptionWithCounter = showCounter
    ? `${description || ''}${description ? ' | ' : ''}${currentLength}/${maxLength}`
    : description;

  return (
    <MantineTextInput
      {...field}
      {...rest}
      type="url"
      inputMode="url"
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
