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
  email: { hasInternalLabel: false },
  tel: { hasInternalLabel: false },
  url: { hasInternalLabel: false },
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
  rating: { hasInternalLabel: false },
  'toggle-group': { hasInternalLabel: false },

  // Date & time: FieldWrapper renders label
  date: { hasInternalLabel: false },
  'date-range': { hasInternalLabel: false },
  time: { hasInternalLabel: false },

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
  'review-summary': { hasInternalLabel: true },
} as Record<FieldType, FieldConfig>;

/**
 * Check if a field type has an internal label
 */
export function hasInternalLabel(type: FieldType): boolean {
  return FIELD_CONFIG[type]?.hasInternalLabel ?? false;
}
