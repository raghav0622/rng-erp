'use client';

import { DatePickerInput, DateInput as MantineDateInput, TimeInput } from '@mantine/dates';
import { isValid, parseISO } from 'date-fns';
import { useController, type Control, type FieldValues } from 'react-hook-form';
import type { DateInputItem, DateRangeInputItem, TimeInputItem } from '../../types/core';

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

export function TimeInputField<TValues extends FieldValues>(
  props: TimeInputItem<TValues> & BaseFieldProps<TValues>,
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
    withSeconds,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    type: _,
    ...rest
  } = props;
  const { field, fieldState } = useController({ name, control });
  const mergedError = error ?? fieldState.error?.message;

  const value = field.value == null || field.value === '' ? null : String(field.value);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const timeString = event.currentTarget.value;
    if (!timeString) {
      field.onChange(null);
      return;
    }
    field.onChange(timeString);
  };

  return (
    <TimeInput
      {...rest}
      label={label}
      description={description}
      placeholder={placeholder ?? (withSeconds ? 'HH:mm:ss' : 'HH:mm')}
      disabled={disabled}
      required={required}
      error={mergedError}
      withSeconds={withSeconds ?? false}
      value={value ?? undefined}
      onChange={handleChange}
      onBlur={field.onBlur}
      ref={field.ref}
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
