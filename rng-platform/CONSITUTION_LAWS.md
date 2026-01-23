# RNG Platform Constitution & Laws

See MENTAL_MODEL.md for the full mental model and law rationale.

## Kernel Bootstrap

- Only one initialization, atomic, no env/config bags
- Requires initialized Firestore, Firebase Auth, and feature registry
- Fails if registry missing, duplicate feature/action, or missing default domains

## Roles

- Fixed, global, singular: 'owner', 'manager', 'employee', 'client'
- No multi-role, stacking, or temporary roles

## Assignments

- Explicit, unique, no implicit escalation, no client assignments

## RBAC

- Pure engine and service, deterministic, all denials are explainable

## Audit

- Mandatory, all significant actions logged, not UI-driven
