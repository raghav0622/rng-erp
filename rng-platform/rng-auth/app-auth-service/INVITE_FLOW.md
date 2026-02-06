# Invite Flow (Frozen v1 - Client-Side)

**Status**: ✅ LOCKED (FINAL)  
**Policy**: `signupWithInvite()` is the only canonical acceptance path  
**Recovery**: Explicit, observable via maintenance APIs

## Lifecycle

```
┌─────────────────────────────────────────────┐
│ 1. Owner Creates Invite                     │
│    AppUser with inviteStatus='invited'      │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│ 2. User Calls signupWithInvite()            │
│    (Only canonical invite acceptance path)  │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│ 3. Create Firebase Auth User                │
│    [Can fail: invalid email, weak password] │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│ 4. Link authUid to AppUser (3 steps)        │
│    a) Create disabled copy with authUid     │
│    b) Hard-delete original invite record    │
│    c) Verify linking succeeded              │
│    [Rollback if hard-delete fails]          │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│ 5. Activate Invite                          │
│    Set inviteStatus='activated'             │
│    Set isRegisteredOnERP=true               │
│    Verify invite not expired (30 days)      │
│    [Can fail: invite expired/revoked]       │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│ 6. Authenticated Session Created            │
│    User logged in with 24-hour expiry       │
│    Email verification sent (non-fatal)      │
└─────────────────────────────────────────────┘
```

## Important: No Standalone Accept Step

**Invite acceptance is implicit in `signupWithInvite()` — there is no standalone accept flow.**

The old `acceptInvite()` method has been removed. Use `signupWithInvite()` as the single canonical path for invite-based signup.

## Non-Atomic Sections (Explicit & Mitigated)

All Auth + Firestore transitions are non-atomic. Mitigation strategies:

- **Auth + Firestore linking**: Non-atomic. Rollback prevents orphaned disabled users. Orphan detection available.
- **Activation after linking**: Non-atomic. Protected by invariant checks. Invite expiry prevents stale activation.
- **Email verification**: Non-atomic (fire-and-forget). Non-fatal if fails.

## Partial Failure Points & Mitigation

### Case 1: Auth user created but AppUser not linked

**Happens if**: Network failure after Firebase creation, before linkAuthIdentity  
**Detection**: `listOrphanedLinkedUsers()` finds auth user with no matching AppUser  
**Recovery**: Owner calls `cleanupOrphanedLinkedUser()` to remove it

### Case 2: AppUser linked but activation fails

**Happens if**: Invariant violation detected during activation  
**Detection**: Explicit error thrown, user sees error message  
**Recovery**: User retries invite (idempotent if already linked)

### Case 3: Invite revoked concurrently with linking

**Happens if**: Owner revokes invite after user starts signup  
**Detection**: Invariant check detects revoked status  
**Recovery**: Error thrown; user must be re-invited by owner

### Case 4: Hard-delete fails during linking

**Happens if**: Firestore write failure after disabled user created  
**Detection**: Rollback mechanism checks and deletes disabled copy  
**Recovery**: Automatic rollback prevents orphaned disabled user  
**Outcome**: Operation can be safely retried by user

## Design Rationale

Client-only systems handle partial failures via:

1. **Invariant Detection**: Comprehensive checks catch state corruption
2. **Explicit Recovery**: Owner APIs make recovery transparent and first-class
3. **Automatic Rollback**: Prevents orphaned disabled users
4. **Idempotency**: User can safely retry failed operations

## Owner Recovery Workflows

### Workflow 1: Clean Up Orphaned Auth Users

```typescript
const orphans = await authService.listOrphanedLinkedUsers();
for (const orphan of orphans) {
  await authService.cleanupOrphanedLinkedUser(orphan.id);
}
```

### Workflow 2: Debug Failed Invitations

```typescript
const lastError = authService.getLastAuthError();
// Log error for investigation

const transitionError = authService.getLastSessionTransitionError();
// Check for state machine corruption
```

Owners use maintenance APIs as designed, first-class recovery tools.
