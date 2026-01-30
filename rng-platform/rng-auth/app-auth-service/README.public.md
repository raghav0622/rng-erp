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
- `sessionExpiresAt`: local UX session timeout (24 hours), **NOT** auth revocation

### Error Fields: lastTransitionError vs lastAuthError

**They are different:**

- **`lastTransitionError`**: Fired when state machine detects invalid transition (e.g., `authenticated → unknown`). This is a guard against bugs, not a user error. Non-fatal.
- **`lastAuthError`**: Fired when auth resolution fails during `handleAuthStateChanged()` (Firebase listener). This is a real auth failure (network, invalid user, etc.).

Use `lastAuthError` to show user-facing error messages. Use `lastTransitionError` for diagnostics and debugging.

### sessionExpiresAt: Local UX Expiry vs. Auth Revocation

**Important Distinction:**

- `sessionExpiresAt` is a **local, client-side session timeout** for UX hygiene
- It is **NOT** auth revocation; Firebase Auth token may remain valid
- When expired, the session clears from the client UI
- User may re-authenticate immediately on page reload if Firebase token is still valid
- This is a feature, not a bug: timeout stale UX sessions while allowing background re-auth

Do not confuse with:

- Firebase Auth token expiry (handled by Firebase SDK)
- Server-side session revocation (not applicable in this architecture)
- Account disabling (handled by `isDisabled` flag)

## Suspense-Friendly Guarantees

- State is explicit and stable for Suspense usage.
- Invalid transitions do not crash the app; they are recorded.
- Consumers can safely subscribe to state changes.

## Irreversible Operations (By Policy)

Some operations are intentionally irreversible at the client layer (e.g., invite activation). This is a design choice and is enforced as part of the contract.

## Error Semantics

Errors are strongly typed. They convey _what happened_ in client-side auth resolution. They do not imply server-side validation or remediation.
