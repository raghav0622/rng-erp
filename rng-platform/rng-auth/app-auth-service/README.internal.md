# AppAuthService Internal & Maintenance APIs

**Status**: ✅ COMPREHENSIVE RECOVERY TOOLS  
**Last Audited**: January 30, 2026  
**Orphan Prevention**: Enabled (BUG #23 FIX - Rollback on failure)

## Scope

This document covers internal-only methods and maintenance operations that exist for client-side recovery.

## Orphan Prevention (BUG #23 FIX)

The system now includes **automatic rollback** on auth identity linking failures:

**When Soft-Delete Fails**:
1. Newly created disabled user is detected
2. Rollback automatically deletes the disabled user copy
3. Original invite record remains untouched
4. User can retry linking (operation is idempotent)

**Result**: Orphaned disabled users are **prevented**, not just detected and cleaned up later.

## Internal APIs

### Primary Maintenance APIs

#### `listOrphanedLinkedUsers(): Promise<AppUser[]>`

Lists all orphaned linked users (auth users without matching AppUsers).

**When to use**:
- Admin dashboards for system health
- Periodic cleanup jobs
- Forensics after outages

**Returns**: Array of orphaned AppUser records

#### `cleanupOrphanedLinkedUser(userId: string): Promise<void>`

Soft-deletes an orphaned linked user record.

**When to use**:
- After reviewing `listOrphanedLinkedUsers()` output
- Manual cleanup (rare due to BUG #23 rollback prevention)
- Owner-initiated repairs

**Protections**:
- Rate-limited (5 second cooldown between calls)
- Only works on activated/registered users
- Logs owner action for audit trail

### Diagnostic APIs

#### `getLastAuthError(): { error, timestamp } | null`

Returns the most recent auth resolution failure.

**When to use**:
- UI error display (e.g., Firebase timeout during sign in)
- Telemetry/logging
- User support investigations

**Error Types**:
- Firebase Auth errors (network, invalid credentials, etc.)
- Infrastructure errors (Firestore reads timed out)
- Business logic errors (orphan detection, invariant violation)

#### `getLastSessionTransitionError(): { error, timestamp, from, to } | null`

Returns the most recent state machine transition error.

**When to use**:
- Dev tools / debugging
- Detecting session state corruption
- Telemetry for race condition analysis

**What It Detects**:
- Invalid state transitions (e.g., `authenticated → authenticating`)
- Rare concurrency bugs
- Transient race conditions

## Orphaned User Scenarios (Now Prevented)

### Scenario 1: Disabled User Left After Soft-Delete Failure
**Status**: ✅ NOW PREVENTED (BUG #23)  
**Mitigation**: Rollback logic automatically cleans up on failure

### Scenario 2: Auth User Exists Without AppUser
**Status**: ⚠️ Can still occur (network failure between Firebase and Firestore)  
**Detection**: `listOrphanedLinkedUsers()` + `cleanupOrphanedLinkedUser()`  
**Prevention Strategy**: Automatic fallback in future (requires backend support)

### Scenario 3: Duplicate Emails Under Concurrency
**Status**: ⚠️ Can occur (eventual consistency)  
**Detection**: `assertEmailUniqueAndActive()` invariant  
**Recovery**: Owner cleanup or user reattempt with different email

## Recovery Expectations

Owners are responsible for:

1. **Monitoring**: Check `listOrphanedLinkedUsers()` periodically
2. **Investigation**: Review error logs via `getLastAuthError()`
3. **Repair**: Use `cleanupOrphanedLinkedUser()` for rare orphans
4. **Prevention**: Ensure invite expiry (30 days) and re-try logic are in place

These are **first-class recovery tools**, not errors to be hidden. The system design expects operators to use them.

## Operational Guidelines

### Daily
- ✅ Check auth error logs for patterns
- ✅ Monitor rate limiting metrics (30 owner ops/min, 5 password resets/hour)

### Weekly
- ✅ Run `listOrphanedLinkedUsers()` (should be empty or very small)
- ✅ Review session timeout events (should increase gradually over time)

### Monthly
- ✅ Review failed invite activations (expired/revoked invites)
- ✅ Audit owner maintenance API usage

### On Outage
- ✅ Check `getLastAuthError()` for infrastructure failures
- ✅ Check `getLastSessionTransitionError()` for state corruption
- ✅ Re-run orphan cleanup if needed

## Rationale

Client-only systems cannot guarantee atomicity across Auth and Firestore. The design acknowledges this:

1. **Explicit Failures**: Errors are observable and actionable
2. **Preventative**: Rollback logic (BUG #23) prevents many failure modes
3. **Recoverable**: Maintenance APIs enable explicit repair
4. **Operational**: Recovery is transparent and first-class, not hidden

This is better than silent partial failures or impossible-to-debug edge cases.
