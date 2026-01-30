# Client-Side Limitations (Explicit & Accepted)

**Status**: ✅ DOCUMENTED & MITIGATED  
**Last Audited**: January 30, 2026  
**Mitigation Status**: All critical limitations have recovery paths

This module is client-only by policy. The following constraints are intentional and permanent.

## Constraints

- No distributed transactions.
- No atomic Auth + Firestore operations.
- No server-enforced uniqueness.
- Eventual consistency windows.
- No global session revocation.

## Intentional Implementation Patterns

- **Soft-delete + recreate during authUid linking** (BUG #23 FIX: now includes rollback)
- **Temporary disablement during invite activation** (mitigated by invariant checks)
- **Orphaned AppUsers after partial failures** (owner cleanup APIs provided)

## Limitation Breakdown

### 1) Non-Atomic Auth + Firestore

**What can go wrong:** partial updates and orphaned records.  
**Detection:** invariant checks and orphan listing.  
**Recovery:** owner cleanup APIs (`listOrphanedLinkedUsers()`, `cleanupOrphanedLinkedUser()`).  
**Mitigation** (BUG #23): Rollback logic now prevents orphaned disabled users on soft-delete failure.

### 2) No Server-Enforced Uniqueness

**What can go wrong:** duplicate emails under concurrency.  
**Detection:** invariant checks on read/query (`assertEmailUniqueAndActive()`).  
**Recovery:** owner manual cleanup.  
**Rate Limiting**: Password reset rate limited per session/IP (5/hour), not per email.

### 3) Eventual Consistency

**What can go wrong:** temporary mismatches (e.g., emailVerified).  
**Detection:** comparison to Firebase Auth source of truth during auth resolution.  
**Recovery:** next auth resolution resyncs automatically.  
**Sync Mechanism**: `updateEmailVerified()` called during `_resolveAuthenticatedUser()` with retry logic.

### 4) Temporary Disablement During Activation

**What can go wrong:** transient disabled state if flow is interrupted.  
**Detection:** invariant checks at auth resolution (`assertDisabledUserCannotAcceptInvite()`).  
**Recovery:** owner repair or user reattempt after invite is re-sent.  
**Mitigation**: Invite expiry enforced (30 days), preventing stale activation attempts.

### 5) Concurrent Session Management

**What can go wrong:** User disables account but existing sessions remain valid.  
**Detection**: Auth resolution checks disabled status (`BUG #24 FIX`).  
**Recovery**: User will be logged out on next session expiry check (24 hours) or page reload.  
**Note**: This is acceptable for ERP; user can be re-enabled before timeout.

## Performance & Resource Management

✅ **Memory**: Rate limit maps cleaned per operation (no unbounded growth)  
✅ **Timers**: Session expiry timer stops when logged out (resource cleanup, BUG #27 FIX)  
✅ **Listeners**: All auth state listeners cleared in `dispose()`  
✅ **Deep Cloning**: Session snapshots returned as deep clones (prevents caller mutations, BUG #12 FIX)  

## Final Policy Statement

These are ACCEPTED constraints. Client-side recovery via owner maintenance APIs is the designed approach. No backend migration is planned.
