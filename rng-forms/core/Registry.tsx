import React from 'react';

const LazyRichText = React.lazy(() => import('../components/rich/RichText'));
const LazyDateInput = React.lazy(() =>
  import('../components/inputs/DateInput').then((m) => ({ default: m.DateInputField })),
);
const LazyDateRangeInput = React.lazy(() =>
  import('../components/inputs/DateInput').then((m) => ({ default: m.DateRangeInputField })),
);
const LazySignature = React.lazy(() => import('../components/special/Signature'));
const LazyMap = React.lazy(() => import('../components/special/Map'));
const LazyWizard = React.lazy(() => import('../components/layouts/WizardLayout'));
const LazySlider = React.lazy(() =>
  import('../components/inputs/SelectionInputs').then((m) => ({ default: m.SliderField })),
);
const LazyRangeSlider = React.lazy(() =>
  import('../components/inputs/SelectionInputs').then((m) => ({ default: m.RangeSliderField })),
);
const LazyHidden = React.lazy(() =>
  import('../components/inputs/StandardInputs').then((m) => ({ default: m.HiddenInputField })),
);
const LazyMask = React.lazy(() =>
  import('../components/inputs/StandardInputs').then((m) => ({ default: m.MaskInputField })),
);

const LazyText = React.lazy(() =>
  import('../components/inputs/StandardInputs').then((m) => ({ default: m.TextInputField })),
);
const LazyPassword = React.lazy(() =>
  import('../components/inputs/StandardInputs').then((m) => ({
    default: m.PasswordInputField,
  })),
);
const LazyNumber = React.lazy(() =>
  import('../components/inputs/StandardInputs').then((m) => ({ default: m.NumberInputField })),
);
const LazyColor = React.lazy(() =>
  import('../components/inputs/StandardInputs').then((m) => ({ default: m.ColorInputField })),
);
const LazyOTP = React.lazy(() =>
  import('../components/inputs/StandardInputs').then((m) => ({ default: m.OTPInputField })),
);
const LazySelect = React.lazy(() =>
  import('../components/inputs/SelectionInputs').then((m) => ({ default: m.SelectField })),
);
const LazySegmented = React.lazy(() =>
  import('../components/inputs/SelectionInputs').then((m) => ({ default: m.SegmentedField })),
);
const LazySwitch = React.lazy(() =>
  import('../components/inputs/SelectionInputs').then((m) => ({ default: m.SwitchField })),
);
const LazyCheckbox = React.lazy(() =>
  import('../components/inputs/SelectionInputs').then((m) => ({ default: m.CheckboxField })),
);
const LazyRadio = React.lazy(() =>
  import('../components/inputs/SelectionInputs').then((m) => ({ default: m.RadioField })),
);
const LazyTaxonomy = React.lazy(() => import('../components/inputs/TaxonomyInput'));
const LazyArrayField = React.lazy(() => import('../components/layouts/ArrayField'));
const LazyMathInput = React.lazy(() => import('../components/inputs/MathInputField'));
const LazyCalculatedField = React.lazy(() => import('../components/inputs/CalculatedField'));
const LazySectionLayout = React.lazy(() => import('../components/layouts/SectionLayout'));
const LazyGroupLayout = React.lazy(() => import('../components/layouts/GroupLayout'));
const LazyDataGrid = React.lazy(() => import('../components/special/DataGridField'));

// Upload components
const LazyImageInput = React.lazy(() =>
  import('../components/inputs/UploadInputs/ImageInput').then((m) => ({
    default: m.ImageInputField,
  })),
);
const LazyPDFInput = React.lazy(() =>
  import('../components/inputs/UploadInputs/PDFInput').then((m) => ({ default: m.PDFInputField })),
);
const LazyFileInput = React.lazy(() =>
  import('../components/inputs/UploadInputs/FileInput').then((m) => ({
    default: m.FileInputField,
  })),
);

export const COMPONENT_REGISTRY: Record<string, React.ComponentType<any>> = {
  // Text / basic
  text: LazyText,
  password: LazyPassword,
  number: LazyNumber,
  hidden: LazyHidden,
  color: LazyColor,
  otp: LazyOTP,
  mask: LazyMask,

  // Selection
  select: LazySelect,
  'multi-select': LazySelect,
  checkbox: LazyCheckbox,
  switch: LazySwitch,
  radio: LazyRadio,
  segmented: LazySegmented,
  taxonomy: LazyTaxonomy,
  slider: LazySlider,
  'range-slider': LazyRangeSlider,

  // Dates & rich
  date: LazyDateInput,
  'date-range': LazyDateRangeInput,
  'rich-text': LazyRichText,

  // Files / media
  signature: LazySignature,

  // Upload
  'image-upload': LazyImageInput,
  'pdf-upload': LazyPDFInput,
  'file-upload': LazyFileInput,

  // Geo / math / calculated
  geo: LazyMap,
  math: LazyMathInput,
  calculated: LazyCalculatedField,

  // Layouts
  section: LazySectionLayout,
  group: LazyGroupLayout,
  wizard: LazyWizard,
  array: LazyArrayField,
  'data-grid': LazyDataGrid,
};
