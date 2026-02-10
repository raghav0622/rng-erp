# RNG ERP — Project Context & AI Instructions

This document is the **canonical project context** for developers and AI agents. It describes the layered architecture, dependency rules, and where to implement features. For detailed patterns, error codes, and copy-paste examples see [copilot-instructions.md](./copilot-instructions.md).

---

## 1. Layered Architecture (Four Pillars)

| Layer | Path | Role | Contains business logic? |
|-------|------|------|---------------------------|
| **Data access** | `rng-repository/` | Firestore CRUD, soft delete, optimistic locking, history, errors. **Mechanical data access only.** | ❌ No |
| **Form rendering** | `rng-forms/` | Schema-driven forms (Mantine + React Hook Form + Zod). DSL, registry, field components, validation. **UI composition only.** | ❌ No |
| **Core business logic** | `rng-platform/` | Services, invariants, domain rules, React Query hooks. **All features and business behavior live here.** | ✅ Yes |
| **UI** | `rng-ui/` | Screens, layouts, UX components, auth UI. Built **on top of Mantine**. | ❌ No (delegates to platform) |

**Critical rule:** `rng-repository` and `rng-forms` are **isolated**: they do **not** contain business logic. All feature logic, validation rules, and side effects belong in **rng-platform** (and are exposed to the app via hooks/services). UI (`rng-ui`, `app/`) only composes platform hooks and form/layout components.

---

## 2. Dependency Flow

```
app/ (Next.js routes)
  → rng-ui (screens, layouts, ux, auth-screens, rng-app-provider)
       → rng-platform (hooks, services, types)
            → rng-repository (AbstractClientFirestoreRepository, types, errors)
  → rng-forms (RNGForm, createFormBuilder, field components)
  → rng-platform (for hooks, schemas, errors)
  → lib/ (env, firebase-client, logger)
```

- **rng-platform** may use **rng-repository** (e.g. `ClientTaxonomyService`, `session.repository`, `app-user.service`).
- **rng-platform** must **not** import rng-forms or rng-ui.
- **rng-ui** and **app/** use **rng-platform** hooks (never call platform services directly from UI, except documented advanced cases).
- **rng-forms** is used by **rng-ui** and **app/**; form `onSubmit` and options are wired to **rng-platform** hooks/services.

---

## 3. Key Entry Points & Paths

- **Path aliases (tsconfig):** `@/*` → repo root; `rng-repository` → `./rng-repository/index.ts`. Use `@/rng-platform`, `@/rng-forms`, `@/rng-ui`, `@/lib` for imports.
- **Repository:** Import only from `rng-repository` (or `@/rng-repository`). Public API in [rng-repository/index.ts](./rng-repository/index.ts); see [rng-repository/README.md](./rng-repository/README.md).
- **Forms:** [rng-forms/index.ts](./rng-forms/index.ts); [rng-forms/README.md](./rng-forms/README.md) for DSL, registry, and field types.
- **Platform:** [rng-platform/index.ts](./rng-platform/index.ts) re-exports `rng-auth`; add new feature modules under `rng-platform/` and export from `index.ts`.
- **UI:** Screens under `rng-ui/app-screens/`, auth under `rng-ui/auth-screens/` and `rng-ui/auth/`, layouts under `rng-ui/layouts/`, shared UX under `rng-ui/ux/`. Root provider: `rng-ui/rng-app-provider`.
- **App:** Next.js 16 App Router. Routes under `app/(authenticated)/` and `app/(unauthenticated)/`; pages import screens from `rng-ui` and data/hooks from `rng-platform`.

---

## 4. Where to Implement What

- **New feature (e.g. “invoices”):**  
  - **rng-platform:** New module (e.g. `rng-platform/invoices/`) with service(s), types, and React Query hooks. Services use `AbstractClientFirestoreRepository` (or existing repos) for persistence.  
  - **rng-ui:** New app-screen(s) under `rng-ui/app-screens/[feature]/` (or auth-screens if auth-related). Use hooks from platform only; no direct service calls.  
  - **app:** New route(s) under `app/(authenticated)/...` that render the new screen(s).

- **New form field type:** Implement in **rng-forms** (component + registry + DSL), keep it UI-only. Options/validation that depend on domain rules stay in **rng-platform** and are passed in via schema/props.

- **New Firestore collection / entity:** In **rng-platform**, extend `AbstractClientFirestoreRepository` (or add a repository class that uses it), wrap in a service, expose via hooks. **rng-repository** itself is frozen; do not add new public API there.

- **New UI pattern (e.g. shared modal, page shell):** In **rng-ui** (e.g. `rng-ui/ux/` or `rng-ui/layouts/`). Use Mantine; no business logic.

---

## 5. Frozen / Mutable Boundaries

- **rng-repository:** **v2.x frozen.** Public API and behavior are locked. Only critical bug fixes and contract-aligned corrections. See [rng-repository/README.md](./rng-repository/README.md) and [rng-repository/docs/repository-contract.md](./rng-repository/docs/repository-contract.md).
- **rng-platform/rng-auth (app-auth-service):** **Frozen v1.** No new public methods or signature changes; internal optimizations only. UI must use **hooks** from `app-auth-hooks`, not the service directly.
- **rng-forms:** Evolves with new field types and DSL; keep it free of business logic and data access.
- **rng-platform (other modules):** Where all new business logic and features are implemented (e.g. taxonomy, future invoices).

---

## 6. Conventions (Summary)

- **Validation:** Zod is canonical; form validation via Zod schemas and `rng-forms`; platform hooks export schemas (e.g. `inviteUserSchema`) for forms.
- **Errors:** Repository → `RepositoryError`; platform auth → `AppAuthError` and subclasses. UI uses `getAuthErrorMessage()` / similar mappers; preserve `cause` when rethrowing.
- **UI stack:** React 19, Next 16 App Router, Mantine v8, Tabler Icons. Client components: `'use client'`.
- **App screens:** Follow [rng-ui/app-screens/APP_SCREEN_STRUCTURE.md](./rng-ui/app-screens/APP_SCREEN_STRUCTURE.md): orchestrator (`index.tsx`) + `hooks/use[Screen].ts` (logic) + `ui-components/` (presentation, props-only).

---

## 7. Instructions for AI Agents

1. **Before editing:**  
   - Identify which layer is affected (repository / forms / platform / ui).  
   - If touching **rng-repository** or **rng-platform/rng-auth** (app-auth-service), read the freeze policy and contract docs; do not change public API or behavior except as allowed.

2. **When adding a feature:**  
   - Put **business logic and data access** in **rng-platform** (new or existing module).  
   - Put **screens and composition** in **rng-ui**; use **rng-forms** for forms and **rng-platform** hooks for data/mutations.  
   - Keep **rng-repository** and **rng-forms** free of feature-specific business rules.

3. **Imports:**  
   - Prefer `@/rng-platform`, `@/rng-forms`, `@/rng-ui`, `@/rng-repository`, `@/lib`.  
   - Platform may import repository; UI and app must not import repository directly (go through platform).  
   - UI must use platform **hooks**, not platform services (except where documented).

4. **References:**  
   - Use this file for **architecture and “where does this go?”**.  
   - Use [copilot-instructions.md](./copilot-instructions.md) for **detailed patterns**, auth hooks, error codes, testing, env, and PR checklist.

---

## 8. Quick Reference

| Question | Answer |
|----------|--------|
| Where do I add a new API/feature? | **rng-platform** (service + hooks); optionally new app-screen in **rng-ui** and route in **app/** |
| Where do I add a new form control? | **rng-forms** (component + Registry + DSL) |
| Where do I add a new Firestore collection? | **rng-platform**: new repo class (using AbstractClientFirestoreRepository) + service + hooks. Not in rng-repository public API |
| Can I put business logic in rng-forms or rng-repository? | **No.** Only in **rng-platform** |
| Where do auth types and hooks come from? | **rng-platform** (e.g. `@/rng-platform`, `@/rng-platform/rng-auth`) |
| Where do shared page/screen components live? | **rng-ui** (app-screens, layouts, ux, auth, auth-screens) |
