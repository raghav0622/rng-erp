# Auth Model (Frozen v1 Policy)

**Status**: ✅ LOCKED (FINAL)  
**Type**: Policy document (not rationale or explanation)  
**Immutability**: These invariants are permanent

## Canonical Authorities

**Firebase Auth**: Identity and email verification source of truth  
**Firestore AppUser**: ERP user projection (role, activation state, registration status)  
**Mutual Consistency**: Validated during every auth resolution via invariant checks

## One-Time AuthUid Linking (Immutable Policy)

**Policy**: Each Firebase Auth user (`authUid`) links exactly once to one AppUser. Links are irreversible.

**Enforcement**: `assertAuthIdentityNotLinked()` + `assertAuthUidNotLinked()` invariants  
**Rollback Protection**: If hard-delete fails during linking, disabled user copy is deleted automatically  
**Consequence**: Prevents identity confusion, privilege escalation, and account takeover scenarios

## Email Verification Authority (Mirrored, Not Authoritative in Firestore)

**Source of Truth**: Firebase Auth (`emailVerified` flag)  
**Firestore Copy**: Synchronized during `_resolveAuthenticatedUser()`  
**Sync Mechanism**: Best-effort with 3-attempt retry; non-fatal if sync fails  
**Guarantee**: Next auth resolution will re-sync email state automatically  
**Invariant**: `assertEmailVerifiedNotUpdatedArbitrarily()` ensures no arbitrary mutations in Firestore

**Design Rationale**: Firestore can lag; Firebase Auth is always authoritative. Eventual consistency is acceptable.

## Disabled User Handling (Instant Multi-Device Logout)

**Policy**: `isDisabled` flag enforced at Firestore layer with instant session revocation
**Session Behavior**: Disabled users are logged out across all devices within 5 seconds
**Auth Resolution**: Explicitly checks for disabled users; rejects session if found  
**Prevention**: Invariant `assertDisabledUserCannotAcceptInvite()` prevents disabled users from activating
**Session Revocation**: Firestore session tracking enables instant multi-device logout

**Implementation**:

- Owner disables user → All Firestore sessions marked `revoked: true`
- Each device validates session every 5 seconds
- Revoked session detected → Immediate logout
- Works across all devices/browsers simultaneously

**Design Rationale**: Firestore-based session tracking provides instant revocation without requiring server-side infrastructure or Admin SDK calls.

## Concurrent Sessions (Multi-Device Support)

**Policy**: Multiple concurrent sessions allowed with instant revocation capability
**Example**: User can be logged in on desktop and mobile simultaneously  
**Session Lifetime**: 24-hour local UX timeout plus 5-second validation checks
**Disablement**: User disabled → All sessions marked revoked → All devices logout within 5 seconds

**Design Rationale**: Firestore session tracking provides multi-device awareness while maintaining client-side architecture simplicity.

## Invariants (Canonical)

These invariants are verified during every auth resolution and operation:

- One-time authUid linking (immutable)
- Auth user ↔ AppUser 1:1 correspondence
- Email verification synced with Firebase source of truth
- Disabled users cannot accept invites
- Invite lifecycle is irreversible (activated, revoked, or expired)
- No duplicate active emails
- Session state transitions are guarded
