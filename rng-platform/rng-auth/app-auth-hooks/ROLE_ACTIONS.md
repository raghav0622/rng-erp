# Role-Grouped Facades (Frozen v1)

**Status**: ✅ LOCKED (FINAL)  
**Purpose**: Organize hooks by role for discoverability  
**Important**: These are organizational facades only. No authorization logic exists here.

## Critical Rule

🚨 **Role-grouped facades are pure re-exports for code organization**.

Authorization is **exclusively enforced in app-auth-service**.

UI must still handle `NotAuthorizedError` when calling service.

## Facades Available

### useAuthActions()

**For**: Unauthenticated users or general auth actions

```tsx
import { useAuthActions } from 'rng-platform/rng-auth';

const {
  useSignIn,
  useSignOut,
  useOwnerSignUp,
  useSendPasswordResetEmail,
  useConfirmPasswordReset,
  useChangePassword,
  useSendEmailVerification,
  useConfirmPassword,
} = useAuthActions();
```

**Includes**: Sign in/out, password reset, email verification  
**Authorization**: None (these are open or user-self actions)

### useOwnerActions()

**For**: Owner-role users

```tsx
import { useOwnerActions } from 'rng-platform/rng-auth';

const {
  // Session
  useAuthSession,
  useRequireAuthenticated,

  // Current user profile
  useCurrentUser,
  useUpdateOwnerProfile,
  useUpdateUserPhoto,

  // User management (invite, delete, restore, etc.)
  useInviteUser,
  useDeleteUser,
  useRestoreUser,
  useUpdateUserRole,
  useUpdateUserStatus,
  useResendInvite,
  useRevokeInvite,

  // User queries
  useListUsers,
  useSearchUsers,
  useGetUserById,
  useGetUserByEmail,
  useListUsersPaginated,

  // Bootstrap & maintenance
  useIsOwnerBootstrapped,
  useIsSignupAllowed,
  useListOrphanedUsers,
  useCleanupOrphanedLinkedUser,
} = useOwnerActions();
```

**Includes**: All user management, bootstrap checks, orphan cleanup  
**Authorization**: Enforced in app-auth-service  
**Note**: UI must still handle `NotAuthorizedError` if user role changes

### useManagerActions()

**For**: Manager-role users

```tsx
import { useManagerActions } from 'rng-platform/rng-auth';

const {
  // Session
  useAuthSession,
  useRequireAuthenticated,

  // Current user profile
  useCurrentUser,
  useUpdateUserProfile,
  useUpdateUserPhoto,

  // User queries
  useListUsers,
  useSearchUsers,
  useGetUserById,
  useGetUserByEmail,
  useListUsersPaginated,
} = useManagerActions();
```

**Includes**: View users, update own profile  
**Authorization**: Enforced in app-auth-service  
**Note**: Cannot invite, delete, or manage other users

### useEmployeeActions()

**For**: Employee-role users

```tsx
import { useEmployeeActions } from 'rng-platform/rng-auth';

const {
  // Session
  useAuthSession,
  useRequireAuthenticated,

  // Current user profile
  useCurrentUser,
  useUpdateUserProfile,
  useUpdateUserPhoto,
} = useEmployeeActions();
```

**Includes**: View own profile, update own profile  
**Authorization**: Enforced in app-auth-service

### useClientActions()

**For**: Client-role users

```tsx
import { useClientActions } from 'rng-platform/rng-auth';

const {
  // Session
  useAuthSession,
  useRequireAuthenticated,

  // Current user profile
  useCurrentUser,
} = useClientActions();
```

**Includes**: View own profile only  
**Authorization**: Enforced in app-auth-service

## How These Facades Work

Each facade is a **pure re-export** of the full hooks set, filtered by role. Example structure:

```typescript
// useOwnerActions.ts
export const useOwnerActions = () => ({
  useAuthSession, // ← Direct import, no logic
  useCurrentUser, // ← Direct import, no logic
  useInviteUser, // ← Direct import, no logic
  // ... more re-exports
});
```

**Key points**:

- No authorization logic in facades
- No filtering or wrapping of hooks
- No role checks at facade level
- Authorization happens inside each hook → service → Firebase

## When Authorization Fails

If a user's role changes or permission is revoked, the service will throw `NotAuthorizedError`:

```tsx
const inviteUser = useInviteUser();

inviteUser.mutate(userData, {
  onError: (error) => {
    if (error instanceof NotAuthorizedError) {
      // Handle role mismatch
      // Example: user was demoted from owner to manager mid-session
      redirectToRoleBasedPage();
    }
  },
});
```

**Why this can happen**:

- Multiple browser tabs (tab 1 is owner, tab 2 is notified after demotion)
- Admin action in another session (user demoted by owner)
- Session corruption or invariant violation

**What to do**:

- Catch `NotAuthorizedError` in mutation callbacks
- Redirect to appropriate role-based page
- Refresh session state via `useAuthSession()`

## Design Philosophy

### Why Facades Exist

Without facades:

```tsx
import { useCurrentUser, useListUsers, useInviteUser /* 50 more */ } from 'rng-platform/rng-auth';
// Hard to know which hooks are appropriate for your role
```

With facades:

```tsx
const { useCurrentUser, useListUsers, useInviteUser } = useOwnerActions();
// Clear intent: you're using owner capabilities
```

**Benefits**:

- Discoverability: IDE autocomplete shows role-appropriate hooks
- Documentation: Facade name makes intent clear
- No surprises: You see the full set available to your role

### Why Facades Don't Enforce Authorization

Authorization in facades would mean:

```tsx
// ❌ If we tried to enforce here:
export const useOwnerActions = () => {
  const { data: user } = useCurrentUser();
  if (user?.role !== 'owner') {
    throw new Error('Not owner');
  }
  return {
    /* ... */
  };
};
```

**Problems**:

- Duplicate authorization logic (service already checks)
- Frontend and backend checks diverge
- UI can't show "this action is available but you don't have permission" UX
- Cache invalidation becomes complex

**Better approach** (current design):

- UI calls hook freely
- Service enforces authorization
- Service throws `NotAuthorizedError`
- UI handles error and shows appropriate message

## Usage Examples

### Example 1: Owner Inviting a User

```tsx
import { useOwnerActions } from 'rng-platform/rng-auth';

export function InviteUserForm() {
  const { useInviteUser } = useOwnerActions();
  const inviteUser = useInviteUser();

  return (
    <form onSubmit={(data) => inviteUser.mutate(data)}>
      {inviteUser.error?.code === 'auth/not-authorized' && (
        <Alert>You don't have permission to invite users</Alert>
      )}
      {/* form fields */}
    </form>
  );
}
```

### Example 2: Manager Viewing Users

```tsx
import { useManagerActions } from 'rng-platform/rng-auth';

export function UsersPage() {
  const { useListUsers } = useManagerActions();
  const { data: users } = useListUsers();

  return (
    <div>
      {users.map((user) => (
        <UserRow key={user.id} user={user} readOnly={true} />
      ))}
    </div>
  );
}
```

### Example 3: Employee Updating Profile

```tsx
import { useEmployeeActions } from 'rng-platform/rng-auth';

export function ProfilePage() {
  const { useCurrentUser, useUpdateUserProfile } = useEmployeeActions();
  const { data: currentUser } = useCurrentUser();
  const updateProfile = useUpdateUserProfile();

  return (
    <form onSubmit={(data) => updateProfile.mutate(data)}>
      {/* Can only edit own profile, not others */}
    </form>
  );
}
```

## Summary

✅ **Facades are organizational only**  
✅ **Authorization lives in service layer**  
✅ **UI must handle NotAuthorizedError**  
✅ **Facades improve discoverability**  
✅ **Each role has appropriate hooks available**

**Critical**: Do not rely on facades for security. They're code organization, not authorization enforcement.
