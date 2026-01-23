# RNG Platform – Master Roadmap & Checklist

This document is the step-by-step build and review checklist for `rng-platform`.
For the full mental model, see MENTAL_MODEL.md (authoritative for roles, assignments, RBAC, audit, kernel, and platform responsibilities).

---

## 0. Foundational Assumptions (LOCKED)

- `rng-platform` is **client-side only**
- `rng-repository` is a **separate, frozen module** (never re-implemented)
- Kernel is law; UI is dumb
- Everything executes via **features**
- No server code, no server actions
- Fail-closed, deterministic, auditable
- Roles: 'owner', 'manager', 'employee', 'client' (see MENTAL_MODEL.md)
- Assignments: explicit, unique, no implicit escalation (see MENTAL_MODEL.md)
- RBAC: pure engine + service, deterministic, all denials explainable
- Audit: mandatory, not UI-driven

---

## 1. Target Folder Structure (FINAL)

```txt
rng-platform/
├─ rng-kernel/
│  ├─ bootstrap/
│  ├─ execution/
│  ├─ feature-registry/
│  ├─ rbac/
│  ├─ kernel-errors/
│  └─ kernel.types.ts
│
├─ domain/
│  ├─ auth/
│  ├─ user/
│  ├─ assignment/
│  ├─ audit/
│  ├─ taxonomy/
│  ├─ notifications/
│  ├─ chat/
│  └─ tickets/
│
├─ repositories/
│  ├─ user/
│  ├─ auth/
│  ├─ assignment/
│  ├─ audit/
│  ├─ chat/
│  ├─ ticket/
│  └─ taxonomy/
│
├─ adapters/
│  └─ firebase/
│
├─ platform/
│  ├─ react/
│  ├─ hooks/
│  └─ react-query/
├─ index.ts
└─ CONTRIBUTION_LAW.md
```

---

## 2. Phase-by-Phase Roadmap

### Phase 0 — Constitution & Law (COMPLETE)

Checklist:

- [x] CONTRIBUTION_LAW.md exists
- [x] Kernel constitution written
- [x] Execution order defined
- [x] Fail-closed guarantees listed
- [x] No TODOs allowed rule stated
- [x] All domain contracts and invariants explicit
- [x] All edge cases and forbidden states documented
- [x] All contracts use BaseEntity from rng-repository where applicable
- [x] No runtime code, stubs, or TODOs
- [x] Roles, assignments, RBAC, audit, and kernel bootstrap match MENTAL_MODEL.md

Improvements for future phases:

- [ ] Add canonical error code enums/types for each domain (not just kernel)
- [ ] Add explicit contract for platform-level audit/event logging
- [ ] Add versioning and amendment commentary to all contracts
- [ ] Add a global glossary/definitions doc for canonical terms
- [ ] Add a mechanical enforcement checklist for contributors

Deliverables:

- CONTRIBUTION_LAW.md
- KERNEL_CONSTITUTION.md
- MENTAL_MODEL.md

---

### Phase 1 — Kernel Bootstrap & Feature Registry


Checklist:

- [x] initializeKernel(config) implemented
- [x] Feature registry initialized **only once**
- [x] Duplicate feature+action detection
- [x] Kernel refuses boot if registry missing
- [x] Registry immutable after boot

Rules:

- Registry is provided by host
- Kernel never mutates registry

---

### Phase 2 — Execution Context & Feature Engine

Checklist:

- [x] ExecutionContextService implemented
- [x] Context is deeply frozen (recursive freeze)
- [x] Epoch-based invalidation
- [x] FeatureExecutionEngine enforces:
  - [x] Context validation
  - [x] RBAC
  - [x] scopeResolver
  - [x] Audit emission
  - [x] Error wrapping
  - [x] Feature timeout enforced

---

### Phase 3 — RBAC Domain

Checklist:

- [x] RBAC contracts defined
- [x] Pure RBAC engine (stateless, deterministic, no repos)
- [x] RBACService orchestrates assignments and role fetch
- [x] Finite denial reasons enum (no free-text errors)
- [x] Assignment scope support:
  - [x] feature
  - [x] resource
  - [x] featureDoc

Improvements:

- [x] Audit emission for all RBAC decisions
- [x] Owner bypass enforced by kernel
- [x] No forbidden patterns (no RBAC in features/UI/hooks, no wildcards, no role stacking)

---

### Phase 4 — Core Domains (MANDATORY)


For **each domain**:
Required files:

- [x] domain.contract.ts
- [x] domain.invariants.ts
- [x] domain.errors.ts
- [x] domain.service.ts
- [x] domain.service.impl.ts
- [x] domain.tests.ts

Domains:

- [x] user
- [x] auth
- [x] assignment
- [x] audit
- [x] taxonomy
- [x] notifications
- [x] chat
- [x] tickets

---


### Phase 5 — Repository Implementations

Checklist:

- [x] One repository per domain
- [x] Uses rng-repository only
- [x] No business logic
- [x] No invariant checks
- [x] Soft delete respected
- [x] Deterministic queries

---


### Phase 6 — Kernel Executor & Facade

Checklist:

- [x] KernelExecutor implemented
- [x] Enforces auth → context → RBAC → engine
- [ ] FeatureExecutionFacade added
- [ ] Suspense-safe promise semantics

---

### Phase 7 — Platform Layer (React)

Checklist:

- [ ] KernelProvider
- [ ] AuthBoundary
- [ ] RBACBoundary
- [ ] ErrorBoundary
- [ ] SuspenseBoundary
- [ ] React Query integration
- [ ] No React imports in kernel

---

### Phase 8 — Public API Surface

Checklist:

- [ ] index.ts exports only:
  - initializeKernel
  - facades
  - hooks
  - providers
  - domain contracts
- [ ] No internal leakage
- [ ] No repo exports

---

## 3. Final Acceptance Criteria

- [ ] Kernel can be initialized once
- [ ] Default domains work without app wiring
- [ ] UI never touches repos
- [ ] All errors are typed
- [ ] All flows auditable
- [ ] Platform reusable across apps

---

## 4. End Goal

A Next.js app does:

```ts
initializeKernel({
  appName: 'My ERP',
  firestore,
  featureRegistry,
});
```

…and **never initializes anything else**.

---

**This roadmap is binding.**
Any deviation is a kernel violation.
