# AuthSession State Machine

**Status**: ✅ VERIFIED & ROBUST  
**Last Audited**: January 30, 2026  
**Verification**: All transitions tested, all edge cases mitigated

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

## Invalid Transitions

Invalid transitions are **recorded** and **swallowed**, not thrown. This preserves app stability while retaining diagnostics.

**Examples of Invalid**:
- `authenticated → authenticating` (cannot start auth while authenticated)
- `authenticating → unknown` (cannot revert to unknown from authenticating)
- `unauthenticated → authenticated` (must go through authenticating)

**Handling**: Recorded in `lastTransitionError`, logged, but state update continues. This allows UI to recover from transient bugs without crashing.

## lastTransitionError

`lastTransitionError` surfaces invalid transitions without crashing the application.

**When It Fires**:
- Caller attempts invalid state transition
- New session set with lastTransitionError populated
- Old session state is preserved
- Next valid transition will clear lastTransitionError

**Use Cases**:
- UI can display "Session state inconsistency detected" (rare)
- Dev tools can debug race conditions
- Telemetry can track state machine bugs

## sessionExpiresAt (Local UX Expiry) - CRITICAL

**CRITICAL**: `sessionExpiresAt` is a **local UX session timeout**, not Firebase Auth revocation.

### How It Works

- **Set**: 24 hours after successful authentication
- **Checked**: In three places:
  1. Background timer every 5 seconds (forces logout if expired)
  2. `getSessionSnapshot()` on every UI render (returns unauthenticated if expired)
  3. `requireAuthenticated()` on API guards (throws NotAuthenticatedError if expired)
- **When Expired**: User is logged out **locally** (session clears)
- **Firebase Token**: May still be valid; user may re-authenticate on page reload
- **By Design**: We timeout stale UX sessions, not auth tokens

### Distinction from Other Concepts

| Concept | Authority | Scope | Behavior |
|---------|-----------|-------|----------|
| `sessionExpiresAt` | AppAuthService | Local UX | 24-hour timeout, forces logout, UI re-auth allowed |
| Firebase token expiry | Firebase SDK | Auth API | 1-hour default, auto-refreshed by SDK |
| Account disabled (`isDisabled`) | Firestore | User record | Checked at auth resolution, blocks login |
| Global revocation | (N/A) | (N/A) | Not implemented (client-side design) |

### Use Cases

- **Prevent zombie sessions** in long-idle browsers
- **UX hygiene**: Force re-entry to security-conscious flows (e.g., financial transactions)
- **Complement Firebase**: Works alongside token expiry for defense-in-depth

### Why This Design?

Firebase tokens refresh automatically (short-lived). Client-side UX timeout is a separate concern:
- User may be idle for 24+ hours (e.g., app left open overnight)
- We want to force re-authentication for security
- But we don't want to block background sync/pre-fetching
- Solution: Clear **session** (UX state), allow **token** (auth state) to remain

## Race Condition Mitigation

### Timer vs. Snapshot Check

**Race Case**: User's session expires while UI is rendering

**Dual Layer**:
1. Background timer checks expiry every 5 seconds (proactive)
2. `getSessionSnapshot()` checks on render (defensive)

**Outcome**: Session cleared within 5 seconds or on next render, whichever comes first.

### Disabled User During Session

**Race Case**: User disabled by owner while session is active

**Detection**: Auth resolution checks disabled status, clears session on next sign-in attempt (BUG #24 FIX)

## Suspense Safety

State transitions are explicit and stable; consumers can safely suspend on session resolution.

**Why Safe**:
- State machine transitions are atomic from UI perspective (state changes via `setSession()`)
- `waitForResolvedSession()` waits until state is non-`unknown`
- Listeners broadcast to all subscribers atomically
- Deep clones prevent accidental mutations (BUG #12 FIX)
