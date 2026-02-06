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

## sessionExpiresAt (Local UX Timeout)

**Policy**: `sessionExpiresAt` is a **local, client-side UX timeout** for stale sessions.

### Mechanism

- **Set**: 24 hours after successful authentication
- **Checked**:
  - Background timer every 5 seconds (proactive logout + session validation)
  - `getSessionSnapshot()` on every UI render (defensive check)
  - `requireAuthenticated()` on API guards
- **On Expiry**: Local session clears from client
- **Firebase Token**: May remain valid; user can re-auth on page reload
- **By Design**: Timeout stale UX sessions while allowing background token refresh

### Session Validation (Multi-Device Instant Logout)

**Implementation**: Firestore-based session tracking enables instant multi-device logout

- **Session Tracking**: Each session stored in Firestore `sessions` collection
- **Heartbeat**: 30-second interval updates `lastSeenAt` timestamp
- **Validation**: Every 5 seconds checks if session has been revoked
- **Revocation**: Owner disables user → All sessions marked `revoked: true`
- **Detection**: Client detects revocation within 5 seconds → Forces immediate logout
- **Multi-Device**: Works across all devices/browsers simultaneously

### Comparison Table

| Aspect    | sessionExpiresAt | Firebase Token      | isDisabled                 | Session Revoked           |
| --------- | ---------------- | ------------------- | -------------------------- | ------------------------- |
| Authority | AppAuthService   | Firebase SDK        | Firestore                  | Firestore sessions        |
| Scope     | Local UX         | Auth API            | User record                | Multi-device              |
| Behavior  | 24-hour timeout  | 1-hour auto-refresh | Checked at auth resolution | 5-second validation check |

### Design Rationale

Firebase tokens refresh automatically (short-lived). Client-side UX timeout is a separate concern for stale sessions and security-sensitive flows. Firestore session tracking adds instant revocation capability without requiring server-side infrastructure.

## Concurrent Sessions

Multiple concurrent sessions allowed. Each device/browser maintains independent session.

**Example**: User logged in on desktop and mobile simultaneously with independent expiry timers

**Session Revocation**: Disabling a user marks all Firestore sessions as revoked. Each device detects revocation within 5 seconds and forces immediate logout (instant multi-device logout).

## State Machine Safety

Transitions are guarded and atomic from UI perspective:

- `setSession()` is atomic
- Listeners broadcast to all subscribers atomically
- Deep clones prevent caller mutations
- Invalid transitions recorded but do not crash

Consumers can safely subscribe to state changes.
