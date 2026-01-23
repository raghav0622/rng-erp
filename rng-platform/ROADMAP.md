# RNG Platform – Master Roadmap & Checklist

This document is the **single source of truth** for building `rng-platform` from scratch.
It is written for **coding agents and senior reviewers** to follow step-by-step and
to verify completeness at each phase.

---

## 0. Foundational Assumptions (LOCKED)

- `rng-platform` is **client-side only**
- `rng-repository` (formerly abstract-client-repository) is:
  - a **separate, frozen module**
  - used as-is
  - never modified or re-implemented
- Kernel is authoritative; UI is dumb
- Everything executes via **features**
- No server code, no server actions
- Fail-closed, deterministic, auditable

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
│
├─ index.ts
└─ CONTRIBUTION_LAW.md
```

---

## 2. Phase-by-Phase Roadmap

### Phase 0 — Constitution & Law

Checklist:

- [ ] CONTRIBUTION_LAW.md exists
- [ ] Kernel constitution written
- [ ] Execution order defined
- [ ] Fail-closed guarantees listed
- [ ] No TODOs allowed rule stated

Deliverables:

- CONTRIBUTION_LAW.md
- KERNEL_CONSTITUTION.md

---

### Phase 1 — Kernel Bootstrap & Feature Registry

Checklist:

- [ ] initializeKernel(config) implemented
- [ ] Feature registry initialized **only once**
- [ ] Duplicate feature+action detection
- [ ] Kernel refuses boot if registry missing
- [ ] Registry immutable after boot

Rules:

- Registry is provided by host
- Kernel never mutates registry

---

### Phase 2 — Execution Context & Feature Engine

Checklist:

- [ ] ExecutionContextService implemented
- [ ] Context is deeply frozen
- [ ] Epoch-based invalidation
- [ ] FeatureExecutionEngine enforces:
  - [ ] Context validation
  - [ ] RBAC
  - [ ] scopeResolver
  - [ ] Audit emission
  - [ ] Error wrapping

---

### Phase 3 — RBAC Domain

Checklist:

- [ ] RBAC contracts defined
- [ ] Pure RBAC engine (no repos)
- [ ] RBACService orchestrates repos
- [ ] Finite denial reasons enum
- [ ] Assignment scope support:
  - [ ] feature
  - [ ] resource
  - [ ] featureDoc

---

### Phase 4 — Core Domains (MANDATORY)

For **each domain**:

Required files:

- [ ] domain.contracts.ts
- [ ] domain.invariants.ts
- [ ] domain.errors.ts
- [ ] domain.service.ts
- [ ] domain.service.impl.ts
- [ ] domain.tests.ts

Domains:

- [ ] user
- [ ] auth
- [ ] assignment
- [ ] audit
- [ ] taxonomy
- [ ] notifications
- [ ] chat
- [ ] tickets

---

### Phase 5 — Repository Implementations

Checklist:

- [ ] One repository per domain
- [ ] Uses rng-repository only
- [ ] No business logic
- [ ] No invariant checks
- [ ] Soft delete respected
- [ ] Deterministic queries

---

### Phase 6 — Kernel Executor & Facade

Checklist:

- [ ] KernelExecutor implemented
- [ ] Enforces auth → context → RBAC → engine
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
