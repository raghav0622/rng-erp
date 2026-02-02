# Known Client-Side Limitations

**Purpose**: Explicit documentation of accepted trade-offs in client-side auth architecture.

## Overview

`app-auth-components` is intentionally client-side only. This document enumerates known limitations that are **policy decisions**, not bugs.

## 1. Session Disablement Does NOT Kill Active Sessions

### Limitation

When an owner disables a user, existing sessions remain valid until:

- Next auth resolution (navigation/refresh)
- 24-hour UX timeout
- User manually signs out

### Why

Client-side architecture cannot enforce global session revocation. Firebase Auth does not provide client-accessible session revocation APIs.

### Implications

- Disabled users can continue using the app until their session expires
- Disablement is eventually consistent, not immediate
- Owner must understand this when disabling users

### Mitigations

- Clear UX messaging: "This user will be signed out on their next session"
- 24-hour timeout provides reasonable upper bound
- Server/Firestore rules enforce disablement on data access

### Documentation

**In UI**: "Note: Disabling a user does not immediately terminate their session. They will be signed out when they navigate or after 24 hours."

---

## 2. Non-Atomic Auth Flows

### Limitation

Auth operations (sign up, sign in, role changes) are **not atomic**. Example:

```
1. Create Firebase Auth user  ← Can succeed
2. Create Firestore AppUser   ← Can fail
```

If step 2 fails, step 1 is not rolled back automatically.

### Why

Client-side code cannot use Admin SDK transactions. Firebase Auth and Firestore are separate services with no cross-service atomicity.

### Implications

- Orphaned Firebase Auth users (Auth user exists, no AppUser)
- Orphaned AppUser records (AppUser exists, no Auth user)
- Race conditions on concurrent operations

### Mitigations

- **Owner Bootstrap**: Detects races, cleans up orphaned Auth users
- **Invite Linking**: Rollback protection (soft-deletes on failure)
- **Maintenance APIs**: `listOrphanedLinkedUsers`, `cleanupOrphanedLinkedUser`
- **Invariant Checks**: Service validates consistency during auth resolution

### Documentation

**In UI**: Clear error messages when inconsistencies are detected. Example: "Owner bootstrap race detected: another setup completed first. Orphaned account cleaned up."

---

## 3. Best-Effort Uniqueness

### Limitation

Email uniqueness is best-effort, subject to race conditions.

**Scenario**:

```
User A: Checks if email@example.com exists → No
User B: Checks if email@example.com exists → No
User A: Creates account with email@example.com
User B: Creates account with email@example.com ← Duplicate!
```

### Why

Client-side cannot use distributed locks or compound unique constraints across Firebase Auth + Firestore.

### Implications

- Duplicate emails are possible (but rare)
- System detects and flags duplicates via invariant checks
- Duplicate resolution requires manual intervention

### Mitigations

- **Firestore Index**: Email is indexed for fast duplicate detection
- **Invariant Check**: `assertEmailUniqueAndActive` flags violations
- **Maintenance UI**: Owner can detect and resolve duplicates

### Documentation

**In Code**: `app-user.invariants.ts:assertEmailUniqueAndActive`  
**In UI**: "Multiple accounts detected with this email. Contact support."

---

## 4. No Server-Side Validation

### Limitation

All validation is client-side. Malicious clients can bypass validation.

### Why

No Admin SDK, no server actions (disabled in `next.config.ts`).

### Implications

- Firestore security rules are **authoritative**
- Client validation is UX only, not security
- Malicious actors can craft invalid requests

### Mitigations

- **Firestore Rules**: Enforce all invariants server-side
- **Client Validation**: Prevents honest mistakes, not attacks
- **Audit Logs**: Track rule violations (future)

### Documentation

**In README**: "Guards are UI-only. Backend/Firestore rules remain authoritative."

---

## 5. Rate Limiting Is Client-Local

### Limitation

Rate limiting (password changes, owner operations) is enforced **per-client instance**, not globally.

**Example**: User opens 10 browser tabs, can make 10× the rate limit.

### Why

No server-side coordination. Rate limits stored in-memory in service instance.

### Implications

- Determined attackers can bypass rate limits
- Rate limits are UX guardrails, not security

### Mitigations

- **Firebase Auth**: Has its own rate limiting (e.g., too many password resets)
- **Client Limits**: Prevent accidental abuse
- **Audit Logs**: Detect suspicious patterns (future)

### Documentation

**In UI**: "Password changes are rate limited (3 per minute) to protect your account."

---

## 6. No Cascading Deletes

### Limitation

Deleting a user does **not** delete their related data (e.g., documents they created).

### Why

No ORM, no relationship management. Repository is mechanical CRUD only.

### Implications

- Orphaned data after user deletion
- Manual cleanup required

### Mitigations

- **Soft Deletes**: `deletedAt` flag preserves data
- **Ownership Fields**: All documents track creator
- **Cleanup Jobs**: Manual or batch cleanup (future)

### Documentation

**In UI**: "Deleting a user does not delete their created content. Use soft delete to preserve history."

---

## 7. No Foreign Key Constraints

### Limitation

No referential integrity. User IDs in documents can reference deleted users.

### Why

Firestore is not relational. No foreign key enforcement.

### Implications

- Dangling references possible
- UI must handle missing users gracefully

### Mitigations

- **Defensive Rendering**: `user || 'Unknown'`
- **Soft Deletes**: Preserve user records
- **Data Cleanup**: Manual review (future)

### Documentation

**In Code**: Components handle `null` users gracefully.

---

## 8. Concurrent Session Conflicts

### Limitation

User can be signed in on multiple devices. Each device has independent session state.

**Scenario**:

```
Device A: User is owner
Device B: User is owner
Device A: Owner demotes self to manager (race!)
Device B: Still shows owner UI until next resolution
```

### Why

No real-time session synchronization across devices.

### Implications

- Stale UI states possible
- Role changes require navigation/refresh

### Mitigations

- **Auth Resolution**: Next navigation re-syncs state
- **24h Timeout**: Forces periodic re-sync
- **Clear Messaging**: "Changes take effect on next sign in"

### Documentation

**In UI**: "Role changes take effect when the user signs in again."

---

## Summary Table

| Limitation             | Type                  | Severity | Mitigation                    |
| ---------------------- | --------------------- | -------- | ----------------------------- |
| Session disablement    | Eventually consistent | Medium   | UX messaging + 24h timeout    |
| Non-atomic flows       | Data consistency      | High     | Race detection + cleanup      |
| Best-effort uniqueness | Race condition        | Low      | Invariant checks + manual fix |
| No server validation   | Security              | High     | Firestore rules authoritative |
| Local rate limiting    | Abuse potential       | Low      | Firebase Auth fallback        |
| No cascading deletes   | Data cleanup          | Medium   | Soft deletes + manual cleanup |
| No foreign keys        | Data integrity        | Low      | Defensive rendering           |
| Concurrent sessions    | Stale state           | Low      | Auth resolution on navigation |

## Policy Decision

All limitations above are **accepted trade-offs** for client-side architecture. They are not bugs and will not be "fixed" in v1. Any changes require architectural shift to server-side logic (v2.0.0+).

---

**Status**: Policy document (frozen v1)  
**Last Updated**: January 30, 2026  
**Next Review**: Only if moving to server-side architecture
