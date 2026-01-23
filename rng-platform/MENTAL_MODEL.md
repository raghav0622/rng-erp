# RNG Platform — Complete Mental Model (Revised & Expanded)

This is the authoritative description of what you are building.

## 1. What rng-platform is (re-affirmed)

- rng-platform is a client-side ERP kernel + platform
- Application-agnostic, fully reusable, opinionated, and closed
- Enforces correctness by construction
- Designed so a Next.js app initializes it once, then only builds features and UI

## 2. Initialization Model (UPDATED)

- ❌ No env injection, no environment abstraction, no config bags
- ✅ Host app must already have initialized Firestore and Firebase Auth
- rng-platform does not own Firebase initialization
- Kernel bootstrap:

```ts
initRngPlatform({
  appName: string,
  firestore: Firestore,
  auth: FirebaseAuth,
  featureRegistry: FeatureRegistry,
});
```

- Bootstrap guarantees:
  - May only be called once
  - Is atomic
  - Double-init is a hard kernel error
  - Kernel refuses to start if: feature registry is missing, duplicate feature/action exists, or mandatory default domains are not registered

## 3. Roles (LOCKED)

- Roles are fixed, global, and singular:
  - type Role = 'owner' | 'manager' | 'employee' | 'client';
- Invariants:
  - Exactly one role per user
  - No multi-role, stacking, or temporary roles
  - Roles never encode permissions
  - Roles define authority ceilings only

## 4. Role Semantics (CRITICAL)

- **Owner**: Exactly one, bootstrap-only, cannot be disabled/downgraded, RBAC bypass (audited), system actions allowed
- **Manager**: Operational authority, no system-destroying actions, cannot modify kernel config or assign owner-only actions, bounded by RBAC
- **Employee**: No implicit authority, can only act on explicitly assigned things, CRUD only on assigned features/docs/resources
- **Client**: Read-only by default, can raise tickets/comment/review, cannot receive assignments or mutate system state

## 5. Assignment Model (EXPANDED)

- Assignments are first-class domain objects
- type AssignmentScope = { type: 'feature' } | { type: 'resource'; resourceId: string } | { type: 'featureDoc'; docId: string };
- Invariants:
  - Explicit creation/revocation only
  - No implicit escalation/auto-expansion/wildcard scopes
  - No owner-only actions or client assignments
  - Uniqueness: (userId, feature, action, scope)
  - Stored in Firestore, never inferred

## 6. RBAC Mental Model (Expanded)

- Split into two layers:
  1. Pure RBAC Engine: pure, deterministic, stateless, no repos/Firebase
     - Input: { userId, role, feature, action, scope }
     - Output: { allowed: boolean, reason: RBACReason }
  2. RBAC Service: orchestrates permissions/assignments, calls engine, throws typed errors on denial/misconfig
- RBAC Decision Rules (LAW):
  - Owner → allow (bypass)
  - Feature/action must exist in registry
  - Client → deny (unless explicitly allowed)
  - Manager → allow if role allows action
  - Employee → allow only if assignment exists
  - Assignment may never exceed role ceiling
  - Owner-only actions forbidden for non-owner
  - All denials have finite, explainable reasons

## 7. Feature Registry (Clarified)

- Provided from outside, passed at bootstrap, validated once, frozen forever
- type FeatureDefinition = { id: string; actions: string[]; };
- Registry rules: case-sensitive, no wildcards, no mutation, duplicate (feature, action) = boot failure

## 8. Execution Context (COMPLETE)

- ExecutionContext is trusted truth:
  - type ExecutionContext = { user: User; role: Role; now: number; authEpoch: number; };
- Guarantees: created only by kernel, deeply frozen, immutable, invalidated on sign out/role/assignment/user disable, epoch-based invalidation
- No feature may mutate or inspect beyond what is allowed

## 9. Feature Execution Engine (Clarified)

- Features: receive trusted context, never check auth/RBAC, never call other features, never mutate context, never inspect assignments/roles
- Engine enforces: context validity, RBAC pre-check, error wrapping, audit emission

## 10. Auth Domain (Expanded)

- Auth is closed, explicit, state-machine driven
- States: 'unauthenticated', 'authenticated', 'email_unverified', 'disabled', 'owner_bootstrap_allowed', 'invited_signup_allowed'
- Signup rules: no open signup, owner bootstrap if no users, otherwise only invited users
- Display name and email verification mandatory
- Auth owns: lifecycle transitions, session correctness, user enable/disable, invite handling

## 11. User Domain (Expanded)

- User is authoritative identity
- type UserLifecycle = 'invited' | 'active' | 'disabled';
- Invariants: explicit lifecycle transitions, disabled is terminal, role change invalidates all contexts, source tracked (bootstrap | invite)

## 12. Audit Domain (Explicit)

- Audit is mandatory
- Every significant action emits: actor, role, feature, action, scope, timestamp, decision, reason
- Audit is not optional or UI-driven

## 13. Default Domains (Locked)

- Domains: auth, user, rbac, assignment, audit, tickets, chat, notifications, taxonomy
- Each includes: contracts, invariants, errors, services, repo implementation, tests

## 14. Repository Model (Clarified)

- All repos extend rng-repository, live inside rng-platform, not exported, no logic in kernel, no business rules in repos
- Kernel services enforce invariants, not repos

## 15. Platform Layer Responsibilities (Expanded)

- Exports: Providers (KernelProvider), Guards (AuthGuard, RBACGuard), Error Boundaries, Suspense wrappers, React Query bridge, Auth UI helpers
- App code: never initializes domains, never touches repos, never enforces rules

## 16. Final North Star (Updated)

- rng-platform is a client-side ERP platform where the kernel is law, execution is deterministic, access is explicit, and UI is incapable of violating business rules by design.
