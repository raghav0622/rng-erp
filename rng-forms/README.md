# rng-forms

Schema-driven form rendering utility built on Mantine UI + React Hook Form + Zod. Use it **only** for UI form composition; keep business logic and data access in services/hooks (rng-firebase).

## Core Architecture

- Schema model lives in [rng-forms/types/core.ts](rng-forms/types/core.ts): discriminated union of inputs, uploads, layouts, and metadata (dependencies, renderLogic, propsLogic, colProps, etc.).
- Rendering flow: `RNGForm` (form shell) → `FieldWrapper` (conditional logic, error mapping) → lazy component registry in [rng-forms/core/Registry.tsx](rng-forms/core/Registry.tsx) for code-split inputs/layouts → Mantine primitives.
- Conditional logic: `dependencies`, `renderLogic`, and `propsLogic` are resolved by [rng-forms/hooks/useFieldLogic.ts](rng-forms/hooks/useFieldLogic.ts); scope-aware watching avoids unnecessary re-renders.
- DSL: [rng-forms/dsl/factory.ts](rng-forms/dsl/factory.ts) exposes `createFormBuilder(zodSchema)` to generate schema items with path-safe helpers (scoped prefixes, array item scopes, wizard/section/group/array/data-grid builders). Reusable templates live in [rng-forms/dsl/templates.ts](rng-forms/dsl/templates.ts) (fullName, contactInfo, address, etc.).
- Component registry is lazy-loaded (`React.lazy`) to keep bundles lean; see [rng-forms/core/Registry.tsx](rng-forms/core/Registry.tsx) for mapping. **You must wrap `<RNGForm>` in a `<Suspense>` boundary** (e.g. in your page or layout), or the first render of a lazy field can throw. Use a fallback such as a spinner or skeleton: `<Suspense fallback={<LoadingSpinner />}><RNGForm ... /></Suspense>`.

## Usage Pattern

- Define a Zod schema and infer values; pass it to `createFormBuilder` and `RNGForm`.
- **Wrap `<RNGForm>` in `<Suspense fallback={…}>`** so lazy-loaded field components can load without crashing.
- Pass `validationSchema` (Zod) and `schema.items` to `RNGForm`. All form-level props (submit/reset labels, readOnly, progress bar, field counter, externalErrors, requireChange, etc.) are on [rng-forms/RNGForm.tsx](rng-forms/RNGForm.tsx).
- Wire `onSubmit` to services/hooks (e.g., rng-firebase hooks). Avoid data access or side effects inside field components; keep them in pipeline services.

```tsx
import { z } from 'zod';
import RNGForm, { createFormBuilder } from 'rng-forms';

const schema = z.object({
  name: z.string().min(2),
  category: z.string().array().min(1),
});

const b = createFormBuilder(schema);

const formSchema = {
  items: [
    b.section('Details', [b.text('name', { label: 'Name', required: true })]),
    b.section('Taxonomy', [
      b.taxonomy('category', { label: 'Categories', taxonomy: 'categories' }),
    ]),
  ],
};

<RNGForm schema={formSchema} validationSchema={schema} onSubmit={(values) => myService(values)} />;
```

## Field Types & Layouts

- Inputs: text/password/number/color/otp/mask/hidden; selection (select/multiSelect via `multiple`, checkbox, switch, radio, segmented, autocomplete, slider/range-slider); dates (date, date-range); time; email/tel/url; rich-text; math; calculated.
- Uploads: image-upload (crop/compress/tune), pdf-upload (page ops), file-upload (extensions, drag/drop).
- Special: taxonomy (see below; currently a stub—prefer select/autocomplete), signature, geo (map), data-grid.
- Layouts: section (title/desc/collapsible), group (inline grouping), wizard (steps), array (repeating item schema with min/max/add/remove labels), data-grid. Use `colProps` per item for Mantine Grid placement.
- **Currency / money:** Use `type: 'number'` with `formatOptions: { style: 'currency', currency: 'INR' }` (and optional `minimumFractionDigits` / `maximumFractionDigits`). See `NumberFormatOptions` in [types/core.ts](types/core.ts). The number input renders with the appropriate symbol and grouping.
- **Rating:** `type: 'rating'` (e.g. `b.rating('score', { count: 5 })`) for 1–N stars. **Toggle group:** `type: 'toggle-group'` for multi- (or single-) select as buttons (`b.toggleGroup('tags', { options: [...] })`).
- **Help tooltip:** Add `help: '...'` to any field in the schema; a (?) icon with tooltip appears next to the label.
- **Dense mode:** Forms use compact spacing by default (`dense={true}`). Set `dense={false}` on `RNGForm` for looser layout.

## Validation

- Primary validation is Zod (required). Per-field `validation` props map to React Hook Form rules for quick guards.
- Async validation: [rng-forms/hooks/useAsyncValidation.ts](rng-forms/hooks/useAsyncValidation.ts) provides debounced, retryable validators with canned helpers (`usernameAvailable`, `emailUnique`, etc.).
- Cross-field validation: [rng-forms/hooks/useCrossFieldValidation.ts](rng-forms/hooks/useCrossFieldValidation.ts) watches trigger fields and sets errors on a target field (includes helpers like `dateRange`, `mustMatch`, `atLeastOne`).

### Customizing error messages

Validation messages come from your **Zod schema** and from any **per-field `validation`** rules. To customize:

- **Zod:** Use the second argument for message strings (e.g. `z.string().min(2, 'Name must be at least 2 characters')`, `z.string({ required_error: 'This field is required' })`, or `.refine(..., { message: '...' })`). The form uses `zodResolver(validationSchema)`, so whatever message Zod produces is shown as the field error.
- **React Hook Form rules:** In the schema item, `validation: { required: 'Required', minLength: { value: 2, message: 'Too short' } }` — the `message` (or string) is what users see.
- For app-wide defaults (e.g. all “required” fields), define a shared Zod schema helper or a custom resolver that maps `error.code` to your copy; then pass that resolver to `useForm` instead of `zodResolver` if you need full control.

## Conditional Logic & Dynamic Props

- Add `dependencies` to watch other fields (scoped or root via `!field`).
- `renderLogic(scope, root)` → boolean visibility; `propsLogic(scope, root)` → partial props overrides (e.g., disable when flags are false). Scope is auto-derived for nested/array items; can be overridden with `scopePrefix`.
- When a field has no `dependencies`, [useFieldLogic](rng-forms/hooks/useFieldLogic.ts) subscribes to the whole form so logic can read any value; on very large forms, prefer declaring `dependencies` where possible to limit re-renders.

### Cascading selects

For dependent dropdowns (e.g. Country → State → City), the child select’s options can depend on the parent value. Use **`options` as a function that receives `getValues`** and **`optionsDependencies`** so options re-fetch when the parent changes:

- Set the child item’s `dependencies: [parentName]` (for visibility/re-render) and `optionsDependencies: [parentName]` (for re-fetching options).
- Set `options: (getValues) => fetchChildOptions(getValues()[parentName])`.

The template **`fieldTemplates.cascadingSelect(parentName, childName, parentLabel?, childLabel?, parentOptions, getChildOptions)`** builds this for two levels: parent options (array or `() => Promise`), and `getChildOptions: (parentValue) => Promise<Option[]>` for the child. Example: `fieldTemplates.cascadingSelect('country', 'region', 'Country', 'Region', countryOptions, (code) => fetchRegions(code))`.

**Other templates:** `fieldTemplates.slugFromTitle(...)` — title + “Edit slug manually” checkbox + slug; use **`useSlugFromTitle(titlePath, slugPath, overridePath)`** (as a child of RNGForm or in a wrapper) to sync slug from title when override is off. `fieldTemplates.phoneWithCountryCode(...)` — country code select + tel input. `fieldTemplates.asyncSelect(name, fetchOptions, label?, placeholder?)` and `fieldTemplates.asyncAutocomplete(...)` — single select/autocomplete with async options.

## Taxonomy Field

- Type `taxonomy` uses [rng-forms/components/inputs/TaxonomyInput.tsx](rng-forms/components/inputs/TaxonomyInput.tsx). **Currently a stub:** the component is disabled and does not fetch options. It is kept so existing schemas that use `taxonomy` do not break. For new forms, use `select` or `autocomplete` with options loaded from your own service/hook. Schema uses the `taxonomy` prop (e.g. `taxonomy: 'categories'`), not `collection`.

## Math & Calculated

- `math` uses a math scope for inline evaluation.
- `calculated` takes `calculation(values)` and optional `format`/`formatFn`; values are read-only display fields.

## Arrays, Wizards, and Layouts

- `array` wraps a nested item schema per row; `scope()` in the DSL prefixes nested paths safely.
- `wizard` uses `steps` with labels/descriptions; components are lazy-loaded.
- `section`/`group` provide structure; `data-grid` renders tabular read/edit layouts.

### Wizard review step

Add a read-only summary as the last wizard step before submit. Use **`review-summary`** or the DSL helpers:

- **`b.reviewSummary(fields, { title?: string })`** — Renders a list of label/value pairs from current form values. `fields` is `{ path, label }[]` (e.g. `[{ path: 'name', label: 'Name' }, { path: 'email', label: 'Email' }]`). Paths can be nested (e.g. `'address.city'`).
- **`b.wizardReviewStep(fields, stepLabel?, stepDescription?, summaryTitle?)`** — Returns a single wizard step object (label, description, children) whose only child is a review summary. Use it as the last element of `b.wizard([...otherSteps, b.wizardReviewStep([...], 'Review', 'Check your details')])`.

Values are formatted for display (dates as locale string, arrays joined, etc.); null/empty show as "—".

## Submission & UX

- `RNGForm` manages submit/reset state, success/error badges, optional confirmation before reset, progress bar, required field counter, error summary, externalErrors display, and readOnly/disabled harmonization (merges field-level + context-level flags).
- FormSubmissionHandler debounces submit, sets transient status, and surfaces `onSubmitSuccess`/`onSubmitError` callbacks.

### Submit / Reset button outside the form

When the submit or reset button must live outside the form (e.g. in a modal footer):

- **Submit:** Put a hidden native submit inside the form (e.g. via `headerContent` or `footerContent`):  
  `<button type="submit" id="form-submit-trigger" style={{ display: 'none' }} />`  
  Your external “Submit” button then calls `document.getElementById('form-submit-trigger')?.click()`. You can hide the default submit with CSS (e.g. a class that targets the submit area) if you want only the external button.
- **Reset:** Use `showReset={false}` and render your own reset button. To call reset programmatically you need the form instance: use `useFormContext()` in a component that is a child of `RNGForm` (e.g. your reset button component), then call `reset()` from that context.

## Testing

Use **`renderRNGForm`** and **`getFieldLabels`** from `rng-forms` (or `rng-forms/test-utils`) in tests. Requires a DOM environment (e.g. Vitest with `environment: 'jsdom'`) and `@testing-library/react`.

- **`renderRNGForm({ schema, validationSchema, defaultValues?, submitLabel?, ... })`** — Renders the form wrapped in MantineProvider, DatesProvider, and Suspense. Returns `{ screen, submitForm, setFieldValue, getFieldByLabel, onSubmitMock, unmount }`.
- **`submitForm()`** — Clicks the submit button (found by `submitLabel`).
- **`setFieldValue(fieldName, value)`** — Finds the field by its schema label and sets the value (supports text, checkbox, switch).
- **`onSubmitMock`** — The mock passed to `onSubmit`; use `expect(onSubmitMock).toHaveBeenCalledWith(...)` (Vitest or Jest).
- **`getFieldLabels(schema)`** — Returns `Record<fieldName, label>` for all named fields in the schema (useful for custom queries).

Pass a custom **`wrapper`** to add Router or other providers; pass **`onSubmitMock`** if you use Jest and need `jest.fn()`.

## Extension Guidance

- Extend by adding new field components + registry entries; avoid mutating existing field contracts.
- Keep business logic, data fetching, and side effects out of components; route through services/hooks. rng-forms is for form UI composition only.
- **Logging:** Field error boundary and some upload/PDF components use `globalLogger` from `@/lib`. This package is intended for use in a workspace that provides that module (e.g. this monorepo).
