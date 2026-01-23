# RNG Platform Architecture

See MENTAL_MODEL.md for the authoritative mental model, roles, RBAC, assignments, audit, and platform responsibilities.

## Kernel

- Single initialization, atomic, no double-init
- Receives initialized Firestore and Firebase Auth
- Feature registry is validated, frozen, and required

## Roles

- Fixed: 'owner', 'manager', 'employee', 'client'
- One role per user, no stacking, no temporary roles
- Roles define authority ceilings, not permissions

## RBAC

- Pure engine (stateless, deterministic) and service (orchestrator)
- Owner bypass, all denials are explainable

## Assignments

- First-class, explicit, unique (userId, feature, action, scope)
- No implicit escalation, no client assignments

## Audit

- Mandatory, not UI-driven, all significant actions logged

## Platform Layer

- Exports providers, guards, boundaries, and helpers
- App code never touches repos or enforces rules
