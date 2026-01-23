<!-- Copilot / AI agent guidance for contributors and automation -->

# Copilot instructions — rng-erp

This file contains focused, actionable guidance for AI coding agents working in this repository.

- **Big picture**: This is a Next.js frontend app (Next 16) that hosts a schema-driven form UI (`rng-forms`) and a client-safe Firestore repository (`rng-repository`). UI + schema live in `rng-forms`; data access and durable contracts live in `rng-repository`. Keep business logic and side-effects in service layers (e.g., `rng-firebase`/hooks), not inside form inputs or layouts.

- **Key directories**:
  - `rng-forms/` — schema DSL, UI registry, field components, and form runtime. See `rng-forms/RNGForm.tsx`, `rng-forms/dsl/factory.ts`, and `rng-forms/core/Registry.tsx`.
  - `rng-repository/` — frozen v1 contract for Firestore access. Read [rng-repository/README.md](../rng-repository/README.md) before changing public APIs.
  - `lib/` — app-level utilities (env, firebase client, logging). See `lib/env.ts` for environment schema.
  - `app/`, `rng-ui/`, `rng-forms/` — primary React entry points and shared UI patterns.

- **Architectural constraints & conventions**:
  - Zod is the canonical validation layer; field-level props map to React Hook Form rules. Use Zod for schema changes and inference.
  - `rng-forms` is UI-only: do not add data fetching or side effects inside field components. Use service hooks (e.g., `rng-firebase/*`) for fetching/persistence.
  - Registry pattern: new field components must be added to `rng-forms/core/Registry.tsx` (lazy-load with `React.lazy`) and exposed via the DSL (`rng-forms/dsl/factory.ts`) when needed.
  - `rng-repository` is intentionally frozen: do not change public surface or error types; follow README freeze rules.

- **Testing & CI workflows**:
  - Unit tests use `vitest` configured in `vitest.config.ts`. The default test script runs the `unit` project: `npm run test` (maps to `vitest run --project unit`).
  - Storybook tests run under the `storybook` vitest project (Playwright + storybook addon).
  - Example individual test command used in this workspace: `npx vitest run rng-firebase/adapters/adapter-error-mapping.spec.ts`.

- **Dev commands (copyable)**:
  - `npm run dev` — start Next.js dev server
  - `npm run build` — build Next.js app
  - `npm run storybook` — start Storybook
  - `npm run test` — run vitest unit tests

- **TypeScript & resolution notes**:
  - `tsconfig.json` defines `@/*` and `rng-repository` path mappings. Use the existing alias mapping when adding imports.
  - `lib/env.ts` centralizes runtime and client env schema using `@t3-oss/env-nextjs`. For any new environment variables, update this file and ensure `vitest.config.ts` test env values are set when needed.

- **Patterns to follow when modifying forms**:
  1. Create the UI component under `rng-forms/components/`.
  2. Add an entry (lazy) to `rng-forms/core/Registry.tsx` with the same discriminated `type` used by the schema.
  3. Add a helper builder to `rng-forms/dsl/factory.ts` and update `rng-forms/dsl/templates.ts` if you need a reusable template.
  4. Write a small unit test under `rng-forms/stories/_shared` or `rng-forms` tests and run `npm run test`.

- **When editing `rng-repository`**:
  - Read `rng-repository/README.md` first — the module is frozen. Only non-breaking internal fixes are allowed without a major version bump.

- **PR & patch guidance for AI agents**:
  - Prefer small, focused patches. Run `npm run test` before submitting.
  - Do not change `rng-repository` public types or error enums without explicit human approval.
  - Update `rng-forms/README.md` if you add a new field type or change the DSL surface.

If anything in this guide is unclear or you want more detailed examples (e.g., a step-by-step example of adding a `taxonomy`-style input), tell me what section to expand.
