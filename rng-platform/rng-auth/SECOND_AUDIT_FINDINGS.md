# rng-auth Module: Second Comprehensive Audit (January 29, 2026)

**Status**: New audit findings identified and categorized  
**Date**: January 29, 2026  
**Scope**: Full rng-auth module (app-auth-service, internal-app-user-service, hooks)

---

## Executive Summary

This second audit identifies **10 NEW issues** beyond the previous audit, spanning:

- **4 Critical Bugs** (high severity, production risk)
- **3 UX/DX Improvements** (developer/user experience)
- **2 Technical Debt** (maintainability risk)
- **1 Missing Edge Case** (incomplete coverage)

All issues are documented with severity, impact analysis, and recommended resolutions.

---

## Issues Found

### **CRITICAL BUGS**

#### **Issue #9: Race Condition in signupWithInvite — User Account Left Enabled During Error Path**

**Category**: Security Bug  
**Severity**: CRITICAL  
**Location**: [app-auth.service.ts](app-auth-service/app-auth.service.ts#L920-L960)

**Problem**:
In `signupWithInvite()`, there's a dangerous window between linking auth identity and disabling the user:

```typescript
// Step 4: Link authUid to AppUser
await this.appUserService.linkAuthIdentity(freshUser.id, cred.user.uid);
// ... here, user is ENABLED
await this.appUserService.updateUserStatus(cred.user.uid, { isDisabled: true });
```

If `linkAuthIdentity()` succeeds but `updateUserStatus()` to disable fails, OR if the app crashes:

- Firebase Auth user IS created and linked
- AppUser IS linked to authUid
- **User remains ENABLED and can immediately sign in**
- Post-crash, user has valid session but is in invalid state (linked, enabled, but not activated)

This violates the invariant: "Linked users must be disabled until activated"

**Impact**:

- Users can sign in before completing invite activation
- Users access ERP with incomplete onboarding state
- UI assumes `isRegisteredOnERP === false` means not activated, but user may be authenticated

**Recommended Fix**:
Atomic operation: use Firestore transaction to link + disable in single transaction before returning control. If transaction fails, rollback is automatic.

---

#### **Issue #10: No Validation of inviteSentAt After Restoration**

**Category**: Data Integrity Bug  
**Severity**: HIGH  
**Location**: [app-user.service.ts](app-auth-service/internal-app-user-service/app-user.service.ts#L88-L130)

**Problem**:
In `restoreUser()`, the code validates `inviteSentAt` for invited users but doesn't update timestamps:

```typescript
if (user!.inviteStatus === 'invited') {
  if (!user!.inviteSentAt) {
    throw new AppUserInvariantViolation(...);
  }
}
// BUG: inviteSentAt is OLD (from original invite)
// No way to resend invite with NEW timestamp
```

After restoration:

- `inviteSentAt` still references the old invite date (days/months ago)
- Email verification links may be stale
- UI shows old "invited 100 days ago" timestamp

**Impact**:

- Email links appear stale (UX confusion)
- Audit trail loses precision (can't tell when re-invited)
- No way to distinguish original invite from re-invitation

**Recommended Fix**:
Add optional `updateInviteSentAt` parameter to `restoreUser()`. If true, reset `inviteSentAt` to now and clear `inviteRespondedAt` for consistency.

---

#### **Issue #11: Orphaned User Cleanup Missing Phone Home Logic**

**Category**: Operational Bug  
**Severity**: HIGH  
**Location**: [app-auth.service.ts](app-auth-service/app-auth.service.ts#L1050-L1070)

**Problem**:
The `cleanupOrphanedLinkedUser()` method is exposed but only for manual operator action:

```typescript
async cleanupOrphanedLinkedUser(userId: string): Promise<void> {
  // Soft delete + hard delete
  // No notification to owner
  // No logging of reason
  // No recovery path for user
}
```

If called accidentally or for wrong user:

- User is permanently deleted
- Firebase Auth user orphaned (not cleaned up)
- Owner has no audit trail of why user was deleted

**Impact**:

- Manual cleanup is error-prone (no confirmation, no dry-run)
- Firebase Auth users accumulate orphans (not cleaned)
- No recovery if operator deletes wrong user

**Recommended Fix**:

1. Require confirmation parameter or add `--force` flag
2. Add to cleanup operation: delete Firebase Auth user too (via admin SDK)
3. Log structured audit entry: who deleted, when, reason
4. Consider restricting to owner + automatic detection

---

#### **Issue #12: Session Transition Errors Silently Swallowed; No Error Recovery UX**

**Category**: Developer Experience Bug  
**Severity**: MEDIUM  
**Location**: [app-auth.service.ts](app-auth-service/app-auth.service.ts#L617-L640)

**Problem**:
When `validateSessionTransition()` detects an invalid state machine transition, the error is recorded but NOT exposed to the UI:

```typescript
} catch (err) {
  // Record the transition error but continue—do not throw.
  // This allows the system to recover gracefully.
  globalLogger.error('[AppAuthService] Invalid session transition detected', {...});
  session.lastTransitionError = {
    error: err,
    from: this.session.state,
    to: session.state,
  };
  // NO UI FEEDBACK — how does the developer know this happened?
}
```

The error is recorded in `lastTransitionError` but:

- UI code must explicitly call `getLastSessionTransitionError()` (undiscoverable)
- Default behavior is silent failure + weird UI state
- No clear signal that state machine is corrupted

**Impact**:

- Bugs in state machine logic are invisible (silent failures)
- UI appears stuck or unresponsive without clear reason
- Developers debug session issues blindly

**Recommended Fix**:

1. Emit event to listeners: `onSessionTransitionError(error, from, to)`
2. Add explicit UI hook for error boundary to catch and display
3. Consider warning log level (currently only error level)
4. Document in contracts that state machine errors are possible

---

### **UX/DX IMPROVEMENTS**

#### **Issue #13: No Explicit "Why Am I Unauthenticated?" Error Feedback**

**Category**: UX Improvement  
**Severity**: MEDIUM  
**Location**: [app-auth.service.ts](app-auth-service/app-auth.service.ts#L515-L535)

**Problem**:
When `handleAuthStateChanged` encounters an error, the user is signed out but gets NO feedback on why:

```typescript
} catch (err) {
  // ... logging only
  await firebaseSignOut(this.auth);
  this.setSession({
    state: 'unauthenticated',
    user: null,
    emailVerified: null,
    lastTransitionError: null,
  });
}
```

User sees:

- "Logged out" (but didn't log out)
- No indication if it's their account disabled, email not verified, etc.
- No path to recover

**Impact**:

- User confusion (why was I logged out?)
- Support requests (unclear error messages)
- No recovery path communicated to user

**Recommended Fix**:

1. Classify errors into categories:
   - `UserDisabledError` → "Your account was disabled. Contact support."
   - `EmailNotVerified` → "Please verify your email."
   - `InviteRevoked` → "Your invitation was revoked. Contact support."
   - `NetworkError` → "Connection lost. Retrying..."
2. Expose error reason in session: `AuthSession.lastAuthError`
3. UI can display appropriate message

---

#### **Issue #14: No Async Validation Hook for onAuthStateChanged — Race Condition in Listener**

**Category**: DX Improvement / Bug  
**Severity**: MEDIUM  
**Location**: [app-auth.service.ts](app-auth-service/app-auth.service.ts#L715-L730)

**Problem**:
The `onAuthStateChanged()` listener is synchronous-only:

```typescript
onAuthStateChanged(callback: (session: AuthSession) => void): UnsubscribeFn {
  this.listeners.add(callback);
  callback({ ...this.session });
  return () => {
    this.listeners.delete(callback);
  };
}
```

If a listener needs to perform async work (e.g., fetch user data):

```typescript
appAuthService.onAuthStateChanged(async (session) => {
  if (session.state === 'authenticated') {
    // This async work is NOT awaited by service
    const userData = await fetchUserData(session.user.id);
  }
});
```

The service has no way to know if listeners completed successfully, creating:

- Unhandled promise rejections
- Silent failures in listeners
- No error reporting mechanism

**Impact**:

- Listeners can't perform async operations safely
- Errors in listeners are silent
- No way to compose multiple async listeners

**Recommended Fix**:
Add async-aware listener option:

```typescript
onAuthStateChanged(
  callback: (session: AuthSession) => Promise<void> | void,
  options?: { async?: boolean }
): UnsubscribeFn
```

---

#### **Issue #15: signupWithInvite Doesn't Trigger Email Verification—User Must Manually Verify**

**Category**: UX Improvement  
**Severity**: LOW  
**Location**: [app-auth.service.ts](app-auth-service/app-auth.service.ts#L900-L950)

**Problem**:
After `signupWithInvite()` completes, the user's email is NOT automatically verified:

```typescript
// Step 5: Activate invite
await this.appUserService.activateInvitedUser(cred.user.uid);
// BUG: No sendEmailVerification() call
// User is stuck with emailVerified === false
```

User must:

1. Complete signup
2. Then manually call `sendEmailVerificationEmail()`
3. Then click email link
4. Then wait for next auth state change to sync

**Impact**:

- Extra friction in onboarding (verify email after signup)
- Users confused about why email verification is needed
- Could be automatic at signup time

**Recommended Fix**:
After `activateInvitedUser()` succeeds, automatically call `sendEmailVerification()` to send link. Document this behavior clearly.

---

### **TECHNICAL DEBT**

#### **Issue #16: validateSessionTransition Hardcoded Rules—No Event Emitter for State Changes**

**Category**: Technical Debt  
**Severity**: MEDIUM  
**Location**: [app-auth.service.ts](app-auth-service/app-auth.service.ts#L559-L580)

**Problem**:
State machine transitions are validated but there's no event system:

```typescript
private validateSessionTransition(prev: AuthSession, next: AuthSession): void {
  // Hardcoded rules
  const allowedTransitions: Record<AuthSession['state'], Set<AuthSession['state']>> = {
    unknown: new Set(['unknown', 'unauthenticated', 'authenticating', 'authenticated']),
    unauthenticated: new Set(['unauthenticated', 'authenticating']),
    authenticating: new Set(['authenticated', 'unauthenticated']),
    authenticated: new Set(['authenticated', 'unauthenticated']),
  };
  // ...
}
```

If app wants to monitor state transitions:

- No event hooks
- Must manually track `lastSessionTransitionError`
- Hard to build analytics or state history

**Impact**:

- Analytics can't track state machine behavior
- No way to record failed transitions for debugging
- Tight coupling if state machine changes

**Recommended Fix**:
Create event emitter for state transitions:

```typescript
private emitStateTransition(from: AuthSessionState, to: AuthSessionState, success: boolean, error?: unknown) {
  // Emit for analytics, logging, testing
}
```

---

#### **Issue #17: Email Normalization Not Applied Consistently in All Paths**

**Category**: Technical Debt  
**Severity**: MEDIUM  
**Location**: Multiple files

**Problem**:
Email is normalized to lowercase in some paths but not others:

- ✅ `signIn()` — normalizes
- ✅ `ownerSignUp()` — normalizes
- ✅ `signupWithInvite()` — normalizes
- ❌ `getUserByEmail()` — **NO normalization** (caller must normalize)
- ❌ `getUserByRole()` and other search paths — **inconsistent**

**Impact**:

- "User not found" for uppercase emails (UX bug)
- Duplicate users if uppercase/lowercase emails queried separately
- Caller confusion (some paths normalize, others don't)

**Recommended Fix**:

1. Create internal method `ensureEmailNormalized()` for all search/query paths
2. Add contract comment: "All email parameters are normalized internally"
3. Validate in unit tests that email case-insensitivity is maintained

---

### **MISSING USE CASES / EDGE CASES**

#### **Issue #18: No "Check If Owner Exists" UI-Safe Method**

**Category**: Missing Use Case / API Improvement  
**Severity**: MEDIUM  
**Location**: [app-auth.contracts.ts](app-auth-service/app-auth.contracts.ts#L1-L50)

**Problem**:
`isOwnerBootstrapped()` exists but it's an async operation that reveals whether owner exists (potential info leak for multi-tenant systems).

No way to check if signup should show "invite code" vs "owner setup" form without async call.

Use case: A login form needs to know at page load time whether this is:

- Owner bootstrap screen (no owner yet)
- Invite signup screen (owner exists)

Current solution requires: `await appAuthService.isOwnerBootstrapped()` in effect/hook with loading state.

**Impact**:

- UI must make async call on page load (slower)
- Potential info leak (adversary can enumerate if owner exists)
- No cached value for repeated checks

**Recommended Fix**:

1. Add synchronous getter: `isOwnerBootstrappedCached(): boolean | undefined`
2. Populate during app initialization
3. Document that this is cached and may be stale (require refresh if needed)

---

#### **Issue #19: No Rate Limiting on Invite Resend — Spam Vector**

**Category**: Security/UX Improvement  
**Severity**: MEDIUM  
**Location**: [app-auth.service.ts](app-auth-service/app-auth.service.ts#L1165-L1175)

**Problem**:
`resendInvite()` has no rate limiting:

```typescript
async resendInvite(userId: string): Promise<AppUser> {
  // BUG: No check on inviteSentAt frequency
  // Owner can spam invite emails indefinitely
  return await this.appUserService.resendInvite({ userId });
}
```

Owner can:

- Spam invite emails to same user (DoS)
- Modify `inviteSentAt` timestamps without limit
- Create audit trail noise

**Impact**:

- Invited users receive multiple emails (confusion, spam)
- Audit trail loses precision (many resends)
- No defense against accidental owner mistakes

**Recommended Fix**:

1. Add rate limit check: "Don't resend if already sent in last 24 hours"
2. Log structured audit entry with resend reason
3. Require owner confirmation for forced immediate resend

---

## Recommendations by Priority

### **Phase 1: Critical Fixes (Production Risk)**

1. **Issue #9**: Fix race condition in `signupWithInvite` (use Firestore transaction)
2. **Issue #11**: Add Firebase Auth cleanup + audit logging to `cleanupOrphanedLinkedUser()`
3. **Issue #12**: Emit session transition errors to UI event stream

### **Phase 2: High Priority (UX/Data Integrity)**

4. **Issue #10**: Add timestamp update option to `restoreUser()`
5. **Issue #13**: Classify auth errors and expose in session
6. **Issue #14**: Add async listener support

### **Phase 3: Medium Priority (Maintainability)**

7. **Issue #15**: Auto-trigger email verification in `signupWithInvite()`
8. **Issue #16**: Create state transition event emitter
9. **Issue #17**: Apply email normalization consistently
10. **Issue #18**: Add cached owner bootstrap check
11. **Issue #19**: Add rate limit to resend invite

### **Phase 4: Low Priority (Enhancement)**

12. Document frozen design decisions (already mostly done)
13. Add comprehensive integration tests for state machine
14. Add performance monitoring for auth operations

---

## Summary Table

| Issue | Category                          | Severity | Status      | Effort |
| ----- | --------------------------------- | -------- | ----------- | ------ |
| #9    | Race condition in signup          | CRITICAL | Not Started | High   |
| #10   | No inviteSentAt update on restore | HIGH     | Not Started | Medium |
| #11   | Orphan cleanup missing cleanup    | HIGH     | Not Started | Medium |
| #12   | Transition errors swallowed       | MEDIUM   | Not Started | Low    |
| #13   | No error feedback on logout       | MEDIUM   | Not Started | Medium |
| #14   | No async listener support         | MEDIUM   | Not Started | High   |
| #15   | Email verification not triggered  | LOW      | Not Started | Low    |
| #16   | No state transition events        | MEDIUM   | Not Started | High   |
| #17   | Email normalization inconsistent  | MEDIUM   | Not Started | Low    |
| #18   | No cached owner check             | MEDIUM   | Not Started | Low    |
| #19   | No rate limit on resend           | MEDIUM   | Not Started | Medium |

---

## Next Steps

1. Review each issue with team
2. Prioritize by impact and effort
3. Create tickets for Phase 1 critical issues
4. Schedule sprint planning for Phase 2
5. Update contracts/documentation for resolved issues
