# Client-Side Limitations (Frozen v1)

**Status**: ✅ LOCKED (FINAL)  
**Purpose**: Explicitly document architectural constraints  
**Scope**: Design decisions, not temporary shortcuts

## Core Design: Client-Side Only

This hooks layer is intentionally **client-side only**.

No Admin SDK. No server-side enforcement. No backend APIs.

This is **deliberate policy**, not a technical limitation awaiting future resolution.

## Critical Limitations

### 1. Role-Based Access Control (RBAC) Enforced Client-Side

**What it means**:

- Authorization checks happen inside `appAuthService` (client)
- Firebase security rules are the only server enforcement
- UI can call any hook; service decides what's allowed

**Consequence**:

- Malicious frontend code could bypass JavaScript checks
- However: Firebase rules still enforce all mutations
- Data cannot be modified server-side without proper auth

**Example**:

```tsx
const deleteUser = useDeleteUser();
deleteUser.mutate(userId); // ← Client-side app-auth-service checks owner role
// If user is not owner, throws NotAuthorizedError
// Firebase rules validate again server-side

// If bad actor patches JavaScript:
deleteUser.mutate(anybodyId); // ← Still blocked by Firebase rules
```

**Why this is acceptable**:

- Private ERP (internal use only, trusted users)
- Security model assumes "inside firewall" deployment
- Firebase rules are the ground truth
- UI checks reduce latency and improve UX

### 2. No Admin SDK

**What it means**:

- No backend processes running with elevated privileges
- No server-side user provisioning
- All user operations go through client-side app-auth-service

**Consequence**:

- Cannot bypass Firebase Auth constraints
- Cannot perform operations forbidden to regular users
- Signup, invite, user management all require client UI interaction

**Examples**:

- Cannot directly set `isDisabled: true` on all users at once
- Cannot create users without going through signup flow
- Cannot bypass email verification

**Why this is acceptable**:

- Private ERP (manual admin operations acceptable)
- Single owner bootstraps the system
- Other admins invite users through UI
- No high-volume provisioning needed

### 3. No Atomic Cross-Service Transactions

**What it means**:

- Firebase Auth and Firestore are separate systems
- Mutations can fail independently
- No transactional guarantee across both

**Example failure scenario**:

```
1. Firebase Auth account created successfully
2. Network fails
3. Firestore AppUser creation fails
4. Result: Auth account exists, but no AppUser projection
```

**Consequence**:

- Orphaned Firebase Auth users can occur
- Orphaned AppUsers can occur
- Must be cleaned up manually via `useCleanupOrphanedLinkedUser()`

**Why this is acceptable**:

- Private ERP (small scale, manual cleanup sufficient)
- Invariants are checked on every auth resolution
- Owner has maintenance APIs to detect/fix orphans
- Logs record all failures for audit trail

**See**: [app-auth-service/README.md](../app-auth-service/README.md) for orphan cleanup details

### 4. Invite Flow Non-Atomicity

**What it means**:

- Inviting a user creates an AppUser with `inviteStatus: "invited"`
- User acceptance happens later (might never happen)
- No atomic transaction "user invited, user accepted"

**Example**:

```
Owner invites alice@example.com (AppUser created)
  ↓
Network fails
  ↓
Alice never sees invitation
  ↓
AppUser stays in "invited" forever (orphaned)
```

**Consequence**:

- Must implement invite expiry checks (if desired)
- Must implement manual invite resend (`useResendInvite()`)
- Must implement invite revocation (`useRevokeInvite()`)
- Invites are advisory, not guaranteed delivery

**Why this is acceptable**:

- Private ERP (email notifications happen outside this system)
- Owner can resend or revoke invites
- Invited state doesn't block anything
- Expected small user counts (manual follow-up acceptable)

### 5. Email Uniqueness Enforced Client-Side

**What it means**:

- Client checks if email exists before signup
- Firebase Auth also prevents duplicate emails
- Firestore uniqueness is best-effort via app-auth-service

**Consequence**:

- Race condition possible: Two users signup with same email simultaneously
- One succeeds, one gets `EmailAlreadyInUseError`
- No application-level distributed lock

**Example**:

```
Tab 1: User signs up as alice@example.com
Tab 2: Same user signs up as alice@example.com (same browser, race)
  ↓
Tab 1: Success (Firebase Auth + Firestore)
Tab 2: EmailAlreadyInUseError (Firebase Auth prevents duplicate)
```

**Why this is acceptable**:

- Private ERP (single user, single device assumption)
- No high-concurrency signup load
- Firebase Auth is the ground truth
- Race unlikely in practice

**See**: [app-auth-service/app-user.invariants.ts](../app-auth-service/internal-app-user-service/app-user.invariants.ts) for email checks

### 6. ~~Disabled Users Retain Sessions~~ ✅ FIXED

**Status**: ✅ RESOLVED via Firestore session tracking

**What was fixed**:

- Previously: Sessions remained active for up to 24 hours after disablement
- Now: Instant multi-device logout via Firestore session tracking

**How it works**:

```
Owner disables alice@example.com
  ↓
Firestore sessions collection updated (all sessions marked revoked)
  ↓
Alice's browser checks session validity (every 5 seconds)
  ↓
Session revocation detected → Instant logout
  ↓
All devices logged out within 5 seconds
```

**Implementation**:

- Sessions stored in Firestore with userId, expiresAt, revoked flag
- 30-second heartbeat keeps sessions alive
- Background validation every 5 seconds checks for revocation
- Owner disables user → API marks all sessions as revoked
- Client detects revocation → Forces immediate logout

**See**:

- [session.repository.ts](../app-auth-service/session.repository.ts) - Session CRUD operations
- [session-tracking.types.ts](../app-auth-service/session-tracking.types.ts) - UserSession interface
- `/api/auth/revoke-user-sessions` - Server endpoint for session revocation

### 7. No Multi-Tab Support

**What it means**:

- Each browser tab maintains separate session state
- Signing out in tab 1 does not sign out tab 2
- No cross-tab communication

**Consequence**:

- User can be logged in on multiple tabs simultaneously
- Tab 1 and Tab 2 might see different auth states
- No shared session cookie across tabs

**Example**:

```
Tab 1: User logs in
  ↓
Tab 2: User still logged out (separate state)
  ↓
Refreshing Tab 2: Triggers new auth check, might log in again
```

**Why this is acceptable**:

- Private ERP (single user, single device typical)
- Not a common use case (users don't use multiple tabs)
- Firebase Auth persistence is per-tab
- Would require IndexedDB/MessageChannel (added complexity)

### 8. No Server-Side User Provisioning

**What it means**:

- Cannot provision users via API/backend
- All user creation is interactive (owner invites, user signs up)
- No bulk import, no automation

**Consequence**:

- Scaling limited (manual invite only)
- No pre-loaded user lists
- No integration with external HR systems

**Why this is acceptable**:

- Private ERP, internal use (small team)
- Manual user management is fine
- Avoid external system dependencies
- Keep it simple and auditable

## Design Rationale

### Why Client-Side RBAC is Okay Here

| Factor           | Impact                                      |
| ---------------- | ------------------------------------------- |
| **Threat model** | Trusted internal users, not public internet |
| **Scale**        | Single owner, <100 employees typical        |
| **Audit**        | All operations logged client-side           |
| **Recovery**     | Manual maintenance APIs available           |
| **Enforcement**  | Firebase rules are ground truth             |

### Why These Trade-Offs Work

1. **Single-owner bootstrap**: One person sets up the system
2. **Manual user management**: Owner invites new users
3. **Internal deployment**: Behind company firewall
4. **Small scale**: Typical team of <100 people
5. **Trust**: Users are internal employees
6. **Auditability**: All changes logged

### Why NOT to Add Server-Side Code

Adding server enforcement would require:

- Backend Node.js/Python service
- Admin SDK integration
- Cross-service transaction logic
- Deployment complexity
- Ongoing maintenance burden
- Higher operational cost

**Result**: Frozen client-side model is a deliberate choice, not a gap.

## What's NOT Supported

❌ **No cross-tab sync**: Each tab is independent  
❌ **No external provisioning**: No API to create users programmatically  
❌ **No distributed locks**: Email uniqueness not atomic  
❌ **No Admin SDK**: No elevated backend privileges  
❌ **No server transactions**: Auth and Firestore mutate independently

## What IS Supported

✅ **Client-side RBAC enforcement**: Service layer checks permissions  
✅ **Firebase rule validation**: Backend validates all mutations  
✅ **Orphan detection and cleanup**: Maintenance APIs available  
✅ **Audit trails**: All actions logged  
✅ **Manual recovery**: Owner can fix inconsistencies  
✅ **Single-tenant deployment**: Entire app runs on one user's device
✅ **Instant multi-device logout**: Firestore session tracking with 5-second validation

## Maintenance & Recovery

### Orphaned Users

If Firebase Auth user exists but no AppUser projection:

```tsx
const orphans = await useListOrphanedUsers();
orphans.forEach((orphan) => {
  await useCleanupOrphanedLinkedUser(orphan.id);
});
```

### Instant Logout for Disabled Users

When owner disables a user, all their sessions are automatically revoked:

```tsx
// Owner disables user → All Firestore sessions marked as revoked
// Each device checks session validity every 5 seconds
// Disabled user logged out across all devices within 5 seconds
// No manual intervention required
```

### Email Conflicts

If duplicate emails exist:

```tsx
const users = await useSearchUsers({ email: 'alice@example.com' });
// Manually decide which to keep
await useDeleteUser(duplicateId); // Delete one
```

## Statement

🔒 **These are design decisions, not temporary shortcuts.**

This system is intentionally built for:

- **Single owner**
- **Internal team**
- **Manual administration**
- **Small scale**
- **High trust**

It is **NOT** designed for:

- Public multi-tenant SaaS
- Thousands of concurrent users
- Automated provisioning
- Complex enterprise workflows
- Untrusted external users

If requirements change to any of the above, a v2.0 with server-side components would be needed.

## Further Reading

- [README.md](./README.md) — Overview and rules
- [AUTH_HOOKS_MODEL.md](./AUTH_HOOKS_MODEL.md) — Hook mental model
- [app-auth-service/README.md](../app-auth-service/README.md) — Service layer guarantees
- [app-auth-service/AUTH_MODEL.md](../app-auth-service/AUTH_MODEL.md) — Auth policy and invariants
