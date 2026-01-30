# AppAuthService Public API (Client-Side)

## Public Surface

The public API is `IAppAuthService` as exported by the platform entry point. Internal/maintenance methods are intentionally excluded from the public type.

## AuthSession Lifecycle

`AuthSession` represents the canonical client-side auth state:

- `state`: `unknown | unauthenticated | authenticating | authenticated`
- `user`: AppUser projection or null
- `emailVerified`: Firebase Auth source of truth
- `lastTransitionError`: invalid transition record (non-fatal)
- `lastAuthError`: most recent auth resolution failure

## Suspense-Friendly Guarantees

- State is explicit and stable for Suspense usage.
- Invalid transitions do not crash the app; they are recorded.
- Consumers can safely subscribe to state changes.

## Irreversible Operations (By Policy)

Some operations are intentionally irreversible at the client layer (e.g., invite activation). This is a design choice and is enforced as part of the contract.

## Error Semantics

Errors are strongly typed. They convey _what happened_ in client-side auth resolution. They do not imply server-side validation or remediation.
