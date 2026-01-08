# rng-firebase Production Readiness Roadmap

> Goal: make rng-firebase a **stable, safe execution kernel** so feature teams can build without touching auth, RBAC, or infrastructure.

---

## PHASE 0 — HARD STOP (Current State)

**Status:** ❌ Not production-ready

**Blocking issues:**

- ExecutionContext not wired
- AuthProvider stubbed
- Mixed execution paths (feature engine vs raw mutations)
- Broken tests enforcing wrong behavior
- Incomplete guards exported as public API
- Inconsistent DSL naming

**Rule:** 🚫 No feature development until Phase 2 is complete.

---

## PHASE 1 — KERNEL STABILIZATION (FOUNDATION)

### 1.1 Rename & Restructure (No Behavior Change)

**Objective:** align naming with responsibility

- Rename `abstract-service-hooks` → `feature-execution-engine`

- Folder split:

  ```
  feature-execution-engine/
  ├─ core/            # execution, RBAC, context, errors
  ├─ react/           # hooks, suspense, boundaries
  ├─ dsl/             # defineCommandFeature, defineQueryFeature
  └─ index.ts         # public surface
  ```

- Remove legacy exports:

  - `useFeature`
  - string-based feature APIs

---

### 1.2 Define Public vs Private Surface

**Public (exported):**

- defineCommandFeature
- defineQueryFeature
- useFeatureQuery
- useFeatureMutation
- useFeatureSubscription
- ServiceErrorBoundary
- ServiceSuspense
- RNGFirebaseAppShell

**Private (never exported):**

- ExecutionContextReact
- assertRBAC internals
- Auth state resolution
- Context wiring

> 🔒 Rule: App code must never touch ExecutionContext directly.

---

## PHASE 2 — EXECUTION CONTEXT & AUTH INTEGRATION

### 2.1 Auth State Machine (Hard Requirements)

Implement real AuthProvider:

- Firebase Auth subscription
- Hydrate user from UserRepository
- Enforce invariants:

  - disabled → disabled
  - invited → invited
  - email not verified → unverified
  - active → authenticated

Single source of truth:

```ts
AuthState = {
  status,
  user | null
}
```

---

### 2.2 ExecutionContext Resolver

**Create internal resolver:**

```ts
AuthState → ExecutionContext
```

ExecutionContext invariants:

- user always present
- role always resolved
- now injected once
- frozen

**Mounted ONLY inside RNGFirebaseAppShell**

---

### 2.3 RNGFirebaseAppShell Responsibilities

- Mount QueryClientProvider
- Mount AuthProvider
- Resolve ExecutionContext
- Provide ExecutionContextReact
- Wrap ServiceSuspense + ServiceErrorBoundary

> After this, `useResolvedExecutionContext()` must never throw in valid routes.

---

## PHASE 3 — FEATURE EXECUTION ENGINE COMPLETION

### 3.1 Enforce Single Execution Path

**Rule:**

> All domain reads/writes MUST go through feature engine.

Actions:

- Rewrite profile hooks to use feature DSL
- Rewrite team hooks to use feature DSL
- Remove direct `useMutation` usage from app-facing hooks

---

### 3.2 RBAC Enforcement Guarantees

- assertRBAC must be called:

  - before every query
  - before every mutation
  - before every subscription

- RBAC context supported:

  - teamId
  - isAssigned

---

### 3.3 Audit Logging Contract

- Canonical AuditEvent only
- All audit events emitted inside feature execution
- No ad-hoc audit writes

---

## PHASE 4 — UI GUARDS & ROUTING SAFETY

### 4.1 Implement Guards (No TODOs)

Implement:

- <RequireAuthenticated />
- <RequireVerified />
- <RequireActiveUser />
- <RequireRole />
- <RBACCan />

Behavior:

- Throw ServiceError on violation
- Integrate with ServiceErrorBoundary

---

### 4.2 Route Safety Contracts

Provide helpers:

- ProtectedRoute
- PublicRoute
- SignupRoute (owner bootstrap / invite only)

---

## PHASE 5 — SIGNUP & INVITE FLOWS (CLOSED SYSTEM)

### 5.1 Signup Rules

- If no users exist:

  - Only OWNER email allowed (env-locked)

- If users exist:

  - Signup ONLY via valid invite

- displayName mandatory

---

### 5.2 Invite Lifecycle

Invite states:

- pending
- accepted
- expired

Only OWNER can:

- Invite users
- Assign roles
- Disable users

Managers:

- Limited team assignment only

---

## PHASE 6 — TESTING & CONTRACT ENFORCEMENT

### 6.1 Replace Current Tests

Remove tests asserting:

- "should throw because unimplemented"

Add tests asserting:

- ExecutionContext always present
- RBAC enforced
- Unauthorized access throws ForbiddenError
- Feature executes exactly once

---

### 6.2 Contract Tests

- Public API snapshot test
- No private imports test
- Feature execution determinism test

---

## PHASE 7 — PRODUCTION HARDENING

### 7.1 Error Taxonomy

Standardize errors:

- UnauthenticatedError
- ForbiddenError
- InvariantViolationError
- ExecutionError

---

### 7.2 Observability Hooks

- Optional diagnostics flag
- Feature execution timing
- Audit failure alerts

---

## PHASE 8 — READY FOR FEATURE DEVELOPMENT ✅

**Exit criteria:**

- App code never imports auth internals
- App code never touches Firestore
- App code never checks roles manually
- All features defined via DSL
- All errors handled by boundaries

At this point:

> 🚀 Teams can safely build ERP features without breaking auth, RBAC, or invariants.

---

## FINAL RULE

> **If a feature can break auth or RBAC, the kernel is not done.**
