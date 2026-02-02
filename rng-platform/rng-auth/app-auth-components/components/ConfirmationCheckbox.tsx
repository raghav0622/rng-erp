'use client';

import { Checkbox, type CheckboxProps } from '@mantine/core';

export interface ConfirmationCheckboxProps extends Omit<CheckboxProps, 'onChange'> {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/**
 * ConfirmationCheckbox - Standardized confirmation checkbox for destructive actions
 */
export default function ConfirmationCheckbox({
  checked,
  onChange,
  ...checkboxProps
}: ConfirmationCheckboxProps) {
  return (
    <Checkbox
      checked={checked}
      onChange={(e) => onChange(e.currentTarget.checked)}
      {...checkboxProps}
    />
  );
}
