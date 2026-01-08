# Copilot Instructions for RNG ERP Monorepo

## 🧠 LOCKED MENTAL MODEL (DO NOT CHANGE)

You MUST strictly follow this model for all work in `rng-firebase/`:

### Core Principles

- **Features are the only unit of business logic**
- **App developers NEVER:**
  - access auth state
  - check roles
  - check permissions
  - access repositories
- **All execution flows through a Feature Execution Engine**
- **RBAC = Role (global) + Assignment (Firestore-tracked)**
  - Exactly one role per user
  - Assignments are dynamic and resource-based
- **ExecutionContext is immutable and centrally created**
- **Errors bubble to Suspense / Error Boundaries**
- **Signup is closed** (owner bootstrap + invited users only)

### 🧱 REQUIRED LAYERING (ENFORCE STRICTLY)

`rng-firebase/`
├── abstract-client-repository/   ✅ exists
├── feature-execution-engine/     ❌ to build
├── domain/
│   ├── auth/
│   ├── rbac/
│   ├── user/
│   ├── assignment/
│   └── audit/
├── repositories/
│   ├── UserRepository
│   ├── AssignmentRepository
│   ├── RoleRepository (if needed)
│   └── AuditRepository
└── index.ts                      (public surface)

---

## Project Architecture

- **Monorepo**: Multiple packages for forms, UI, Firebase integration, and utilities. TypeScript-first, with Next.js powering the main app (`app/`).
- **Major Packages:**
  - `app/`: Next.js app entry, layout, and pages. Use for routing and top-level UI.
  - `lib/`: Shared utilities (env, firebase, logger). Centralize cross-cutting concerns here.
  - `rng-firebase/`: All business logic and data access must follow the locked model above. Never bypass the feature engine or layering.
  - `rng-forms/`: Form engine, DSL, React components, hooks, and types. All form logic and UI patterns live here.
  - `rng-ui/`: Shared UI components and layouts for consistent branding and navigation.
  - `theme/`, `types/`: Theming and shared type definitions.

## Key Patterns & Conventions

- **TypeScript everywhere**; prefer `type` aliases for data shapes.
- **React functional components** and hooks only. No class components.
- **Form logic**: Centralized in `rng-forms/` using a DSL (`rng-forms/dsl/`). Use `RNGForm` for dynamic forms. See `rng-forms/stories/` for usage.
- **Data access**: All business logic in `rng-firebase/` must use the feature execution engine and repositories, never direct Firestore or auth access.
- **Error boundaries**: Use `core/FieldErrorBoundary.tsx` for form field isolation.
- **Logging**: Use `lib/logger.ts`.
- **Environment**: Use `lib/env.ts` for all env variable access.
- **Composition over inheritance**: Favor hooks and composition patterns.
- **No business logic in UI**: Keep business logic in hooks or repositories, not in UI components.

## Developer Workflows

- **Build**: `next build` (app), `tsc` (packages)
- **Test**: `vitest` for unit tests; contract tests in `rng-firebase/tests/contract/`
- **Lint**: `eslint .` (uses `eslint.config.mjs`)
- **Storybook**: (if present) for form components (see `rng-forms/stories/`)
- **Debugging**: Use Next.js and Vitest built-in tools. For form issues, check hooks in `rng-forms/hooks/`.

## Integration Points

- **Firebase**: All data access via `rng-firebase/feature-execution-engine/` and repositories. Extend these for new data models, never bypass.
- **Forms**: Use `RNGForm` and the DSL in `rng-forms/` for new forms. See `rng-forms/dsl/factory.ts` and `rng-forms/dsl/templates.ts`.
- **UI**: Use and extend components in `rng-ui/` for consistent look and feel.

## Examples & References

- **Form usage**: `rng-forms/stories/` and `rng-forms/components/`
- **Repository contracts**: `rng-firebase/tests/contract/`
- **Type definitions**: `rng-forms/types/`, `types/`

## AI Agent Guidance

- When adding forms, use the DSL and patterns in `rng-forms/dsl/`.
- For new data access, extend repositories and domain logic in `rng-firebase/` following the locked model and layering.
- For new pages, follow Next.js conventions in `app/`.
- Always reference or update relevant contract tests when changing repository logic.

## Do Not

- Do **not** access Firestore, auth, or permissions directly; always use the feature engine and repositories.
- Do **not** add business logic to UI components.
- Do **not** introduce class components or interface-based inheritance.

## See Also

- `README.md` in each package for details and examples.
- Contract and story files for usage patterns.
