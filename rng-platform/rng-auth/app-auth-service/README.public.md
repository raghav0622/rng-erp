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

These fields surface different categories of state management issues:

- **`lastTransitionError`**: Recorded when state machine detects invalid transition (e.g., `authenticated → unknown`). This indicates a potential app-level bug (rare). Non-fatal and does not block functionality.
- **`lastAuthError`**: Recorded when auth resolution fails during Firebase listener. This represents a real auth failure (network, invalid credentials, infrastructure error, etc.).

**Usage**: Show `lastAuthError` in user-facing error messages. Use `lastTransitionError` for diagnostics, telemetry, and debugging.

### sessionExpiresAt: Local UX Timeout (Not Auth Revocation)

`sessionExpiresAt` is a **local, client-side session timeout** for UX hygiene. It is **NOT** global session revocation:

- **Set**: 24 hours after successful authentication
- **Checked**: During UI interactions and background timers
- **On Expiry**: Local session clears from client
- **Firebase Token**: May remain valid; user can re-authenticate without server-side changes
- **Design Rationale**: Timeout stale UX sessions while allowing background token refresh

This is intentional: Firebase tokens auto-refresh; we add client-side UX timeout as a separate concern.

## Suspense-Friendly Guarantees

- State is explicit and stable for Suspense usage.
- Invalid transitions do not crash the app; they are recorded.
- Consumers can safely subscribe to state changes.

## Irreversible Operations (By Policy)

Some operations are intentionally irreversible at the client layer (e.g., invite activation). This is a design choice and is enforced as part of the contract.

## Error Semantics

Errors are strongly typed. They convey _what happened_ in client-side auth resolution. They do not imply server-side validation or remediation.
