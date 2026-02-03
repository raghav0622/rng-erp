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
  RichTextInputItem,
  RNGFormItem,
  SectionItem,
  SegmentedInputItem,
  SelectInputItem,
  SignatureInputItem,
  SliderInputItem,
  SwitchInputItem,
  TextInputItem,
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
  // dates & rich
  date: FieldFn<DateInputItem<TValues>, TValues, P>;
  dateRange: FieldFn<DateRangeInputItem<TValues>, TValues, P>;
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

  const date = buildField<DateInputItem<TValues>>('date');
  const dateRange = buildField<DateRangeInputItem<TValues>>('date-range');
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

  Object.assign(builder, {
    text,
    password,
    number,
    hidden,
    color,
    otp,
    mask,
    select,
    multiSelect,
    checkbox,
    switch: switchField,
    radio,
    segmented,
    autocomplete,
    slider,
    rangeSlider,
    date,
    dateRange,
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
    scope,
  });

  return builder;
}

export type FormBuilder<TValues> = FormBuilderShape<TValues>;

export function createFormBuilder<S extends z.ZodTypeAny>(_schema: S): FormBuilder<InferValues<S>> {
  return makeBuilder<InferValues<S>>();
}
