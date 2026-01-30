# Invite Flow (Client-Side)

**Status**: ✅ VERIFIED & ROLLBACK-PROTECTED  
**Last Audited**: January 30, 2026  
**Race Mitigation**: Enabled (BUG #23 FIX - Rollback on soft-delete failure)

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
│    b) Soft-delete original invite record    │
│    c) Verify linking succeeded              │
│    [Rollback if soft-delete fails - BUG #23]│
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

- **Auth + Firestore linking**: Non-atomic, now with rollback (BUG #23)
- **Activation after linking**: Non-atomic, protected by invariants
- **Email verification sending**: Non-atomic, but non-fatal (fire-and-forget)

## Partial Failure Points & Mitigation

### Case 1: Auth user created but AppUser not linked
**Happens if**: Network failure after Firebase creation, before linkAuthIdentity  
**Detection**: `listOrphanedLinkedUsers()` finds auth user with no matching AppUser  
**Recovery**: Owner can `cleanupOrphanedLinkedUser()` to soft-delete orphan

### Case 2: AppUser linked but activation fails
**Happens if**: Invariant violation detected during activation  
**Detection**: Explicit error thrown, user sees "Activation failed" message  
**Recovery**: User retries invite, which re-runs linkAuthIdentity (idempotent if already linked)

### Case 3: Invite revoked concurrently with linking
**Happens if**: Owner revokes invite after user starts signup  
**Detection**: Invariant check `assertInviteStatusValid()` detects revoked status  
**Recovery**: Error thrown, user retries (must be re-invited by owner)

### Case 4: Soft-delete fails during linking (BUG #23 FIX)
**Happens if**: Firestore write failure after disabled user created  
**Detection**: Soft-delete result checked, disabled user exists without active record  
**Recovery**: **ROLLBACK** - newly created disabled user is deleted automatically  
**Outcome**: No orphaned disabled copy remains

## Why This Is Acceptable

This system is client-only. Partial failures are expected and are handled via:

1. **Invariant Detection**: Comprehensive checks catch state corruption
2. **Explicit Recovery**: Owner maintenance APIs make recovery transparent
3. **Non-Blocking**: Partial failures don't corrupt system state (thanks to rollback logic)

## Owner Recovery Workflows

### Workflow 1: Clean Up Orphaned Auth Users
```typescript
const orphans = await authService.listOrphanedLinkedUsers();
for (const orphan of orphans) {
  // Inspect and clean up
  await authService.cleanupOrphanedLinkedUser(orphan.id);
}
```

### Workflow 2: Debug Failed Invitations
```typescript
const lastError = authService.getLastAuthError();
if (lastError) {
  // Log for investigation
  console.error('Auth error:', lastError);
}

const transitionError = authService.getLastSessionTransitionError();
if (transitionError) {
  // Session state corruption detected
  console.error('Transition error:', transitionError);
}
```

Owners can identify and clean orphaned users using maintenance APIs. This is a designed, first-class operational workflow (not hidden error handling).
