# Security UX Constraints

**Purpose**: Document security-related UX decisions and their rationale.

## Overview

`app-auth-components` makes explicit UX choices to balance security with usability. This document explains those choices.

## 1. Password Requirements (Enforced)

### Policy

Passwords must meet:

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

### Enforcement

- **Client**: Zod schema validation (immediate feedback)
- **Server**: Firebase Auth enforces minimum length only
- **UX**: Clear error messages with requirements

### Rationale

Strong passwords prevent brute force and dictionary attacks. Requirements are standard industry practice.

### UI Pattern

```tsx
<PasswordInput
  label="Password"
  description="Minimum 8 characters with uppercase, lowercase, number, and special character"
  required
/>
```

---

## 2. Password Changes Rate Limited

### Policy

Users can change passwords **3 times per minute**.

### Enforcement

- **Client**: In-memory rate limit per service instance
- **Firebase**: Additional rate limiting (undocumented)

### Rationale

Prevents accidental or malicious password cycling. Protects against brute force if current password is known.

### UI Messaging

"Password changes are rate limited (3 per minute) to protect your account."

---

## 3. Owner Operations Rate Limited

### Policy

Owner can perform **30 privileged operations per minute** (invite, delete, role change, etc.).

### Enforcement

- **Client**: In-memory rate limit per service instance

### Rationale

Prevents accidental bulk operations. Provides safety window for mistakes.

### UI Messaging

"Rate limit exceeded. Please wait before trying again."

---

## 4. Password Reset Emails Rate Limited

### Policy

Users can request **5 password reset emails per hour**.

### Enforcement

- **Client**: Best-effort (can be bypassed)
- **Firebase**: Authoritative rate limiting

### Rationale

Prevents email spam and abuse. Firebase Auth enforces this regardless of client.

### UI Messaging

"Too many reset requests. Please wait an hour before trying again."

---

## 5. Email Verification Required (Policy)

### Policy

Email verification is **strongly encouraged** but not enforced for access.

### Enforcement

- **Client**: UI badges show verification status
- **Service**: `emailVerified` flag synced from Firebase Auth
- **No blocking**: Unverified users can still use the app

### Rationale

- **Pro-verification**: Confirms user owns email
- **Anti-blocking**: Allows immediate app usage for invited users
- **Compromise**: Show verification status, prompt to verify, but don't block

### UI Pattern

```tsx
{
  !user.emailVerified && (
    <Alert color="yellow">
      <Text>Please verify your email for full access.</Text>
      <Button onClick={sendVerificationEmail}>Send Verification</Button>
    </Alert>
  );
}
```

---

## 6. Owner Account Cannot Be Deleted

### Policy

The owner account is **permanent** and cannot be deleted.

### Enforcement

- **Service**: `assertOwnerNotDeleted` invariant
- **UI**: Delete button disabled for owner

### Rationale

Owner is the root account. Deleting it would orphan the organization. Transfer ownership first (future feature).

### UI Messaging

"Owner account cannot be deleted. Transfer ownership to another user first."

---

## 7. Owner Account Cannot Be Disabled

### Policy

The owner account cannot be disabled.

### Enforcement

- **Service**: `assertOwnerNotDisabled` invariant
- **UI**: Disable button hidden for owner

### Rationale

Same as deletion. Owner must always have access to manage the organization.

### UI Messaging

"Owner account cannot be disabled."

---

## 8. Destructive Actions Require Password Confirmation

### Policy

The following actions require password confirmation:

- Change user role
- Delete user
- Disable/enable user

### Enforcement

- **UI**: `ConfirmPasswordModal` (future)
- **Service**: `useConfirmPassword` hook

### Rationale

Prevents accidental or malicious actions by compromised sessions. Requires explicit user intent.

### UI Pattern

```tsx
<Button onClick={() => setShowConfirmPassword(true)}>
  Delete User
</Button>

<ConfirmPasswordModal
  opened={showConfirmPassword}
  onClose={() => setShowConfirmPassword(false)}
  onConfirm={async (password) => {
    await confirmPassword(password);
    await deleteUser(userId);
  }}
/>
```

---

## 9. Sign-Out Is Immediate (No Confirmation)

### Policy

Sign-out does **not** require confirmation.

### Rationale

- **Safety**: Sign-out is non-destructive (can sign back in)
- **UX**: Friction-free exit improves user experience
- **Standard**: Industry norm (no confirmation)

### UI Pattern

```tsx
<Button onClick={signOut}>Sign Out</Button>
```

---

## 10. Session Timeout (24 Hours)

### Policy

Sessions expire after **24 hours of inactivity** (UX timeout, not auth revocation).

### Enforcement

- **Client**: Service tracks last auth timestamp
- **UX**: Prompt to reauthenticate after timeout

### Rationale

Balances security (stale sessions) with usability (no frequent logins). 24 hours is industry standard for low-risk apps.

### UI Messaging

"Your session has expired for security. Please sign in again."

---

## 11. Disabled Users See Immediate Error

### Policy

Disabled users see an error on next auth resolution (navigation/refresh).

### Enforcement

- **Service**: `assertDisabledUserCannotAcceptInvite` invariant
- **Auth Resolution**: Checks `isDisabled` flag

### Rationale

Provides clear feedback. User understands why access is blocked.

### UI Messaging

"Your account has been disabled. Contact your administrator for assistance."

---

## 12. Owner Bootstrap Is One-Time Only

### Policy

Owner account can only be created once. Subsequent attempts fail.

### Enforcement

- **Service**: `assertNoExistingOwner` invariant
- **UI**: Bootstrap screen checks `isOwnerBootstrapped()`

### Rationale

Prevents accidental or malicious owner account duplication.

### UI Messaging

"Organization already set up. Sign in with the existing owner account."

---

## 13. Race Condition Detection (Owner Bootstrap)

### Policy

If two users simultaneously create owner accounts, the second attempt:

1. Detects the race
2. Cleans up the orphaned Firebase Auth user
3. Shows clear error message

### Enforcement

- **Service**: `assertAuthUidNotLinked` invariant
- **Cleanup**: Automatic orphaned user deletion

### Rationale

Prevents data corruption from race conditions. Provides clear recovery path.

### UI Messaging

"Owner bootstrap race detected: another setup completed first. The orphaned account has been cleaned up. Please sign in with the existing owner account."

---

## 14. Invite Lifecycle Is Irreversible

### Policy

Once an invite is accepted (`activated`), it cannot be reverted to `invited` status.

### Enforcement

- **Service**: `assertActivatedIsIrreversible` invariant

### Rationale

Prevents state confusion. Accepted invites represent real user identity.

### UI Behavior

- Accepted invites show as "Active" (no "Resend" button)
- Revoked invites cannot be reactivated (must create new invite)

---

## Summary Table

| Constraint                    | Type                | Enforcement        | User Impact              |
| ----------------------------- | ------------------- | ------------------ | ------------------------ |
| Password requirements         | Security            | Client + Firebase  | Must use strong password |
| Password change rate limit    | Abuse prevention    | Client             | 3 per minute max         |
| Owner operation rate limit    | Accident prevention | Client             | 30 per minute max        |
| Reset email rate limit        | Spam prevention     | Firebase           | 5 per hour max           |
| Email verification            | Best practice       | Soft (no blocking) | Encouraged but optional  |
| Owner cannot delete           | Data integrity      | Service invariant  | Transfer first           |
| Owner cannot disable          | Access guarantee    | Service invariant  | Always accessible        |
| Destructive confirmation      | Accident prevention | UI + Service       | Password required        |
| Sign-out immediate            | UX                  | None               | No confirmation          |
| Session timeout               | Stale session       | Client             | 24h reauthentication     |
| Disabled user immediate error | Clear feedback      | Auth resolution    | Next navigation          |
| Owner bootstrap one-time      | Data integrity      | Service invariant  | No duplicates            |
| Race detection                | Data consistency    | Service + cleanup  | Orphans cleaned up       |
| Invite irreversible           | State clarity       | Service invariant  | Cannot revert            |

---

**Status**: Policy document (frozen v1)  
**Last Updated**: January 30, 2026  
**Audience**: Developers implementing auth UX
