#

# Error Contract Alignment

#

# All error types and bubbling rules in this document are strictly aligned with the finalized kernel invariants and error enums. No free-text or untyped errors are allowed. All errors must be deterministic, explainable, and mapped to canonical error types as defined in the kernel contracts.

# Feature Execution Errors — Phase 0.5

## Error Bubbling Rules

- Only errors of type Auth, RBAC, Feature, or Infra may bubble to the caller.
- Unhandled errors must crash the feature execution engine.
- Known errors (Auth, RBAC, Feature) must be wrapped with context and reason.
- Infra errors (e.g., network, database) must be wrapped and logged.

## Error Ownership

- Auth errors: Only thrown by auth service or flows
- RBAC errors: Only thrown by RBAC service/engine
- Feature errors: Only thrown by feature logic
- Infra errors: Only thrown by kernel infrastructure

## Wrapping

- All errors must be wrapped with their origin and reason before bubbling.
- No error may be silently swallowed.

## Examples

- AuthDisabledError, EmailNotVerifiedError, SignupNotAllowedError, OwnerAlreadyExistsError, InvalidCredentialsError
- RBACForbiddenError, RBACMisconfigurationError
- FeatureExecutionError
- InfraError

## Feature Execution Error Contract

### FeatureExecutionError

All errors thrown by feature logic must be wrapped in a FeatureExecutionError. Features may not:

- Call other features
- Branch on role
- Inspect assignments
  Any violation is a kernel-breaking error.
