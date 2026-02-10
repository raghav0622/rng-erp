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
  /** Optional help text shown in a tooltip next to the label (?) */
  help?: string;

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

export interface EmailInputItem<TValues = any> extends BaseFieldProps<TValues> {
  type: 'email';
  maxLength?: number;
  minLength?: number;
}

export interface TelInputItem<TValues = any> extends BaseFieldProps<TValues> {
  type: 'tel';
  maxLength?: number;
  minLength?: number;
}

export interface UrlInputItem<TValues = any> extends BaseFieldProps<TValues> {
  type: 'url';
  maxLength?: number;
  minLength?: number;
}

/**
 * Selection inputs
 */
export interface SelectInputItem<TValues = any> extends BaseFieldProps<TValues> {
  type: 'select';
  options:
    | string[]
    | { label: string; value: string }[]
    | (() => Promise<{ label: string; value: string }[]>)
    | ((getValues: () => TValues) => Promise<{ label: string; value: string }[]>);
  /**
   * When options is (getValues) => Promise, list field paths to watch so options re-fetch when they change (e.g. parent in cascading select).
   */
  optionsDependencies?: Path<TValues>[];
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
    | (() => Promise<{ label: string; value: string }[]>)
    | ((getValues: () => TValues) => Promise<{ label: string; value: string }[]>);
  /**
   * When options is (getValues) => Promise, list field paths to watch so options re-fetch when they change.
   */
  optionsDependencies?: Path<TValues>[];
  multiple?: boolean;
}

export interface TaxonomyInputItem<TValues = any> extends BaseFieldProps<TValues> {
  type: 'taxonomy';
  /**
   * Taxonomy parent category (e.g., 'property_type', 'project_status', 'department')
   * Everything else is handled automatically by RNGForm
   */
  taxonomy: string;
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

export interface RatingInputItem<TValues = any> extends BaseFieldProps<TValues> {
  type: 'rating';
  /** Number of stars (default 5) */
  count?: number;
}

export interface ToggleGroupInputItem<TValues = any> extends BaseFieldProps<TValues> {
  type: 'toggle-group';
  options: string[] | { label: string; value: string }[];
  /** Allow multiple selections (default true for toggle-group) */
  multiple?: boolean;
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

export interface TimeInputItem<TValues = any> extends BaseFieldProps<TValues> {
  type: 'time';
  /** Include seconds in value (HH:mm:ss). Default false (HH:mm). */
  withSeconds?: boolean;
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
 * Review summary: read-only list of form values. Use as the last wizard step before submit.
 */
export interface ReviewSummaryItem<TValues = any> {
  type: 'review-summary';
  /** Optional section title (e.g. "Review your answers") */
  title?: string;
  /** Fields to display: path (form path) and label (display label) */
  fields: { path: Path<TValues>; label: string }[];
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
  | EmailInputItem<TValues>
  | TelInputItem<TValues>
  | UrlInputItem<TValues>
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
  | RatingInputItem<TValues>
  | ToggleGroupInputItem<TValues>
  // Date & time
  | DateInputItem<TValues>
  | DateRangeInputItem<TValues>
  | TimeInputItem<TValues>
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
  | DataGridItem<TValues>
  | ReviewSummaryItem<TValues>;

/**
 * Form schema structure
 */
export interface RNGFormSchema<TValues = any> {
  items: RNGFormItem<TValues>[];
}
