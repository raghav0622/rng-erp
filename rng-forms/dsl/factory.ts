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
  EmailInputItem,
  FileInputItem,
  GeoInputItem,
  GroupItem,
  HiddenInputItem,
  ImageInputItem,
  MaskInputItem,
  MathInputItem,
  NumberInputItem,
  OTPInputItem,
  PasswordInputItem,
  PDFInputItem,
  RadioInputItem,
  RangeSliderInputItem,
  RatingInputItem,
  RichTextInputItem,
  ReviewSummaryItem,
  RNGFormItem,
  ToggleGroupInputItem,
  SectionItem,
  SegmentedInputItem,
  SelectInputItem,
  SignatureInputItem,
  SliderInputItem,
  SwitchInputItem,
  TelInputItem,
  TextInputItem,
  TimeInputItem,
  UrlInputItem,
  WizardItem,
} from '../types/core';

type InferValues<S extends z.ZodTypeAny> = z.infer<S>;

type ScopedPath<TValues, P extends Path<TValues> | undefined> =
  P extends Path<TValues> ? Path<PathValue<TValues, P>> : Path<TValues>;

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
  email: FieldFn<EmailInputItem<TValues>, TValues, P>;
  tel: FieldFn<TelInputItem<TValues>, TValues, P>;
  url: FieldFn<UrlInputItem<TValues>, TValues, P>;
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
  rating: FieldFn<RatingInputItem<TValues>, TValues, P>;
  toggleGroup: FieldFn<ToggleGroupInputItem<TValues>, TValues, P>;
  // dates & rich
  date: FieldFn<DateInputItem<TValues>, TValues, P>;
  dateRange: FieldFn<DateRangeInputItem<TValues>, TValues, P>;
  time: FieldFn<TimeInputItem<TValues>, TValues, P>;
  richText: FieldFn<RichTextInputItem<TValues>, TValues, P>;
  // files/media
  imageUpload: FieldFn<ImageInputItem<TValues>, TValues, P>;
  pdfUpload: FieldFn<PDFInputItem<TValues>, TValues, P>;
  fileUpload: FieldFn<FileInputItem<TValues>, TValues, P>;
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
  /** Read-only summary of form values (e.g. last wizard step). */
  reviewSummary: (
    fields: { path: ScopedPath<TValues, P>; label: string }[],
    props?: Omit<ReviewSummaryItem<TValues>, 'type' | 'fields'>,
  ) => ReviewSummaryItem<TValues>;
  /** Wizard step that only shows a review summary. Use as last step before submit. */
  wizardReviewStep: (
    fields: { path: ScopedPath<TValues, P>; label: string }[],
    stepLabel?: string,
    stepDescription?: string,
    summaryTitle?: string,
  ) => { label: string; description?: string; children: RNGFormItem<TValues>[] };
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
      ({ type, name: withPrefix(name), ...(props as Omit<Item, 'type' | 'name'>) }) as Item;

  // Field builders
  const text = buildField<TextInputItem<TValues>>('text');
  const password = buildField<PasswordInputItem<TValues>>('password');
  const number = buildField<NumberInputItem<TValues>>('number');
  const hidden = buildField<HiddenInputItem<TValues>>('hidden');
  const color = buildField<ColorInputItem<TValues>>('color');
  const otp = buildField<OTPInputItem<TValues>>('otp');
  const mask = buildField<MaskInputItem<TValues>>('mask');
  const email = buildField<EmailInputItem<TValues>>('email');
  const tel = buildField<TelInputItem<TValues>>('tel');
  const url = buildField<UrlInputItem<TValues>>('url');

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
  const rating = buildField<RatingInputItem<TValues>>('rating');
  const toggleGroup = buildField<ToggleGroupInputItem<TValues>>('toggle-group');

  const date = buildField<DateInputItem<TValues>>('date');
  const dateRange = buildField<DateRangeInputItem<TValues>>('date-range');
  const time = buildField<TimeInputItem<TValues>>('time');
  const richText = buildField<RichTextInputItem<TValues>>('rich-text');

  const imageUpload = buildField<ImageInputItem<TValues>>('image-upload');
  const pdfUpload = buildField<PDFInputItem<TValues>>('pdf-upload');
  const fileUpload = buildField<FileInputItem<TValues>>('file-upload');
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

  const reviewSummary = (
    fields: { path: ScopedPath<TValues, P>; label: string }[],
    props: Omit<ReviewSummaryItem<TValues>, 'type' | 'fields'> = {},
  ): ReviewSummaryItem<TValues> => ({
    type: 'review-summary',
    fields: fields as ReviewSummaryItem<TValues>['fields'],
    ...props,
  });

  const wizardReviewStep = (
    fields: { path: ScopedPath<TValues, P>; label: string }[],
    stepLabel = 'Review',
    stepDescription?: string,
    summaryTitle?: string,
  ): { label: string; description?: string; children: RNGFormItem<TValues>[] } => ({
    label: stepLabel,
    description: stepDescription,
    children: [
      reviewSummary(fields, summaryTitle ? { title: summaryTitle } : {}),
    ],
  });

  Object.assign(builder, {
    text,
    password,
    number,
    hidden,
    color,
    otp,
    mask,
    email,
    tel,
    url,
    select,
    multiSelect,
    checkbox,
    switch: switchField,
    radio,
    segmented,
    autocomplete,
    slider,
    rangeSlider,
    rating,
    toggleGroup,
    date,
    dateRange,
    time,
    richText,
    imageUpload,
    pdfUpload,
    fileUpload,
    signature,
    geo,
    math,
    calculated,
    dataGrid,
    section,
    group,
    wizard,
    array,
    reviewSummary,
    wizardReviewStep,
    scope,
  });

  return builder;
}

export type FormBuilder<TValues> = FormBuilderShape<TValues>;

export function createFormBuilder<S extends z.ZodTypeAny>(_schema: S): FormBuilder<InferValues<S>> {
  return makeBuilder<InferValues<S>>();
}
