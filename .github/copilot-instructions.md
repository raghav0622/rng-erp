# 🧠 RNG-ERP — AI Agent Context & Instructions

## 0. Purpose of This Context

You are operating inside a pre-designed ERP kernel. Your job is to implement ERP features and UI **inside frozen, explicit contracts**—not to design architecture, choose libraries, or invent infrastructure.

**If a requirement cannot be satisfied within this context, STOP and ask. Never invent.**

## 1. What We Are Building

- Production-grade, long-lived custom ERP for a real company
- Must handle real operational data, work offline, be deterministic, auditable, and maintainable
- Correctness, determinism, and contract stability > speed or convenience

## 2. Core Architectural Philosophy

- **Explicit > Implicit**: No ORMs, no magic retries, no hidden background logic. Every operation must be explicit, observable, testable, and bounded.
- **Contracts Over Convenience**: Core subsystems are defined as **frozen contracts** (immutable APIs, versioned, contract-tested). Nothing above may bypass or reinterpret them.

## 3. Locked High-Level Application Flow

```
UI Components
	↓
rng-forms (presentation + validation only)
	↓
Service Hooks (React Query–powered)
	↓
Abstract Client Repository (FROZEN)
	↓
Firestore / Firebase Storage
```

**Cross-cutting:**

- rng-auth → identity/session
- lib/rbac → authorization

## 4. Technology Stack (STRICT)

- React 19.2, Next.js 16 App Router, TypeScript, Mantine v8
- React Query ONLY in service hooks
- Backend: Firebase Auth, Firestore, Firebase Storage
- Server: Auth/session support & background tasks only
- **Explicitly NOT Used:** Server Actions, Next.js cache APIs, ORMs, backend business logic

## 5. Folder & Layer Ownership (Locked)

- `app/`: Next.js App Router (UI shell only)
- `rng-firebase/abstract-client-repository/`: FROZEN data contract
- `rng-firebase/abstract-service-hooks/`: React Query hook factory
- `rng-firebase/rng-auth/`: FROZEN auth contract
- `rng-forms/`: Independent form system
- `rng-ui/`: Shared UI primitives
- `lib/rbac/`: Authorization logic (pure)
- `lib/domain/`: ERP domain orchestration
- `theme/`: Mantine theme
  **Dependency direction is strictly downward. Reverse dependencies are forbidden.**

## 6. Frozen Kernel Contracts

- **Abstract Client Repository**: Authoritative client data protocol. Guarantees typed CRUD, explicit offline queue, idempotent writes, optimistic locking, deterministic retries, and normalized errors. **Nothing above may retry, resolve, or reinterpret.**
- **Abstract Auth Layer**: Single, explicit, testable auth contract. Auth is a state machine (not boolean). Does NOT do authorization or business rules.
- **Service Hooks**: Only layer allowed to orchestrate ERP actions. Use React Query, enforce RBAC, coordinate repositories, normalize async state. **UI must never call repositories directly.**
- **RBAC (lib/rbac)**: Pure, deterministic logic for feature/document permissions. No UI, repository, or server logic.

## 7. Error & Failure Philosophy

- Offline, retries, and partial failure are normal
- Conflicts are explicit
- Errors must be surfaced, not hidden
- Every async boundary must define loading, error, and recovery states

## 8. AI Usage Rules (CRITICAL)

- **AI is NOT allowed to:** design infrastructure, choose libraries, invent layers, bypass frozen contracts, "improve" correctness logic, or add hidden behavior
- **AI IS allowed to:** implement ERP features, compose service hooks, build UI, extend domain logic, use existing DSLs/contracts
- **AI operates inside the ERP kernel—never above it.**

## 9. Developer Workflows

- **Build:** `next build` or `vite build` (see package.json)
- **Test:** `vitest` or `npm test` (contract tests: rng-firebase/tests/contract/)
- **Lint:** `eslint .` (see eslint.config.mjs)
- **Scripts:** see `scripts/` for project-specific scripts (e.g., verify-freeze.ts)

## 10. Examples & References

- Add form field: implement in `rng-forms/components/inputs/`, register in `rng-forms/core/Registry.tsx`
- Add Firestore repo: implement in `rng-firebase/abstract-client-repository/`, add contract tests in `tests/contract/`
- Docs: `rng-firebase/abstract-client-repository/docs/`

---

**Update this file if you introduce new architectural patterns, workflows, or conventions.**

# 🧠 RNG-ERP — Frontend Layer Context

React 19.2 · Next.js 16 · ERP UI Shell

## 1. Purpose of the Frontend Layer

The frontend layer is responsible for:

- Rendering ERP user interfaces
- Expressing user intent
- Managing UI state, not business correctness
- Displaying async states (loading, error, success)
- Preserving UX under concurrency, retries, and offline behavior

The frontend layer is not responsible for:

- Data integrity
- Authorization decisions
- Retry semantics
- Conflict resolution
- Business invariants
- Persistence mechanics

Those concerns are owned by lower layers.

## 2. Frontend Responsibilities (Authoritative)

The frontend owns:

- Page routing and layout composition
- Visual structure and interaction
- Suspense boundaries
- Error boundaries
- Accessibility
- UX density and predictability
- Mapping domain outcomes → UI feedback

The frontend does not own:

- Feature orchestration
- RBAC
- Firestore access
- Auth semantics
- Session correctness

## 3. Technology Constraints (STRICT)

Core Stack

- React 19.2
- Next.js 16 App Router
- TypeScript
- Mantine v8

Mandatory Patterns

- Suspense for async boundaries
- Error Boundaries for fault isolation
- Client Components by default
- Functional components only

Explicitly Forbidden

- Server Actions
- Server-side ERP data fetching
- Next.js cache APIs (ISR, PPR, revalidateTag)
- API routes for ERP logic
- ORMs or data layers in UI
- Repository access from UI

## 4. Next.js 16 — Frontend Usage Rules

App Router Only

- All routing lives under app/
- File-based routing is used strictly
- Route Groups and Parallel Routes allowed
- Intercepting Routes allowed for modals

Server Components (Restricted)

- Server Components may be used only for:
  - Auth session bootstrapping
  - Layout shell rendering
- They must NOT:
  - Fetch ERP data
  - Perform mutations
  - Contain business logic

Client Components (Default)

- All interactive UI is client-side
- All ERP data arrives via service hooks
- Explicit 'use client' required

## 5. Suspense & Error Boundaries (MANDATORY)

Suspense Usage

- Suspense must be used for:
  - Auth initialization
  - ERP data loading
  - Large UI sections (tables, dashboards)
- Suspense boundaries must be:
  - Intentional
  - Scoped
  - Nested where appropriate

Error Boundaries

- Error Boundaries must:
  - Catch render errors
  - Catch async errors surfaced by hooks
  - Display safe, non-technical messages
  - Allow recovery when possible
- No blank screens.
- No swallowed errors.

## 6. React 19.2 — Required Discipline

Concurrency Safety

- All code must be safe under:
  - Strict Mode
  - Concurrent rendering
  - Interrupted renders
  - Re-renders and retries
- No assumptions about:
  - single execution
  - mount/unmount symmetry
  - request ordering

Required React Features

- Use when appropriate:
  - startTransition for non-urgent updates
  - useDeferredValue for heavy rendering
  - useEffectEvent to isolate non-reactive logic
  - <Activity /> for state-preserving visibility
- Ref-as-prop (no forwardRef)
- Ref callback cleanup

React Compiler Awareness

- Prefer clear code over manual memoization
- Avoid premature useMemo / useCallback
- Stabilize references only when necessary

## 7. State Management Rules

State Types (Must Be Separate)

- UI State (local, ephemeral)
- Async State (service hooks / React Query)
- Derived State (computed, not stored)
- Never mix:
  - UI state with domain state
  - Async state with presentation logic

Global State

- Avoid unless justified
- Context only for cross-cutting UI concerns
- No domain logic in context providers

## 8. Forms & User Input

Forms

- Use rng-forms exclusively
- Forms handle:
  - Input composition
  - Validation
  - Submission UX
- Forms do NOT:
  - Call repositories
  - Implement workflows
  - Decide permissions

Submission Rules

- Explicit loading states
- Disabled submit during execution
- Retry-safe UI
- Error feedback mapped from service hooks

## 9. UI Composition & Mantine v8

Mantine Usage

- Idiomatic Mantine patterns only
- Centralized theme
- Minimal overrides
- Consistent spacing & typography

ERP UX Priorities

- Density over whitespace
- Predictability over flair
- Keyboard-first workflows
- Explicit affordances

Accessibility is non-negotiable:

- Semantic HTML
- Keyboard navigation
- Focus management
- WCAG 2.1 AA baseline

## 10. What the Frontend Must NEVER Do

The frontend must not:

- Import repositories
- Interpret Firestore semantics
- Retry writes
- Handle conflicts
- Enforce RBAC
- Encode business rules
- Depend on server data mutations
- Assume online connectivity
- Hide failure states

If the frontend needs to “fix” something, the design is wrong.

## 11. Error & Failure Philosophy (Frontend)

From the frontend perspective:

- Errors are data, not exceptions
- Conflicts are expected outcomes
- Offline is normal
- Retries are user-visible
- Recovery paths must be explicit

Frontend responsibility:

- Surface outcomes clearly
- Guide user action
- Preserve UI consistency

## 12. Frontend–Service Hooks Contract

Frontend components:

- Express intent (create, update, archive)
- Subscribe to hook state
- Render based on hook output

Frontend must NOT:

- Combine multiple repositories
- Orchestrate workflows
- Implement feature logic

Service hooks are the only execution layer.

## 13. AI Rules — Frontend Scope

When acting as an AI inside the frontend layer:

AI May

- Build UI components
- Compose layouts
- Consume service hooks
- Implement forms
- Improve accessibility

AI Must NOT

- Design infrastructure
- Introduce new async patterns
- Bypass service hooks
- Call repositories
- Implement RBAC or auth logic
- Reinterpret errors

If a request violates these rules, AI must stop and ask.

## 14. Summary (Frontend Truth)

The frontend is a deterministic UI machine.

It renders state
It expresses intent
It never decides correctness

Correctness lives below.

# 🧠 RNG-ERP — BACKEND CONTEXT

Server Support Layer · Firebase-Aware · Repository-Respecting

## 1. Purpose of the Backend Layer

The backend exists to support the ERP system, not to control it.

It is not:

- a business logic engine
- a data authority
- a consistency layer
- a fallback for client correctness
- a repair mechanism for offline or failed writes

The backend must never compete with or override the client-side ERP kernel.

## 2. Backend Authority Model (NON-NEGOTIABLE)

The backend has authority over:

- Identity verification
- Session lifecycle
- Security-sensitive operations that cannot run on the client
- Asynchronous, out-of-band system tasks

The backend does NOT have authority over:

- ERP business data
- Write ordering
- Conflict resolution
- Invariants
- RBAC decisions
- Workflow execution

If the backend “knows better” than the client repository, the design is wrong.

## 3. Relationship to Frozen Client Repository

The system contains a frozen client-side data protocol:

Abstract Client Firestore Repository (v1.0.0)

This repository:

- already normalizes Firestore behavior
- already defines retry semantics
- already defines conflict semantics
- already defines offline semantics

Backend Rule

The backend must treat all repository outcomes as final.

The backend must not:

- retry client writes
- replay client mutations
- patch partial writes
- resolve conflicts
- infer intent from data shape
- duplicate repository features

## 4. What the Backend IS Allowed to Do

### 4.1 Authentication & Session Management (PRIMARY)

The backend MAY:

- Verify Firebase ID tokens
- Create, refresh, and revoke session cookies
- Hydrate initial auth state for the frontend
- Enforce account disablement at the auth boundary
- Handle cross-device logout

The backend MUST NOT:

- encode authorization rules
- make feature-level decisions
- check permissions

Auth answers “who”, never “what they can do”.

### 4.2 Identity-Adjacent Operations

The backend MAY:

- Enable / disable accounts
- Manage auth provider linkage rules
- Enforce auth-related policies (email verification, MFA, etc.)

The backend MUST NOT:

- mutate ERP domain data
- derive permissions
- inspect domain invariants

### 4.3 Read-Only Aggregation & Export

The backend MAY:

- Read Firestore data using Admin SDK for:
  - reports
  - compliance exports
  - analytics pipelines
- Produce derived artifacts (CSV, BI feeds, snapshots)

Rules:

- Read-only
- Eventually consistent
- No feedback loop into ERP writes
- No hidden coupling to UI flows

### 4.4 Asynchronous, Out-of-Band Tasks

The backend MAY:

- Send emails / notifications
- Trigger webhooks
- Run scheduled jobs
- Perform integrity scans (read-only)

Rules:

- Must be idempotent
- Must tolerate partial failure
- Must not block ERP usage
- Must not assume delivery of client writes

## 5. What the Backend MUST NEVER Do

The backend MUST NOT:

❌ Act as a Data Authority

- No Firestore writes that mirror client intent
- No shadow state
- No repair mutations

❌ Reimplement Client Guarantees

- No offline replay
- No retry logic for ERP writes
- No optimistic locking
- No soft delete logic
- No idempotency enforcement

❌ Enforce Business Logic

- No workflows
- No invariants
- No validation rules

❌ Bypass Firestore Security Rules

- No privileged write paths
- No “trusted” ERP mutations

❌ Introduce Hidden Consistency

- No compensating transactions
- No background fixups
- No silent reconciliation

If correctness requires server intervention, the architecture is wrong.

## 6. Backend Failure Model

The backend must assume:

Client writes may be:

- delayed
- duplicated
- dropped
- replayed

Offline queues are volatile
Network partitions are normal

Therefore:

- Backend logic must be idempotent
- Backend logic must be replay-safe
- Backend logic must never assume causality or ordering

## 7. Backend Observability & Audit

The backend SHOULD:

- Log auth/session lifecycle events
- Log background task outcomes
- Emit operational metrics

The backend MUST NOT:

- Log PII unnecessarily
- Log raw Firestore payloads
- Leak repository-internal diagnostics

Auditability focuses on operations, not data mutation.

## 8. Backend Evolution Rules

Any backend change must be evaluated against these questions:

- Does this duplicate repository behavior?
- Does this create a shadow authority?
- Does this weaken client guarantees?
- Does this assume stronger consistency than Firestore provides?

If any answer is yes, the change must be rejected.

## 9. Backend Context Summary

The backend is a support actor, not a leader.

Client repository defines correctness
Firestore + Security Rules enforce authority
Service hooks define intent
Backend enables identity and operations

# 🗂️ RNG-ERP — BACKEND & SYSTEM FOLDER STRUCTURE CONTEXT

This structure enforces ownership, dependency direction, and responsibility.

## 1. Root Structure (System-Wide)

rng-erp/
├── app/ # Next.js App Router (UI shell only)
├── rng-firebase/ # Firebase kernel (client + server)
├── rng-forms/ # Independent form system
├── rng-ui/ # Shared UI primitives
├── lib/ # Domain & authorization logic
├── theme/ # Mantine theme
├── public/
├── middleware.ts # Auth/session routing only
├── next.config.ts
├── tsconfig.json
└── package.json

## 2. rng-firebase/ — Firebase Kernel (CRITICAL)

This is infrastructure, not UI or domain logic.

rng-firebase/
├── abstract-client-repository/ # FROZEN data contract
│ ├── src/
│ ├── docs/
│ └── tests/
│
├── abstract-service-hooks/ # React Query hook factory
│ ├── src/
│ ├── tests/
│ └── README.md
│
├── rng-auth/ # FROZEN auth contract
│ ├── client/
│ ├── server/
│ ├── shared/
│ ├── tests/
│ └── README.md
│
├── client/
│ ├── firebase.ts # Client SDK init
│ ├── firestore.ts
│ └── storage.ts
│
├── server/
│ ├── firebase-admin.ts # Admin SDK init
│ ├── auth-session.ts # Session cookie logic
│ └── background/
│
└── index.ts # Explicit public exports only

Rules

- No UI imports
- No domain rules
- No RBAC
- Explicit exports only

## 3. lib/ — Domain & Authorization

lib/
├── rbac/
│ ├── permissions.ts
│ ├── policies.ts
│ ├── evaluators.ts
│ └── tests/
│
├── domain/
│ ├── customers/
│ ├── orders/
│ ├── inventory/
│ └── shared/
│
└── utils/

Rules

- Pure logic
- No Firebase SDK
- No React
- Deterministic & testable

## 4. Dependency Direction (STRICT)

UI (app, rng-ui)
↓
rng-forms
↓
abstract-service-hooks
↓
abstract-client-repository
↓
Firestore / Storage

RBAC (lib/) → service-hooks
Auth (rng-auth) → service-hooks + server

Reverse dependencies are forbidden.

## 5. Why This Structure Matters

This structure:

- Prevents logic leakage
- Makes authority explicit
- Protects frozen contracts
- Enables safe AI assistance
- Scales to real ERP complexity

Final Backend Truth

The backend supports the ERP.
It never decides the ERP.

This context is now complete.
