## Adapter → Domain Error Mapping

All errors originating from adapters (e.g., Firebase, external APIs) MUST be mapped to canonical domain error types before entering the kernel domain layer. No raw adapter or infrastructure errors may propagate beyond the adapter boundary. Every adapter error must be translated, wrapped, or normalized to a domain error (e.g., AuthDisabledError, RBACForbiddenError) as defined in the kernel contracts. This ensures all error handling is deterministic, explainable, and enforceable by type.

# RNG-Firebase Kernel Constitution

## Non-Negotiable Rules

### 1. System Characteristics

- Closed ERP: No open signup, exactly one owner
- Roles are global and singular: owner | manager | employee | client
- Roles do NOT encode permissions
- Permissions are derived from role-level feature permissions and explicit user assignments (stored in Firestore)

### 2. RBAC Philosophy

- RBAC is pure, deterministic, and side-effect free
- RBAC never touches repositories or Firebase
- RBAC decisions are explainable (typed reasons)

### 3. Feature Execution

- Features NEVER check auth
- Features NEVER check RBAC
- Features ONLY receive trusted ExecutionContext
- Execution lifecycle is fixed and unbreakable

### 4. Auth Domain

- All auth flows, preconditions, transitions, and errors are explicit (see domain/auth/auth.flows.ts)
- State guarantees and owner invariants are locked (see domain/auth/auth.invariants.ts)

### 5. User Domain

- User lifecycle is finite and explicit (see domain/user/user.lifecycle.ts)
- RBAC and auth behavior per state is locked
- Irreversible transitions are enforced
- User contract includes canonical lifecycle and source fields (see domain/user/contract.ts)
- Client role invariants:
  - Clients are read-only by default
  - Clients cannot receive assignments
  - Clients cannot be invited as managers/employees

### 6. RBAC Domain

- Canonical RBACInput and Assignment models are enforced and re-exported (see domain/rbac/rbac.types.ts, domain/assignment/contract.ts)
- RBACDecision reasons are strictly enums (see domain/rbac/rbac.types.ts, domain/rbac/rbac.reasons.ts)
- Actions are case-sensitive, wildcards forbidden, unknown actions denied (see domain/rbac/rbac.actions.ts)
- Denial reasons are finite and explicit (see domain/rbac/rbac.reasons.ts)
- Owner-only actions, assignment escalation, and misconfiguration are locked (see domain/rbac/rbac.invariants.ts)
- Repository contract notes: soft delete, read-your-writes, ordering guarantees (see domain/rbac/rbac.types.ts)

### 10. Assignment Model

- Assignment model is unified and canonical (see domain/assignment/contract.ts)
- Owners do not require assignments
- Employees require assignment for any write-class action
- Assignments may NEVER grant owner-only actions
- Assignments may NEVER override a denied role action
- Clients cannot receive assignments
- No duplicate assignments for same user/feature/action/resource

### 7. Execution Context

- Canonical user source, role derivation, time rules, and mid-session change behavior are locked (see domain/auth/execution-context.ts)

### 8. Feature Execution Engine

- Error bubbling, wrapping, and ownership are explicit (see feature-execution-engine/contracts/errors.md)
- Feature identity, uniqueness, and forbidden behaviors are locked (see feature-execution-engine/contracts/feature.ts)

### 9. Owner Bootstrap Race Condition

- Owner creation MUST be atomic
- Second bootstrap attempt MUST deterministically fail
- Any race or duplicate owner creation is a kernel-breaking error

## Execution Order (LAW)

1. Auth resolution
2. ExecutionContext creation
3. RBAC evaluation
4. Feature execution
5. Error propagation

## Forbidden for Application Code

- May NOT access repositories directly
- May NOT access Firebase directly
- May NOT check auth or RBAC state
- May NOT mutate ExecutionContext
- May NOT create or mutate users, roles, or assignments outside kernel
- May NOT bypass or short-circuit any kernel contract

## Enforcement

- Any violation of these rules is a kernel-breaking error
- All invariants are enforceable by types, contracts, or runtime checks
- No TODOs, placeholders, or future work allowed
