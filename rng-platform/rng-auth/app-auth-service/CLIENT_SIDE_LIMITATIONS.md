# Client-Side Limitations (Frozen v1 - Accepted)

**Status**: ✅ PERMANENT (LOCKED)  
**Policy**: Client-only architecture is final  
**Recovery**: Owner maintenance APIs provided for each limitation

These are ACCEPTED and PERMANENT constraints. They are not temporary workarounds or planned for backend migration.

## Permanent Constraints

- No atomic Auth + Firestore operations
- No distributed transactions
- No server-enforced uniqueness
- Eventual consistency windows (mitigated)

## Limitation Scenarios & Recovery

### 1. Non-Atomic Auth + Firestore Linking

**What can happen**: Firebase Auth user created but Firestore AppUser not linked (network failure)

**Detection**: `listOrphanedLinkedUsers()` identifies orphaned auth users  
**Recovery**: `cleanupOrphanedLinkedUser()` removes orphaned record  
**Rollback**: If hard-delete fails during linking, disabled user is automatically deleted  
**Outcome**: Orphaned disabled users are PREVENTED; orphaned auth users are DETECTABLE and RECOVERABLE

### 2. No Server-Enforced Email Uniqueness

**What can happen**: Duplicate emails created under concurrent signup  
**Detection**: `assertEmailUniqueAndActive()` invariant check  
**Recovery**: Owner manual cleanup or user retry with different email  
**Mitigation**: Rate limiting on password reset (5/hour per session)

### 3. Eventual Consistency Mismatches

**What can happen**: Firestore AppUser temporarily inaccessible or email verification out of sync  
**Detection**: Automatic comparison to Firebase Auth during auth resolution  
**Recovery**: Next auth resolution resyncs automatically (3-attempt retry)  
**Outcome**: Self-healing via subsequent operations

### 4. Disablement During Invite Activation

**What can happen**: Temporary disabled state if invite activation flow interrupted  
**Detection**: Invariant checks at auth resolution  
**Recovery**: Owner repair or user reattempt after invite re-sent  
**Prevention**: Invite expiry enforced (30 days max)

### 5. ~~Concurrent Sessions After Disablement~~ ✅ FIXED

**Status**: ✅ RESOLVED via Firestore session tracking

**Implementation**:

- Sessions tracked in Firestore with 30-second heartbeat
- Session validation checks every 5 seconds for revocation
- Owner disables user → All Firestore sessions marked as revoked
- User's device checks session validity → Detects revocation → Instant logout

**Timeline**: Instant logout across all devices (5-second polling interval)

**Outcome**: Multi-device instant logout now supported

**See**: SessionRepository and validateCurrentSession() in app-auth.service.ts

## Resource Management

✅ **Memory**: Rate limit maps cleaned per operation (no leaks)  
✅ **Timers**: Session expiry timer stops when logged out  
✅ **Listeners**: All Firebase listeners cleared on dispose  
✅ **Snapshots**: Deep clones prevent accidental caller mutations

## Policy Summary

These constraints are **PERMANENT** and **ACCEPTED**. Client-side recovery via owner maintenance APIs is the designed operational model. No backend migration is planned or expected.
