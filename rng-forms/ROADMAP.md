# rng-forms — Roadmap: Reusable Components, Flows & Polish

Prioritized ideas to add reusable components/flows and to make rng-forms a more polished library.

---

## 1. Reusable components & flows to add

### High value, common patterns

| Addition | Description | Effort |
|----------|-------------|--------|
| **Time input** | Done — `time` type, TimeInputField, timeRange template. | — |
| **Currency / money field** | Documented — use `number` + `formatOptions: { style: 'currency', currency: 'INR' }`. | — |
| **Cascading selects** | Done — `options: (getValues) => Promise`, `optionsDependencies`, `cascadingSelect` template. | — |
| **Review / summary step** | Done — `review-summary` type, `b.reviewSummary()`, `b.wizardReviewStep()`. | — |
| **Slug-from-title** | Done — `slugFromTitle` template + `useSlugFromTitle` hook + `slugify` util. | — |
| **Phone with country code** | Done — `phoneWithCountryCode` template. | — |
| **Submit outside form** | Documented — hidden submit + external button (README). | — |

### Nice to have

| Addition | Description |
|----------|-------------|
| **Rating / stars** | Done — `rating` type, `b.rating()`. |
| **Toggle group (multi)** | Done — `toggle-group` type, `b.toggleGroup()`. |
| **Tabs layout** | Skipped — not needed. |
| **Dense / compact mode** | Done — `dense` prop (default true). |
| **Help tooltip per field** | Done — `help` on base props, LabelWithHelp. |
| **Async options template** | Done — `asyncSelect`, `asyncAutocomplete` templates. |

---

## 2. Polish & library improvements

### Developer experience

| Improvement | Description |
|-------------|-------------|
| **Testing utilities** | Done — `test-utils.tsx`: `renderRNGForm`, `getFieldLabels`, `submitForm`, `setFieldValue`, `getFieldByLabel`, `onSubmitMock`. |
| **Stories (Storybook)** | One story per field type + stories for wizard, array, conditional logic, validation. Documents behavior and prevents regressions. |
| **Public API doc** | Single page listing stable exports (components, hooks, types, DSL) and marking internal/experimental. |
| **Zod → schema hinting** | Optional helper that suggests schema items from a Zod shape (e.g. required → `required: true`, enum → select options). Reduces duplication between Zod and schema. |

### Accessibility & UX

| Improvement | Description |
|-------------|-------------|
| **ARIA & focus** | Ensure labels/errors are tied via `aria-describedby` / `aria-invalid`; focus first error on submit; optional `aria-live` for error summary. |
| **Error message customization** | Documented — Zod / RHF rules / custom resolver (README). |
| **Loading / skeleton** | Optional form-level “loading” state: show skeleton or placeholder while `defaultValues` or schema is loaded async. |

### Theming & layout

| Improvement | Description |
|-------------|-------------|
| **Form density** | Done — `dense` prop (default true), compact gaps when dense. |
| **Custom submit area** | Support `footerContent` as the only action area (hide default buttons) so apps can place Submit/Reset elsewhere (e.g. modal footer) and use `submitTriggerId` or ref. |

### Stability & maintainability

| Improvement | Description |
|-------------|-------------|
| **Semver / changelog** | Tag versions and keep a CHANGELOG so consumers know what’s safe to rely on. |
| **Internal vs public** | Avoid re-exporting purely internal types; document “public” surface (e.g. in README or ROADMAP). |

---

## 3. Quick fix: time template

Done — first-class `time` type added; `fieldTemplates.timeRange()` now renders correctly.

---

## 4. Suggested order of work

1. ~~Time input~~ — Done.  
2. ~~Submit outside form~~ — Documented.  
3. ~~Cascading selects~~ — Done.  
4. ~~Testing utilities~~ — Done.  
5. **Stories** — Not done (optional).  
6. ~~Error messages~~ — Documented.  
7. ~~Currency field~~ — Documented (use number + formatOptions).  
8. ~~Review step / slug / phone template~~ — Done.  

**Remaining (Section 2):** Stories, Public API doc, Zod→schema hinting, ARIA/focus, Loading/skeleton, Custom submit area, Semver/CHANGELOG, Internal vs public.

---

## 5. Out of scope (by design)

- **Business logic / data layer** — Remain in services/hooks; rng-forms stays UI-only.  
- **Full design system** — Mantine is the design system; rng-forms composes it.  
- **Replacing RHF** — Keep React Hook Form + Zod as the core; extend rather than replace.

Use this as a living backlog: pick items by impact and effort, and update the doc as you ship or deprioritize.
