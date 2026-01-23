# Auth Domain Flows

## States

- unauthenticated
- authenticated
- locked
- pending

## Transitions

- unauthenticated → authenticated: Valid credentials
- authenticated → locked: Policy violation
- any → pending: Challenge required
- pending → authenticated: Challenge success
- any → unauthenticated: Logout or failure

## Invariants

- Only one user authenticated at a time
- No implicit elevation
- All transitions explicit
- No client-side credential storage
- No silent failures

## Error Handling

- All errors are typed and explainable
- No free-text errors
