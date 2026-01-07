# rng-forms

Schema-driven form rendering utility built on Mantine UI + React Hook Form + Zod. Use it **only** for UI form composition; keep business logic and data access in services/hooks (rng-firebase).

## Core Architecture

- Schema model lives in [rng-forms/types/core.ts](rng-forms/types/core.ts): discriminated union of inputs, uploads, layouts, and metadata (dependencies, renderLogic, propsLogic, colProps, etc.).
- Rendering flow: `RNGForm` (form shell) → `FieldWrapper` (conditional logic, error mapping) → lazy component registry in [rng-forms/core/Registry.tsx](rng-forms/core/Registry.tsx) for code-split inputs/layouts → Mantine primitives.
- Conditional logic: `dependencies`, `renderLogic`, and `propsLogic` are resolved by [rng-forms/hooks/useFieldLogic.ts](rng-forms/hooks/useFieldLogic.ts); scope-aware watching avoids unnecessary re-renders.
- DSL: [rng-forms/dsl/factory.ts](rng-forms/dsl/factory.ts) exposes `createFormBuilder(zodSchema)` to generate schema items with path-safe helpers (scoped prefixes, array item scopes, wizard/section/group/array/data-grid builders). Reusable templates live in [rng-forms/dsl/templates.ts](rng-forms/dsl/templates.ts) (fullName, contactInfo, address, etc.).
- Component registry is lazy-loaded (React.lazy + Suspense) to keep bundles lean; see [rng-forms/core/Registry.tsx](rng-forms/core/Registry.tsx) for mapping.

## Usage Pattern

- Define a Zod schema and infer values; pass it to `createFormBuilder` and `RNGForm`.
- Pass `validationSchema` (Zod) and `schema.items` to `RNGForm`. All form-level props (submit/reset labels, readOnly, progress bar, field counter, externalErrors, requireChange, etc.) are on [rng-forms/RNGForm.tsx](rng-forms/RNGForm.tsx).
- Wire `onSubmit` to services/hooks (e.g., rng-firebase hooks). Avoid data access or side effects inside field components; keep them in pipeline services. Taxonomy input is the only built-in data fetcher (see below).

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
      b.taxonomy('category', { label: 'Categories', collection: 'categories' }),
    ]),
  ],
};

<RNGForm schema={formSchema} validationSchema={schema} onSubmit={(values) => myService(values)} />;
```

## Field Types & Layouts

- Inputs: text/password/number/color/otp/mask/hidden; selection (select/multiSelect via `multiple`, checkbox, switch, radio, segmented, autocomplete, slider/range-slider); dates (date, date-range); rich-text; math; calculated.
- Uploads: image-upload (crop/compress/tune), pdf-upload (page ops), file-upload (extensions, drag/drop).
- Special: taxonomy (collection-backed), signature, geo (map), data-grid.
- Layouts: section (title/desc/collapsible), group (inline grouping), wizard (steps), array (repeating item schema with min/max/add/remove labels), data-grid. Use `colProps` per item for Mantine Grid placement.

## Validation

- Primary validation is Zod (required). Per-field `validation` props map to React Hook Form rules for quick guards.
- Async validation: [rng-forms/hooks/useAsyncValidation.ts](rng-forms/hooks/useAsyncValidation.ts) provides debounced, retryable validators with canned helpers (`usernameAvailable`, `emailUnique`, etc.).
- Cross-field validation: [rng-forms/hooks/useCrossFieldValidation.ts](rng-forms/hooks/useCrossFieldValidation.ts) watches trigger fields and sets errors on a target field (includes helpers like `dateRange`, `mustMatch`, `atLeastOne`).

## Conditional Logic & Dynamic Props

- Add `dependencies` to watch other fields (scoped or root via `!field`).
- `renderLogic(scope, root)` → boolean visibility; `propsLogic(scope, root)` → partial props overrides (e.g., disable when flags are false). Scope is auto-derived for nested/array items; can be overridden with `scopePrefix`.

## Taxonomy Field

- Type `taxonomy` uses [rng-forms/components/inputs/TaxonomyInput.tsx](rng-forms/components/inputs/TaxonomyInput.tsx); fetches options from `taxonomyService` (Firestore) and logs via `globalLogger`. Supports search, multi-select, refresh, and optional creatable entries (persist best-effort). Keep RBAC/business rules in services; this component is UI-only.

## Math & Calculated

- `math` uses a math scope for inline evaluation.
- `calculated` takes `calculation(values)` and optional `format`/`formatFn`; values are read-only display fields.

## Arrays, Wizards, and Layouts

- `array` wraps a nested item schema per row; `scope()` in the DSL prefixes nested paths safely.
- `wizard` uses `steps` with labels/descriptions; components are lazy-loaded.
- `section`/`group` provide structure; `data-grid` renders tabular read/edit layouts.

## Submission & UX

- `RNGForm` manages submit/reset state, success/error badges, optional confirmation before reset, progress bar, required field counter, error summary, externalErrors display, and readOnly/disabled harmonization (merges field-level + context-level flags).
- FormSubmissionHandler debounces submit, sets transient status, and surfaces `onSubmitSuccess`/`onSubmitError` callbacks.

## Extension Guidance

- Extend by adding new field components + registry entries; avoid mutating existing field contracts.
- Keep business logic, data fetching, and side effects out of components; route through services/hooks. rng-forms is for form UI composition only.
