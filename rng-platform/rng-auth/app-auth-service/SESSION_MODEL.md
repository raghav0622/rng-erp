# AuthSession State Machine (Frozen v1)

**Status**: ✅ LOCKED (FINAL)  
**Type**: Canonical state machine (not design rationale)

## States

- `unknown`: Initial state, auth resolution in progress
- `unauthenticated`: User not logged in or explicitly logged out
- `authenticating`: Auth operation in progress (sign in, sign up, etc.)
- `authenticated`: User authenticated with valid AppUser projection

## Allowed Transitions

```
unknown
  ├→ unauthenticated (auth failed/not started)
  ├→ authenticating (auth started)
  └→ authenticated (auth succeeded)

unauthenticated
  ├→ unauthenticated (no-op)
  └→ authenticating (user initiates sign in)

authenticating
  ├→ authenticated (auth succeeded)
  └→ unauthenticated (auth failed or user cancelled)

authenticated
  ├→ authenticated (no-op, session refresh)
  └→ unauthenticated (user logs out or session expires)
```

## Invalid Transitions (Guarded)

Invalid transitions are **recorded but not thrown**. This preserves app stability while retaining diagnostics.

**Examples**:

- `authenticated → authenticating` (cannot start auth while authenticated)
- `authenticating → unknown` (cannot revert to unknown)
- `unauthenticated → authenticated` (must go through authenticating)

**Handling**: Recorded in `lastTransitionError` field. Logged but does not crash. UI can recover from transient state corruption.

## lastTransitionError Field

Records and surfaces invalid state transitions without throwing.

**When Populated**:

- Caller attempts invalid state transition
- New session created with lastTransitionError populated
- Old session state preserved
- Next valid transition clears field

## sessionExpiresAt (Local UX Timeout - Not Revocation)

**Policy**: `sessionExpiresAt` is a **local, client-side UX timeout**, not Firebase Auth revocation.

### Mechanism

- **Set**: 24 hours after successful authentication
- **Checked**:
  - Background timer every 5 seconds (proactive logout)
  - `getSessionSnapshot()` on every UI render (defensive check)
  - `requireAuthenticated()` on API guards
- **On Expiry**: Local session clears from client
- **Firebase Token**: May remain valid; user can re-auth on page reload
- **By Design**: Timeout stale UX sessions while allowing background token refresh

### Comparison Table

| Aspect    | sessionExpiresAt | Firebase Token      | isDisabled                 |
| --------- | ---------------- | ------------------- | -------------------------- |
| Authority | AppAuthService   | Firebase SDK        | Firestore                  |
| Scope     | Local UX         | Auth API            | User record                |
| Behavior  | 24-hour timeout  | 1-hour auto-refresh | Checked at auth resolution |

### Design Rationale

Firebase tokens refresh automatically (short-lived). Client-side UX timeout is a separate concern for stale sessions and security-sensitive flows.

## Concurrent Sessions

Multiple concurrent sessions allowed. Each device/browser maintains independent session.

**Example**: User logged in on desktop and mobile simultaneously with independent expiry timers

**No Global Revocation**: Disabling user does not immediately revoke all sessions; takes effect on next auth resolution or 24-hour timeout.

## State Machine Safety

Transitions are guarded and atomic from UI perspective:

- `setSession()` is atomic
- Listeners broadcast to all subscribers atomically
- Deep clones prevent caller mutations
- Invalid transitions recorded but do not crash

Consumers can safely subscribe to state changes.
