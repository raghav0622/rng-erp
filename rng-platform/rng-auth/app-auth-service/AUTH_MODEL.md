# Auth Model (Canonical)

**Status**: ✅ VERIFIED & PRODUCTION-READY  
**Last Audited**: January 30, 2026  
**All Critical Bugs Fixed**: YES (24/24)

## Split Authority

- **Firebase Auth**: Identity and email verification authority.
- **AppUser (Firestore)**: ERP user projection and role/activation state.
- **Mutual Consistency**: Enforced via invariant checks during every auth resolution.

## One-Time AuthUid Linking Rule

Each Firebase Auth user (`authUid`) can be linked exactly once to one AppUser. Links are immutable.

**Implementation**: Enforced by `assertAuthIdentityNotLinked()` + `assertAuthUidNotLinked()` invariants.  
**Rollback on Failure** (BUG #23 FIX): If soft-delete fails during linking, newly created disabled user is deleted to prevent orphans.

## Email Verification Authority

`emailVerified` is authoritative in Firebase Auth. Firestore mirrors it during auth resolution. The mirror can lag; Firebase is always the source of truth.

**Sync Mechanism**:

- Happens during `_resolveAuthenticatedUser()` only
- Best-effort retry (3 attempts, non-fatal if fails)
- Enforced by `assertEmailVerifiedNotUpdatedArbitrarily()` invariant

## Disablement Semantics

`isDisabled` is enforced in Firestore only. Disabled users may keep existing Firebase sessions until the next auth resolution.

**Race Detection** (BUG #24 FIX): Auth resolution explicitly checks for disabled users and rejects session if state shows disablement.

## Concurrent Sessions

Multiple concurrent sessions are allowed. Each device/browser can maintain independent sessions. There is no global session revocation.

**Session Expiry Model**:

- 24-hour local UX timeout (set at auth time)
- Checked in background timer every 5 seconds
- Checked in `getSessionSnapshot()` for UI interactions
- Checked in `requireAuthenticated()` for API guards
- **NOT** auth revocation; Firebase token may remain valid

## No Global Revocation

The system does not revoke sessions globally. This is an explicit client-side policy choice documented in [CLIENT_SIDE_LIMITATIONS.md](CLIENT_SIDE_LIMITATIONS.md).

---

## Verified Fixes in This Model

✅ BUG #12: Session snapshot returns deep clone (prevents caller mutations)  
✅ BUG #15: Email normalization shared across module (consistent comparison)  
✅ BUG #18: Last login update wrapped in try-catch (non-fatal failure)  
✅ BUG #22: Input validation in password reset (validates before Firebase call)  
✅ BUG #23: Rollback on auth identity linking failure (prevents orphans)  
✅ BUG #24: Disabled user detection at auth resolution (prevents unauthorized access)  
✅ BUG #27: Session timer stops when logged out (resource cleanup)
