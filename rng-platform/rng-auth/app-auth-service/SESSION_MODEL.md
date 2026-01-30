# AuthSession State Machine

## States

- `unknown`
- `unauthenticated`
- `authenticating`
- `authenticated`

## Allowed Transitions

- `unknown → unauthenticated | authenticating | authenticated`
- `unauthenticated → authenticating | unauthenticated`
- `authenticating → authenticated | unauthenticated`
- `authenticated → unauthenticated | authenticated`

## Invalid Transitions

Invalid transitions are **recorded** and **swallowed**, not thrown. This preserves app stability while retaining diagnostics.

## lastTransitionError

`lastTransitionError` exists to surface invalid transitions without crashing the application.

## sessionExpiresAt (Local UX Expiry)

**CRITICAL:** `sessionExpiresAt` is a **local UX session timeout**, not Firebase Auth revocation.

- Set to 24 hours after successful authentication
- Checked in `getSessionSnapshot()` and `requireAuthenticated()`
- When expired, user is logged out **locally** (session clears)
- **Firebase Auth token may still be valid**
- Page reload may re-authenticate immediately if user still has valid Firebase session
- This is intentional: we timeout stale UX sessions, not auth tokens

Use cases:

- Prevent zombie sessions in long-idle browsers
- UX hygiene: force re-entry to security-conscious flows
- Complement (not replace) Firebase token expiry

## lastTransitionError

`lastTransitionError` exists to surface invalid transitions without crashing the application.

## Suspense Safety

State transitions are explicit and stable; consumers can safely suspend on session resolution.
